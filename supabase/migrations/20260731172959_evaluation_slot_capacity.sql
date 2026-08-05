-- SmartMed evaluations are small-group sessions. Availability rows own the
-- capacity and every booking points back to the concrete row that supplied
-- its seat. Capacity decisions are serialized by locking that row.

alter table public.availability_exceptions
  add column if not exists capacity integer not null default 1;

alter table public.availability_exceptions
  drop constraint if exists availability_exceptions_capacity_check;

alter table public.availability_exceptions
  add constraint availability_exceptions_capacity_check
  check (capacity between 1 and 250);

alter table public.appointments
  add column if not exists availability_slot_id bigint
    references public.availability_exceptions(id) on delete set null;

create index if not exists appointments_availability_slot_active_idx
  on public.appointments (availability_slot_id, id)
  where availability_slot_id is not null
    and status in ('requested', 'pending', 'confirmed');

-- Backfill only when all schedule dimensions identify exactly one slot. An
-- ambiguous historical appointment remains unlinked instead of being guessed.
with safe_matches as (
  select
    appointment.id as appointment_id,
    min(slot.id) as slot_id
  from public.appointments as appointment
  join public.appointment_types as appointment_type
    on appointment_type.id = appointment.appointment_type_id
  join public.availability_exceptions as slot
    on slot.appointment_type_id = appointment.appointment_type_id
    and slot.staff_member_id = appointment.staff_member_id
    and slot.location_id is not distinct from appointment.location_id
    and slot.starts_at = appointment.starts_at
    and slot.ends_at = appointment.ends_at
    and slot.kind = 'available'
  where appointment_type.slug = 'evaluare-initiala-smartmed'
    and appointment.availability_slot_id is null
  group by appointment.id
  having count(*) = 1
)
update public.appointments as appointment
set availability_slot_id = safe_matches.slot_id
from safe_matches
where appointment.id = safe_matches.appointment_id;

update public.availability_exceptions as slot
set capacity = 8
from public.appointment_types as appointment_type
where appointment_type.id = slot.appointment_type_id
  and appointment_type.slug = 'evaluare-initiala-smartmed'
  and slot.kind = 'available';

update public.appointment_types
set description = 'O evaluare clară, prietenoasă, într-un grup restrâns, pentru a stabili nivelul actual și următorii pași potriviți.'
where slug = 'evaluare-initiala-smartmed';

-- Capacity-backed appointments may share an evaluator and interval. Ordinary
-- appointments keep the original staff overlap guarantee, while the existing
-- user exclusion constraint continues to prevent a person double-booking.
alter table public.appointments
  drop constraint if exists appointments_staff_no_overlap;

alter table public.appointments
  add constraint appointments_staff_no_overlap
  exclude using gist (
    staff_member_id with =,
    tstzrange(blocked_starts_at, blocked_ends_at, '[)') with &&
  )
  where (
    staff_member_id is not null
    and availability_slot_id is null
    and status in ('requested', 'pending', 'confirmed')
  );

create or replace function private.evaluation_slot_active_booking_count(
  p_slot_id bigint,
  p_exclude_appointment_id bigint default null
)
returns integer
language sql
stable
security invoker
set search_path = ''
as $function$
  select count(*)::integer
  from public.appointments as appointment
  where appointment.availability_slot_id = p_slot_id
    and appointment.status in ('requested', 'pending', 'confirmed')
    and (
      p_exclude_appointment_id is null
      or appointment.id <> p_exclude_appointment_id
    )
$function$;

revoke all on function private.evaluation_slot_active_booking_count(bigint, bigint)
  from public, anon, authenticated;

-- Defense in depth for table-editor/direct-DML administration. RPC validation
-- remains useful for friendly errors, but the invariant cannot be bypassed by
-- an administrator updating the exposed table directly.
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

drop function if exists public.get_smartmed_evaluation_slots(timestamptz, timestamptz);

