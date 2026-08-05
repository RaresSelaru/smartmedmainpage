-- Correct the administrator scheduling path so status-only updates never read
-- an unassigned record, and let an appointment owner explicitly retry their
-- own transactional email without exposing the private outbox.

create or replace function public.retry_smartmed_evaluation_notification(
  p_public_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := (select auth.uid());
  updated_count integer;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  update private.appointment_notification_outbox as outbox
  set
    status = 'pending',
    next_attempt_at = statement_timestamp(),
    claimed_by = null,
    claim_token = null,
    claimed_at = null,
    last_error_code = null
  from public.appointments as appointment
  where appointment.id = outbox.appointment_id
    and appointment.public_id = p_public_id
    and (
      appointment.user_id = current_user_id
      or private.is_admin()
    )
    and outbox.status <> 'sent'
    and outbox.attempt_count < 6
    and outbox.id = (
      select latest.id
      from private.appointment_notification_outbox as latest
      where latest.appointment_id = appointment.id
      order by latest.created_at desc, latest.id
      limit 1
    );

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end
$function$;

create or replace function public.admin_update_smartmed_evaluation(
  p_public_id uuid,
  p_status text default null,
  p_slot_id bigint default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := (select auth.uid());
  appointment_row public.appointments%rowtype;
  updated_row public.appointments%rowtype;
  target_appointment_type_id bigint;
  target_staff_member_id bigint;
  target_location_id bigint;
  target_starts_at timestamptz;
  target_ends_at timestamptz;
  target_location_kind text;
  normalized_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  notification_type text;
  schedule_changed boolean := false;
  status_changed boolean := false;
begin
  if not private.is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if p_status is not null and p_status not in (
    'requested',
    'pending',
    'confirmed',
    'completed',
    'cancelled',
    'declined',
    'no_show'
  ) then
    raise exception 'INVALID_APPOINTMENT_STATUS' using errcode = '22023';
  end if;

  if normalized_reason is not null and char_length(normalized_reason) > 500 then
    raise exception 'REASON_TOO_LONG' using errcode = '22023';
  end if;

  select appointment.*
  into appointment_row
  from public.appointments as appointment
  where appointment.public_id = p_public_id
    and private.is_evaluation_appointment(appointment.appointment_type_id)
  for update;

  if not found then
    raise exception 'EVALUATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  target_appointment_type_id := appointment_row.appointment_type_id;
  target_staff_member_id := appointment_row.staff_member_id;
  target_location_id := appointment_row.location_id;
  target_starts_at := appointment_row.starts_at;
  target_ends_at := appointment_row.ends_at;

  if p_slot_id is not null then
    select
      slot.appointment_type_id,
      slot.staff_member_id,
      slot.location_id,
      slot.starts_at,
      slot.ends_at,
      location.kind
    into
      target_appointment_type_id,
      target_staff_member_id,
      target_location_id,
      target_starts_at,
      target_ends_at,
      target_location_kind
    from public.availability_exceptions as slot
    join public.appointment_types as appointment_type
      on appointment_type.id = slot.appointment_type_id
    join public.staff_members as staff
      on staff.id = slot.staff_member_id
    join public.locations as location
      on location.id = slot.location_id
    where slot.id = p_slot_id
      and slot.kind = 'available'
      and slot.starts_at > statement_timestamp()
      and appointment_type.slug = 'evaluare-initiala-smartmed'
      and staff.is_active
      and staff.is_bookable
      and location.is_active
    for update of slot;

    if not found then
      raise exception 'SLOT_NOT_FOUND' using errcode = 'P0002';
    end if;

    schedule_changed := target_starts_at is distinct from appointment_row.starts_at
      or target_location_id is distinct from appointment_row.location_id
      or target_staff_member_id is distinct from appointment_row.staff_member_id;
  end if;

  status_changed := p_status is not null
    and p_status is distinct from appointment_row.status;

  begin
    update public.appointments
    set
      appointment_type_id = target_appointment_type_id,
      staff_member_id = target_staff_member_id,
      location_id = target_location_id,
      starts_at = target_starts_at,
      ends_at = target_ends_at,
      status = coalesce(p_status, appointment_row.status),
      confirmed_at = case
        when coalesce(p_status, appointment_row.status) = 'confirmed'
          then coalesce(appointment_row.confirmed_at, statement_timestamp())
        else appointment_row.confirmed_at
      end,
      cancelled_at = case
        when coalesce(p_status, appointment_row.status) = 'cancelled'
          then coalesce(appointment_row.cancelled_at, statement_timestamp())
        else null
      end,
      booking_version = appointment_row.booking_version
        + case when schedule_changed or status_changed then 1 else 0 end,
      reschedule_count = appointment_row.reschedule_count
        + case when schedule_changed then 1 else 0 end,
      last_rescheduled_at = case
        when schedule_changed then statement_timestamp()
        else appointment_row.last_rescheduled_at
      end,
      metadata = case
        when schedule_changed then appointment_row.metadata || jsonb_build_object(
          'deliveryMode', private.evaluation_delivery_mode(target_location_kind),
          'previousStartsAt', appointment_row.starts_at,
          'adminReason', normalized_reason
        )
        else appointment_row.metadata
      end
    where id = appointment_row.id
    returning * into updated_row;
  exception
    when exclusion_violation or unique_violation then
      raise exception 'SLOT_TAKEN' using errcode = '23P01';
  end;

  if status_changed then
    update public.appointment_status_history
    set reason = coalesce(
      normalized_reason,
      case
        when schedule_changed then 'Reprogramare realizată de administrator'
        else reason
      end
    )
    where id = (
      select history.id
      from public.appointment_status_history as history
      where history.appointment_id = updated_row.id
        and history.from_status = appointment_row.status
        and history.to_status = updated_row.status
      order by history.created_at desc, history.id desc
      limit 1
    );
  elsif schedule_changed or normalized_reason is not null then
    insert into public.appointment_status_history (
      appointment_id,
      from_status,
      to_status,
      changed_by,
      reason
    )
    values (
      updated_row.id,
      appointment_row.status,
      updated_row.status,
      current_user_id,
      coalesce(normalized_reason, 'Reprogramare realizată de administrator')
    );
  end if;

  if schedule_changed then
    notification_type := 'evaluation_rescheduled';
  elsif updated_row.status = 'cancelled' and status_changed then
    notification_type := 'evaluation_cancelled';
  elsif updated_row.status = 'confirmed' and status_changed then
    notification_type := 'evaluation_confirmed';
  end if;

  if notification_type is not null then
    perform private.enqueue_evaluation_notification(
      updated_row.id,
      notification_type
    );
  end if;

  return jsonb_build_object(
    'publicId', updated_row.public_id,
    'status', updated_row.status,
    'startsAt', updated_row.starts_at,
    'endsAt', updated_row.ends_at,
    'bookingVersion', updated_row.booking_version,
    'notificationQueued', notification_type is not null
  );
end
$function$;

revoke all on function public.retry_smartmed_evaluation_notification(uuid)
  from public, anon, authenticated;
revoke all on function public.admin_update_smartmed_evaluation(uuid, text, bigint, text)
  from public, anon, authenticated;

grant execute on function public.retry_smartmed_evaluation_notification(uuid)
  to authenticated;
grant execute on function public.admin_update_smartmed_evaluation(uuid, text, bigint, text)
  to authenticated;
