-- Follow-up hardening for environments that applied the capacity migration
-- before the final concurrency and direct-DML audit completed. The preceding
-- migration also contains these invariants so a fresh install is coherent.

create or replace function private.enforce_availability_slot_booking_invariants()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  active_booking_count integer;
begin
  active_booking_count := private.evaluation_slot_active_booking_count(
    case when tg_op = 'DELETE' then old.id else new.id end
  );

  if tg_op = 'DELETE' and active_booking_count > 0 then
    raise exception 'SLOT_HAS_ACTIVE_BOOKINGS' using errcode = '23503';
  end if;

  if tg_op = 'UPDATE' and new.capacity < active_booking_count then
    raise exception 'CAPACITY_BELOW_BOOKED_COUNT' using errcode = '23514';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end
$function$;

revoke all on function private.enforce_availability_slot_booking_invariants()
  from public, anon, authenticated;

drop trigger if exists enforce_availability_slot_capacity
  on public.availability_exceptions;
create trigger enforce_availability_slot_capacity
before update of capacity on public.availability_exceptions
for each row execute function private.enforce_availability_slot_booking_invariants();

drop trigger if exists protect_booked_availability_slot_deletion
  on public.availability_exceptions;
create trigger protect_booked_availability_slot_deletion
before delete on public.availability_exceptions
for each row execute function private.enforce_availability_slot_booking_invariants();

-- Patch only deployments that still have the pre-audit function bodies. Exact
-- anchors and explicit failures keep this follow-up deterministic: an unknown
-- function body stops the migration rather than silently missing hardening.
do $migration$
declare
  function_ddl text;
  old_fragment text;
  new_fragment text;
begin
  select pg_catalog.pg_get_functiondef(
    'public.reschedule_own_smartmed_evaluation(uuid,bigint)'::regprocedure
  ) into function_ddl;

  if position('EVALUATION_SLOT_UNCHANGED' in function_ddl) = 0 then
    old_fragment := $old$
  if appointment_row.status not in ('requested', 'pending', 'confirmed')
    or appointment_row.starts_at <= statement_timestamp()
  then
    raise exception 'EVALUATION_CANNOT_BE_RESCHEDULED' using errcode = '22023';
  end if;

  select
$old$;
    new_fragment := $new$
  if appointment_row.status not in ('requested', 'pending', 'confirmed')
    or appointment_row.starts_at <= statement_timestamp()
  then
    raise exception 'EVALUATION_CANNOT_BE_RESCHEDULED' using errcode = '22023';
  end if;

  if appointment_row.availability_slot_id = p_slot_id then
    raise exception 'EVALUATION_SLOT_UNCHANGED' using errcode = '22023';
  end if;

  select
$new$;

    if position(old_fragment in function_ddl) = 0 then
      raise exception 'RESCHEDULE_HARDENING_ANCHOR_NOT_FOUND';
    end if;
    execute replace(function_ddl, old_fragment, new_fragment);
  end if;

  select pg_catalog.pg_get_functiondef(
    'public.admin_create_smartmed_evaluation_slot(timestamptz,bigint,bigint,integer,text)'::regprocedure
  ) into function_ddl;

  if position('smartmed:evaluation-slot:staff:' in function_ddl) = 0 then
    old_fragment := $old$
  if not exists (
    select 1 from public.staff_members as staff
    where staff.id = p_staff_member_id
      and staff.is_active and staff.is_bookable
  ) then
    raise exception 'STAFF_NOT_AVAILABLE' using errcode = 'P0002';
  end if;

  select location.* into location_row
$old$;
    new_fragment := $new$
  if not exists (
    select 1 from public.staff_members as staff
    where staff.id = p_staff_member_id
      and staff.is_active and staff.is_bookable
  ) then
    raise exception 'STAFF_NOT_AVAILABLE' using errcode = 'P0002';
  end if;

  -- Serialize overlap checks for one evaluator across concurrent admin calls.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'smartmed:evaluation-slot:staff:' || p_staff_member_id::text,
      0
    )
  );

  select location.* into location_row
$new$;

    if position(old_fragment in function_ddl) = 0 then
      raise exception 'ADMIN_SLOT_LOCK_HARDENING_ANCHOR_NOT_FOUND';
    end if;
    execute replace(function_ddl, old_fragment, new_fragment);
  end if;

  select pg_catalog.pg_get_functiondef(
    'public.book_smartmed_evaluation(bigint,uuid,text,text,text,boolean,text)'::regprocedure
  ) into function_ddl;

  if position('false capacity/active-evaluation error' in function_ddl) = 0 then
    old_fragment := $old$
  if not found then
    raise exception 'SLOT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if slot_row.starts_at < statement_timestamp() + slot_row.booking_notice_minutes * interval '1 minute'