create function public.get_smartmed_evaluation_slots(
  p_from timestamptz default statement_timestamp(),
  p_until timestamptz default statement_timestamp() + interval '60 days'
)
returns table (
  slot_id bigint,
  starts_at timestamptz,
  ends_at timestamptz,
  delivery_mode text,
  location_name text,
  location_city text,
  staff_name text,
  staff_title text,
  public_label text,
  capacity integer,
  booked_count integer,
  remaining_places integer
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if p_until <= p_from or p_until > statement_timestamp() + interval '90 days' then
    raise exception 'INVALID_SLOT_WINDOW' using errcode = '22023';
  end if;

  return query
  select
    slot.id,
    slot.starts_at,
    slot.ends_at,
    private.evaluation_delivery_mode(location.kind),
    location.name,
    location.city,
    staff.display_name,
    staff.title,
    slot.public_label,
    slot.capacity,
    occupancy.booked_count,
    slot.capacity - occupancy.booked_count
  from public.availability_exceptions as slot
  join public.appointment_types as appointment_type
    on appointment_type.id = slot.appointment_type_id
  join public.staff_members as staff
    on staff.id = slot.staff_member_id
  join public.locations as location
    on location.id = slot.location_id
  cross join lateral (
    select private.evaluation_slot_active_booking_count(slot.id) as booked_count
  ) as occupancy
  where appointment_type.slug = 'evaluare-initiala-smartmed'
    and appointment_type.is_active
    and staff.is_active
    and staff.is_bookable
    and location.is_active
    and location.kind in ('online', 'center')
    and slot.kind = 'available'
    and slot.is_public
    and occupancy.booked_count < slot.capacity
    and slot.starts_at >= greatest(
      p_from,
      statement_timestamp()
        + appointment_type.booking_notice_minutes * interval '1 minute'
    )
    and slot.ends_at <= least(
      p_until,
      statement_timestamp()
        + appointment_type.booking_horizon_days * interval '1 day'
    )
    and slot.ends_at - slot.starts_at
      = appointment_type.duration_minutes * interval '1 minute'
    and not exists (
      select 1
      from public.availability_exceptions as blocked
      where blocked.staff_member_id = slot.staff_member_id
        and blocked.kind = 'unavailable'
        and (
          blocked.appointment_type_id is null
          or blocked.appointment_type_id = slot.appointment_type_id
        )
        and (
          blocked.location_id is null
          or blocked.location_id = slot.location_id
        )
        and tstzrange(blocked.starts_at, blocked.ends_at, '[)')
          && tstzrange(slot.starts_at, slot.ends_at, '[)')
    )
    and not exists (
      select 1
      from public.appointments as existing
      where existing.staff_member_id = slot.staff_member_id
        and existing.availability_slot_id is null
        and existing.status in ('requested', 'pending', 'confirmed')
        and tstzrange(
          existing.blocked_starts_at,
          existing.blocked_ends_at,
          '[)'
        ) && tstzrange(
          slot.starts_at
            - appointment_type.buffer_before_minutes * interval '1 minute',
          slot.ends_at
            + appointment_type.buffer_after_minutes * interval '1 minute',
          '[)'
        )
    )
  order by slot.starts_at, delivery_mode, slot.id;
end
$function$;

-- Replace the single-seat administrator creator with an explicit capacity
-- argument. Keeping one signature avoids ambiguous PostgREST overloads.
revoke all on function public.admin_create_smartmed_evaluation_slot(
  timestamptz, bigint, bigint, text
) from public, anon, authenticated;

drop function public.admin_create_smartmed_evaluation_slot(
  timestamptz, bigint, bigint, text
);

create function public.admin_create_smartmed_evaluation_slot(
  p_starts_at timestamptz,
  p_staff_member_id bigint,
  p_location_id bigint,
  p_capacity integer,
  p_public_label text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  appointment_type_row public.appointment_types%rowtype;
  location_row public.locations%rowtype;
  inserted_row public.availability_exceptions%rowtype;
  computed_ends_at timestamptz;
  normalized_label text := nullif(btrim(coalesce(p_public_label, '')), '');
begin
  if not private.is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if p_starts_at < statement_timestamp() + interval '5 minutes'
    or p_starts_at > statement_timestamp() + interval '90 days'
  then
    raise exception 'SLOT_OUTSIDE_ADMIN_HORIZON' using errcode = '22023';
  end if;

  if p_capacity not between 1 and 250 then
    raise exception 'INVALID_SLOT_CAPACITY' using errcode = '22023';
  end if;

  if normalized_label is not null and char_length(normalized_label) > 120 then
    raise exception 'SLOT_LABEL_TOO_LONG' using errcode = '22023';
  end if;

  select appointment_type.* into appointment_type_row
  from public.appointment_types as appointment_type
  where appointment_type.slug = 'evaluare-initiala-smartmed'
    and appointment_type.is_active
  for share;

  if not found then
    raise exception 'EVALUATION_TYPE_NOT_FOUND' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.staff_members as staff
    where staff.id = p_staff_member_id
      and staff.is_active and staff.is_bookable
  ) then
    raise exception 'STAFF_NOT_AVAILABLE' using errcode = 'P0002';
  end if;

  -- Serialize all slot creation decisions for one staff member. Exact-slot
  -- uniqueness alone cannot protect partially overlapping intervals created
  -- by concurrent administrator requests.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'smartmed:evaluation-slot:staff:' || p_staff_member_id::text,
      0
    )
  );

  select location.* into location_row
  from public.locations as location
  where location.id = p_location_id
    and location.is_active
    and location.kind in ('online', 'center');

  if not found then
    raise exception 'LOCATION_NOT_AVAILABLE' using errcode = 'P0002';
  end if;

  computed_ends_at := p_starts_at
    + appointment_type_row.duration_minutes * interval '1 minute';

  if exists (
    select 1 from public.availability_exceptions as existing
    where existing.staff_member_id = p_staff_member_id
      and tstzrange(existing.starts_at, existing.ends_at, '[)')
        && tstzrange(p_starts_at, computed_ends_at, '[)')
  ) then
    raise exception 'SLOT_TAKEN' using errcode = '23P01';
  end if;

  if exists (
    select 1 from public.appointments as appointment
    where appointment.staff_member_id = p_staff_member_id
      and appointment.availability_slot_id is null
      and appointment.status in ('requested', 'pending', 'confirmed')
      and tstzrange(appointment.blocked_starts_at, appointment.blocked_ends_at, '[)')
        && tstzrange(
          p_starts_at - appointment_type_row.buffer_before_minutes * interval '1 minute',
          computed_ends_at + appointment_type_row.buffer_after_minutes * interval '1 minute',
          '[)'
        )
  ) then
    raise exception 'SLOT_TAKEN' using errcode = '23P01';
  end if;

  insert into public.availability_exceptions (
    staff_member_id, appointment_type_id, location_id, kind,
    starts_at, ends_at, capacity, is_public, public_label
  ) values (
    p_staff_member_id, appointment_type_row.id, location_row.id, 'available',
    p_starts_at, computed_ends_at, p_capacity, true, normalized_label
  ) returning * into inserted_row;

  return jsonb_build_object(
    'slotId', inserted_row.id,
    'startsAt', inserted_row.starts_at,
    'endsAt', inserted_row.ends_at,
    'locationId', inserted_row.location_id,
    'staffMemberId', inserted_row.staff_member_id,
    'capacity', inserted_row.capacity,
    'bookedCount', 0,
    'remainingPlaces', inserted_row.capacity
  );