$old$;
    new_fragment := $new$
  if not found then
    raise exception 'SLOT_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Re-read after acquiring the slot lock for concurrent request idempotency.
  select appointment.*
  into existing_row
  from public.appointments as appointment
  where appointment.user_id = current_user_id
    and appointment.booking_request_id = p_booking_request_id
    and private.is_evaluation_appointment(appointment.appointment_type_id)
  limit 1;

  if found then
    return jsonb_build_object(
      'publicId', existing_row.public_id,
      'startsAt', existing_row.starts_at,
      'endsAt', existing_row.ends_at,
      'status', existing_row.status,
      'bookingVersion', existing_row.booking_version,
      'reused', true
    );
  end if;

  if slot_row.starts_at < statement_timestamp() + slot_row.booking_notice_minutes * interval '1 minute'
$new$;

    if position(old_fragment in function_ddl) = 0 then
      raise exception 'BOOKING_IDEMPOTENCY_HARDENING_ANCHOR_NOT_FOUND';
    end if;
    execute replace(function_ddl, old_fragment, new_fragment);
  end if;

  select pg_catalog.pg_get_functiondef(
    'public.admin_update_smartmed_evaluation(uuid,text,bigint,text)'::regprocedure
  ) into function_ddl;

  if position('INVALID_APPOINTMENT_STATUS_COMBINATION' in function_ddl) = 0
    or position('SLOT_REQUIRED_FOR_REACTIVATION' in function_ddl) = 0
  then
    old_fragment := $old$
  target_status := coalesce(p_status, appointment_row.status);

  if p_slot_id is not null then
$old$;
    new_fragment := $new$
  target_status := coalesce(p_status, appointment_row.status);

  if appointment_row.status not in ('requested', 'pending', 'confirmed')
    and target_status in ('requested', 'pending', 'confirmed')
    and p_slot_id is null
  then
    raise exception 'SLOT_REQUIRED_FOR_REACTIVATION' using errcode = '22023';
  end if;

  if p_slot_id is not null
    and target_status not in ('requested', 'pending', 'confirmed')
  then
    raise exception 'INVALID_APPOINTMENT_STATUS_COMBINATION'
      using errcode = '22023';
  end if;

  if p_slot_id is not null then
$new$;

    if position(old_fragment in function_ddl) = 0 then
      raise exception 'ADMIN_STATUS_SLOT_HARDENING_ANCHOR_NOT_FOUND';
    end if;
    execute replace(function_ddl, old_fragment, new_fragment);
  end if;
end
$migration$;

-- Slot writes are RPC-only. This is stronger than relying on admin RLS for
-- direct writes and prevents bypassing overlap and capacity serialization.
revoke insert, update, delete on table public.availability_exceptions
  from authenticated;

create or replace function public.admin_delete_all_smartmed_evaluation_slots()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  slot_row record;
  active_booking_count integer;
  deleted_count integer := 0;
  protected_count integer := 0;
begin
  if not private.is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  for slot_row in
    select slot.id
    from public.availability_exceptions as slot
    join public.appointment_types as appointment_type
      on appointment_type.id = slot.appointment_type_id
    where appointment_type.slug = 'evaluare-initiala-smartmed'
      and slot.kind = 'available'
      and slot.starts_at > statement_timestamp()
    order by slot.id
    for update of slot
  loop
    active_booking_count :=
      private.evaluation_slot_active_booking_count(slot_row.id);

    if active_booking_count > 0 then
      protected_count := protected_count + 1;
    else
      delete from public.availability_exceptions
      where id = slot_row.id;
      deleted_count := deleted_count + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'deletedCount', deleted_count,
    'protectedCount', protected_count
  );
end
$function$;

revoke all on function public.admin_delete_all_smartmed_evaluation_slots()
  from public, anon, authenticated;
grant execute on function public.admin_delete_all_smartmed_evaluation_slots()
  to authenticated;

comment on function public.admin_delete_all_smartmed_evaluation_slots() is
  'Deletes every empty future SmartMed evaluation slot under row locks and reports occupied sessions preserved.';