end
$function$;

create or replace function public.admin_update_smartmed_evaluation_slot_capacity(
  p_slot_id bigint,
  p_capacity integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  slot_row public.availability_exceptions%rowtype;
  booked_count integer;
begin
  if not private.is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if p_capacity not between 1 and 250 then
    raise exception 'INVALID_SLOT_CAPACITY' using errcode = '22023';
  end if;

  select slot.* into slot_row
  from public.availability_exceptions as slot
  join public.appointment_types as appointment_type
    on appointment_type.id = slot.appointment_type_id
  where slot.id = p_slot_id
    and slot.kind = 'available'
    and appointment_type.slug = 'evaluare-initiala-smartmed'
  for update of slot;

  if not found then
    raise exception 'SLOT_NOT_FOUND' using errcode = 'P0002';
  end if;

  booked_count := private.evaluation_slot_active_booking_count(slot_row.id);

  if p_capacity < booked_count then
    raise exception 'CAPACITY_BELOW_BOOKED_COUNT' using errcode = '23514';
  end if;

  update public.availability_exceptions
  set capacity = p_capacity
  where id = slot_row.id;

  return true;
end
$function$;

create or replace function public.get_admin_smartmed_evaluation_slots(
  p_from timestamptz default statement_timestamp() - interval '1 day',
  p_until timestamptz default statement_timestamp() + interval '90 days'
)
returns table (
  slot_id bigint,
  starts_at timestamptz,
  ends_at timestamptz,
  staff_member_id bigint,
  staff_name text,
  location_id bigint,
  location_name text,
  location_kind text,
  public_label text,
  is_public boolean,
  capacity integer,
  booked_count integer,
  remaining_places integer
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if not private.is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if p_until <= p_from or p_until > statement_timestamp() + interval '365 days' then
    raise exception 'INVALID_SLOT_WINDOW' using errcode = '22023';
  end if;

  return query
  select
    slot.id, slot.starts_at, slot.ends_at,
    staff.id, staff.display_name,
    location.id, location.name, location.kind,
    slot.public_label, slot.is_public, slot.capacity,
    private.evaluation_slot_active_booking_count(slot.id),
    slot.capacity - private.evaluation_slot_active_booking_count(slot.id)
  from public.availability_exceptions as slot
  join public.appointment_types as appointment_type
    on appointment_type.id = slot.appointment_type_id
  join public.staff_members as staff on staff.id = slot.staff_member_id
  join public.locations as location on location.id = slot.location_id
  where appointment_type.slug = 'evaluare-initiala-smartmed'
    and slot.kind = 'available'
    and slot.starts_at >= p_from
    and slot.ends_at <= p_until
  order by slot.starts_at, location.kind, slot.id;
end
$function$;

create or replace function public.admin_delete_smartmed_evaluation_slot(
  p_slot_id bigint
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  slot_row public.availability_exceptions%rowtype;
begin
  if not private.is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  select slot.* into slot_row
  from public.availability_exceptions as slot
  join public.appointment_types as appointment_type
    on appointment_type.id = slot.appointment_type_id
  where slot.id = p_slot_id
    and appointment_type.slug = 'evaluare-initiala-smartmed'
    and slot.kind = 'available'
    and slot.starts_at > statement_timestamp()
  for update of slot;

  if not found then
    return false;
  end if;

  if private.evaluation_slot_active_booking_count(slot_row.id) > 0 then
    raise exception 'SLOT_HAS_ACTIVE_BOOKINGS' using errcode = '23503';
  end if;

  delete from public.availability_exceptions where id = slot_row.id;
  return true;
end
$function$;

revoke all on function public.get_smartmed_evaluation_slots(timestamptz, timestamptz)
  from public, anon, authenticated;
revoke all on function public.book_smartmed_evaluation(bigint, uuid, text, text, text, boolean, text)
  from public, anon, authenticated;
revoke all on function public.reschedule_own_smartmed_evaluation(uuid, bigint)
  from public, anon, authenticated;
revoke all on function public.admin_update_smartmed_evaluation(uuid, text, bigint, text)
  from public, anon, authenticated;
revoke all on function public.admin_create_smartmed_evaluation_slot(
  timestamptz, bigint, bigint, integer, text
) from public, anon, authenticated;
revoke all on function public.admin_update_smartmed_evaluation_slot_capacity(bigint, integer)
  from public, anon, authenticated;
revoke all on function public.get_admin_smartmed_evaluation_slots(timestamptz, timestamptz)
  from public, anon, authenticated;
revoke all on function public.admin_delete_smartmed_evaluation_slot(bigint)
  from public, anon, authenticated;

grant execute on function public.get_smartmed_evaluation_slots(timestamptz, timestamptz)
  to authenticated;
grant execute on function public.book_smartmed_evaluation(bigint, uuid, text, text, text, boolean, text)
  to authenticated;
grant execute on function public.reschedule_own_smartmed_evaluation(uuid, bigint)
  to authenticated;
grant execute on function public.admin_update_smartmed_evaluation(uuid, text, bigint, text)
  to authenticated;
grant execute on function public.admin_create_smartmed_evaluation_slot(
  timestamptz, bigint, bigint, integer, text
) to authenticated;
grant execute on function public.admin_update_smartmed_evaluation_slot_capacity(bigint, integer)
  to authenticated;
grant execute on function public.get_admin_smartmed_evaluation_slots(timestamptz, timestamptz)
  to authenticated;
grant execute on function public.admin_delete_smartmed_evaluation_slot(bigint)
  to authenticated;

comment on column public.availability_exceptions.capacity is
  'Maximum active reservations admitted for this concrete availability slot.';
comment on column public.appointments.availability_slot_id is
  'Concrete capacity-owning availability slot used for this appointment.';
comment on function public.admin_update_smartmed_evaluation_slot_capacity(bigint, integer) is
  'Updates group capacity under a row lock and rejects values below current active occupancy.';

-- Application writes use the narrow, database-authorized RPCs. Removing
-- direct authenticated DML also closes concurrent overlap bypasses.
revoke insert, update, delete on table public.availability_exceptions
  from authenticated;

create or replace function public.reschedule_own_smartmed_evaluation(
  p_public_id uuid,
  p_slot_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := (select auth.uid());
  appointment_row public.appointments%rowtype;
  slot_row record;
  updated_row public.appointments%rowtype;
  old_starts_at timestamptz;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select appointment.* into appointment_row
  from public.appointments as appointment
  where appointment.public_id = p_public_id
    and appointment.user_id = current_user_id
    and private.is_evaluation_appointment(appointment.appointment_type_id)
  for update;

  if not found then
    raise exception 'EVALUATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  if appointment_row.status not in ('requested', 'pending', 'confirmed')
    or appointment_row.starts_at <= statement_timestamp()
  then
    raise exception 'EVALUATION_CANNOT_BE_RESCHEDULED' using errcode = '22023';
  end if;

  if appointment_row.availability_slot_id = p_slot_id then
    raise exception 'EVALUATION_SLOT_UNCHANGED' using errcode = '22023';
  end if;

  select
    slot.id, slot.starts_at, slot.ends_at, slot.staff_member_id,
    slot.location_id, slot.appointment_type_id, slot.capacity,
    appointment_type.duration_minutes, appointment_type.booking_notice_minutes,
    appointment_type.booking_horizon_days, location.kind as location_kind,
    location.name as location_name, location.city as location_city,
    staff.display_name as staff_name, staff.title as staff_title
  into slot_row
  from public.availability_exceptions as slot
  join public.appointment_types as appointment_type
    on appointment_type.id = slot.appointment_type_id
  join public.staff_members as staff on staff.id = slot.staff_member_id
  join public.locations as location on location.id = slot.location_id
  where slot.id = p_slot_id
    and slot.kind = 'available'
    and slot.is_public
    and appointment_type.slug = 'evaluare-initiala-smartmed'
    and appointment_type.is_active
    and staff.is_active and staff.is_bookable
    and location.is_active and location.kind in ('online', 'center')
  for update of slot;

  if not found then
    raise exception 'SLOT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if slot_row.starts_at < statement_timestamp() + slot_row.booking_notice_minutes * interval '1 minute'
    or slot_row.starts_at > statement_timestamp() + slot_row.booking_horizon_days * interval '1 day'
    or slot_row.ends_at - slot_row.starts_at <> slot_row.duration_minutes * interval '1 minute'
  then
    raise exception 'SLOT_NOT_AVAILABLE' using errcode = '22023';
  end if;

  if private.evaluation_slot_active_booking_count(
      slot_row.id,
      appointment_row.id
    ) >= slot_row.capacity
  then
    raise exception 'SLOT_FULL' using errcode = '23P01';
  end if;

  if exists (
    select 1 from public.availability_exceptions as blocked
    where blocked.staff_member_id = slot_row.staff_member_id
      and blocked.kind = 'unavailable'
      and (blocked.appointment_type_id is null or blocked.appointment_type_id = slot_row.appointment_type_id)
      and (blocked.location_id is null or blocked.location_id = slot_row.location_id)
      and tstzrange(blocked.starts_at, blocked.ends_at, '[)')
        && tstzrange(slot_row.starts_at, slot_row.ends_at, '[)')
  ) then
    raise exception 'SLOT_NOT_AVAILABLE' using errcode = '23P01';
  end if;

  old_starts_at := appointment_row.starts_at;

  begin
    update public.appointments
    set
      appointment_type_id = slot_row.appointment_type_id,
      staff_member_id = slot_row.staff_member_id,
      location_id = slot_row.location_id,
      availability_slot_id = slot_row.id,
      starts_at = slot_row.starts_at,
      ends_at = slot_row.ends_at,
      status = 'confirmed',
      confirmed_at = statement_timestamp(),
      cancelled_at = null,
      booking_version = booking_version + 1,
      reschedule_count = reschedule_count + 1,
      last_rescheduled_at = statement_timestamp(),
      metadata = metadata || jsonb_build_object(
        'deliveryMode', private.evaluation_delivery_mode(slot_row.location_kind),
        'previousStartsAt', old_starts_at
      )
    where id = appointment_row.id
    returning * into updated_row;
  exception
    when exclusion_violation or unique_violation then
      raise exception 'SLOT_TAKEN' using errcode = '23P01';
  end;

  insert into public.appointment_status_history (
    appointment_id, from_status, to_status, changed_by, reason
  ) values (
    updated_row.id, appointment_row.status, updated_row.status,
    current_user_id, format('Reprogramare de la %s', old_starts_at)
  );

  perform private.enqueue_evaluation_notification(updated_row.id, 'evaluation_rescheduled');

  return jsonb_build_object(
    'publicId', updated_row.public_id,
    'startsAt', updated_row.starts_at,
    'endsAt', updated_row.ends_at,
    'status', updated_row.status,
    'bookingVersion', updated_row.booking_version,
    'deliveryMode', private.evaluation_delivery_mode(slot_row.location_kind),
    'locationName', slot_row.location_name,
    'locationCity', slot_row.location_city,
    'staffName', slot_row.staff_name,
    'staffTitle', slot_row.staff_title,
    'remainingPlaces', slot_row.capacity
      - private.evaluation_slot_active_booking_count(slot_row.id)
  );
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
  target_slot_id bigint;
  target_capacity integer;
  target_starts_at timestamptz;
  target_ends_at timestamptz;
  target_location_kind text;
  target_status text;
  normalized_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  notification_type text;
  schedule_changed boolean := false;
  status_changed boolean := false;
begin
  if not private.is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if p_status is not null and p_status not in (
    'requested', 'pending', 'confirmed', 'completed',
    'cancelled', 'declined', 'no_show'
  ) then
    raise exception 'INVALID_APPOINTMENT_STATUS' using errcode = '22023';
  end if;

  if normalized_reason is not null and char_length(normalized_reason) > 500 then
    raise exception 'REASON_TOO_LONG' using errcode = '22023';
  end if;

  select appointment.* into appointment_row
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
  target_slot_id := appointment_row.availability_slot_id;
  target_starts_at := appointment_row.starts_at;
  target_ends_at := appointment_row.ends_at;
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
    select
      slot.appointment_type_id, slot.staff_member_id, slot.location_id,
      slot.id, slot.capacity, slot.starts_at, slot.ends_at, location.kind
    into
      target_appointment_type_id, target_staff_member_id, target_location_id,
      target_slot_id, target_capacity, target_starts_at, target_ends_at,
      target_location_kind
    from public.availability_exceptions as slot
    join public.appointment_types as appointment_type
      on appointment_type.id = slot.appointment_type_id
    join public.staff_members as staff on staff.id = slot.staff_member_id
    join public.locations as location on location.id = slot.location_id
    where slot.id = p_slot_id
      and slot.kind = 'available'
      and slot.starts_at > statement_timestamp()
      and appointment_type.slug = 'evaluare-initiala-smartmed'
      and appointment_type.is_active
      and staff.is_active and staff.is_bookable
      and location.is_active and location.kind in ('online', 'center')
    for update of slot;

    if not found then
      raise exception 'SLOT_NOT_FOUND' using errcode = 'P0002';
    end if;
  elsif target_slot_id is not null
    and target_status in ('requested', 'pending', 'confirmed')
    and appointment_row.status not in ('requested', 'pending', 'confirmed')
  then
    select slot.capacity into target_capacity
    from public.availability_exceptions as slot
    where slot.id = target_slot_id
    for update;

    if not found then
      raise exception 'SLOT_NOT_FOUND' using errcode = 'P0002';
    end if;
  end if;

  schedule_changed := target_slot_id is distinct from appointment_row.availability_slot_id
    or target_starts_at is distinct from appointment_row.starts_at
    or target_location_id is distinct from appointment_row.location_id
    or target_staff_member_id is distinct from appointment_row.staff_member_id;
  status_changed := p_status is not null and p_status is distinct from appointment_row.status;

  if target_slot_id is not null
    and target_status in ('requested', 'pending', 'confirmed')
    and (schedule_changed or appointment_row.status not in ('requested', 'pending', 'confirmed'))
    and private.evaluation_slot_active_booking_count(
      target_slot_id,
      appointment_row.id
    ) >= target_capacity
  then
    raise exception 'SLOT_FULL' using errcode = '23P01';
  end if;

  begin
    update public.appointments
    set
      appointment_type_id = target_appointment_type_id,
      staff_member_id = target_staff_member_id,
      location_id = target_location_id,
      availability_slot_id = target_slot_id,
      starts_at = target_starts_at,
      ends_at = target_ends_at,
      status = target_status,
      confirmed_at = case
        when target_status = 'confirmed'
          then coalesce(appointment_row.confirmed_at, statement_timestamp())
        else appointment_row.confirmed_at
      end,
      cancelled_at = case
        when target_status = 'cancelled'
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
        ) else appointment_row.metadata
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
      case when schedule_changed then 'Reprogramare realizată de administrator' else reason end
    )
    where id = (
      select history.id from public.appointment_status_history as history
      where history.appointment_id = updated_row.id
        and history.from_status = appointment_row.status
        and history.to_status = updated_row.status
      order by history.created_at desc, history.id desc limit 1
    );
  elsif schedule_changed or normalized_reason is not null then
    insert into public.appointment_status_history (
      appointment_id, from_status, to_status, changed_by, reason
    ) values (
      updated_row.id, appointment_row.status, updated_row.status,
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
    perform private.enqueue_evaluation_notification(updated_row.id, notification_type);
  end if;

  return jsonb_build_object(
    'publicId', updated_row.public_id,
    'status', updated_row.status,
    'startsAt', updated_row.starts_at,
    'endsAt', updated_row.ends_at,
    'bookingVersion', updated_row.booking_version,
    'notificationQueued', notification_type is not null,
    'remainingPlaces', case when target_slot_id is null then null
      else target_capacity - private.evaluation_slot_active_booking_count(target_slot_id) end
  );
end
$function$;

create or replace function public.book_smartmed_evaluation(
  p_slot_id bigint,
  p_booking_request_id uuid,
  p_evaluation_goal text,
  p_phone text default null,
  p_customer_notes text default null,
  p_privacy_accepted boolean default false,
  p_source text default 'home-hero'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := (select auth.uid());
  auth_row record;
  profile_row record;
  slot_row record;
  existing_row record;
  inserted_row public.appointments%rowtype;
  normalized_goal text := btrim(coalesce(p_evaluation_goal, ''));
  normalized_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  normalized_notes text := nullif(btrim(coalesce(p_customer_notes, '')), '');
  normalized_source text := left(btrim(coalesce(p_source, 'website')), 80);
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select users.email, users.email_confirmed_at, users.is_anonymous
  into auth_row
  from auth.users as users
  where users.id = current_user_id;

  if not found or auth_row.is_anonymous or auth_row.email_confirmed_at is null then
    raise exception 'CONFIRMED_ACCOUNT_REQUIRED' using errcode = '42501';
  end if;

  if not p_privacy_accepted then
    raise exception 'PRIVACY_REQUIRED' using errcode = '22023';
  end if;

  if normalized_goal not in (
    'evaluate_level', 'build_plan', 'choose_program', 'visit_center', 'choose_modules'
  ) then
    raise exception 'INVALID_EVALUATION_GOAL' using errcode = '22023';
  end if;

  if normalized_phone is not null and char_length(normalized_phone) not between 7 and 32 then
    raise exception 'INVALID_PHONE' using errcode = '22023';
  end if;

  if normalized_notes is not null and char_length(normalized_notes) > 600 then
    raise exception 'NOTES_TOO_LONG' using errcode = '22023';
  end if;

  if normalized_source = '' then
    normalized_source := 'website';
  end if;

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

  select
    slot.id, slot.starts_at, slot.ends_at, slot.staff_member_id,
    slot.location_id, slot.appointment_type_id, slot.capacity,
    appointment_type.duration_minutes, appointment_type.booking_notice_minutes,
    appointment_type.booking_horizon_days, location.kind as location_kind,
    location.name as location_name, location.city as location_city,
    staff.display_name as staff_name, staff.title as staff_title
  into slot_row
  from public.availability_exceptions as slot
  join public.appointment_types as appointment_type
    on appointment_type.id = slot.appointment_type_id
  join public.staff_members as staff on staff.id = slot.staff_member_id
  join public.locations as location on location.id = slot.location_id
  where slot.id = p_slot_id
    and slot.kind = 'available'
    and slot.is_public
    and appointment_type.slug = 'evaluare-initiala-smartmed'
    and appointment_type.is_active
    and staff.is_active and staff.is_bookable
    and location.is_active and location.kind in ('online', 'center')
  for update of slot;

  if not found then
    raise exception 'SLOT_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- A concurrent identical request may have inserted while this transaction
  -- waited for the slot row. Re-read after the lock so idempotency wins over a
  -- false capacity/active-evaluation error.
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
    or slot_row.starts_at > statement_timestamp() + slot_row.booking_horizon_days * interval '1 day'
    or slot_row.ends_at - slot_row.starts_at <> slot_row.duration_minutes * interval '1 minute'
  then
    raise exception 'SLOT_NOT_AVAILABLE' using errcode = '22023';
  end if;

  if private.evaluation_slot_active_booking_count(slot_row.id) >= slot_row.capacity then
    raise exception 'SLOT_FULL' using errcode = '23P01';
  end if;

  if exists (
    select 1 from public.availability_exceptions as blocked
    where blocked.staff_member_id = slot_row.staff_member_id
      and blocked.kind = 'unavailable'
      and (blocked.appointment_type_id is null or blocked.appointment_type_id = slot_row.appointment_type_id)
      and (blocked.location_id is null or blocked.location_id = slot_row.location_id)
      and tstzrange(blocked.starts_at, blocked.ends_at, '[)')
        && tstzrange(slot_row.starts_at, slot_row.ends_at, '[)')
  ) then
    raise exception 'SLOT_NOT_AVAILABLE' using errcode = '23P01';
  end if;

  if exists (
    select 1 from public.appointments as existing
    join public.appointment_types as existing_type
      on existing_type.id = existing.appointment_type_id
    where existing.staff_member_id = slot_row.staff_member_id
      and existing.availability_slot_id is null
      and existing.status in ('requested', 'pending', 'confirmed')
      and tstzrange(existing.blocked_starts_at, existing.blocked_ends_at, '[)')
        && tstzrange(
          slot_row.starts_at - existing_type.buffer_before_minutes * interval '1 minute',
          slot_row.ends_at + existing_type.buffer_after_minutes * interval '1 minute',
          '[)'
        )
  ) then
    raise exception 'SLOT_NOT_AVAILABLE' using errcode = '23P01';
  end if;

  if exists (
    select 1 from public.appointments as active_evaluation
    where active_evaluation.user_id = current_user_id
      and private.is_evaluation_appointment(active_evaluation.appointment_type_id)
      and active_evaluation.status in ('requested', 'pending', 'confirmed')
      and active_evaluation.starts_at > statement_timestamp()
  ) then
    raise exception 'ACTIVE_EVALUATION_EXISTS' using errcode = '23505';
  end if;

  select profile.full_name, profile.phone, profile.study_stage,
    profile.target_medical_center, profile.target_exam_plan, profile.focus_subjects
  into profile_row
  from public.profiles as profile
  where profile.id = current_user_id;

  if profile_row.full_name is null or char_length(btrim(profile_row.full_name)) < 2 then
    raise exception 'PROFILE_NAME_REQUIRED' using errcode = '22023';
  end if;

  begin
    insert into public.appointments (
      user_id, appointment_type_id, staff_member_id, location_id,
      availability_slot_id, starts_at, ends_at, timezone, status,
      contact_name, contact_email, contact_phone, customer_notes, source,
      created_by, confirmed_at, booking_request_id, booking_version, metadata
    ) values (
      current_user_id, slot_row.appointment_type_id, slot_row.staff_member_id,
      slot_row.location_id, slot_row.id, slot_row.starts_at, slot_row.ends_at,
      'Europe/Bucharest', 'confirmed', btrim(profile_row.full_name),
      lower(btrim(auth_row.email)), coalesce(normalized_phone, profile_row.phone),
      normalized_notes,
      case when normalized_source in ('website', 'admin', 'phone', 'migration')
        then normalized_source else 'website' end,
      current_user_id, statement_timestamp(), p_booking_request_id, 1,
      jsonb_strip_nulls(jsonb_build_object(
        'evaluationGoal', normalized_goal,
        'deliveryMode', private.evaluation_delivery_mode(slot_row.location_kind),
        'sourcePlacement', normalized_source,
        'studyStage', profile_row.study_stage,
        'targetMedicalCenter', profile_row.target_medical_center,
        'targetExamPlan', profile_row.target_exam_plan,
        'focusSubjects', profile_row.focus_subjects
      ))
    ) returning * into inserted_row;
  exception
    when exclusion_violation or unique_violation then
      raise exception 'SLOT_TAKEN' using errcode = '23P01';
  end;

  if normalized_phone is not null then
    update public.profiles set phone = normalized_phone where id = current_user_id;
  end if;

  insert into public.appointment_status_history (
    appointment_id, from_status, to_status, changed_by, reason
  ) values (
    inserted_row.id, null, 'confirmed', current_user_id,
    'Programare creată de utilizator'
  );

  perform private.enqueue_evaluation_notification(inserted_row.id, 'evaluation_confirmed');

  return jsonb_build_object(
    'publicId', inserted_row.public_id,
    'startsAt', inserted_row.starts_at,
    'endsAt', inserted_row.ends_at,
    'status', inserted_row.status,
    'bookingVersion', inserted_row.booking_version,
    'deliveryMode', private.evaluation_delivery_mode(slot_row.location_kind),
    'locationName', slot_row.location_name,
    'locationCity', slot_row.location_city,
    'staffName', slot_row.staff_name,
    'staffTitle', slot_row.staff_title,
    'remainingPlaces', slot_row.capacity
      - private.evaluation_slot_active_booking_count(slot_row.id),
    'reused', false
  );
end
$function$;
