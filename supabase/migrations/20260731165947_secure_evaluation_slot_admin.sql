-- Availability writes are performed through narrow security-definer RPCs.
-- Next.js capability checks remain the first layer, while the database repeats
-- the administrator check and validates every referenced entity server-side.

create or replace function public.admin_create_smartmed_evaluation_slot(
  p_starts_at timestamptz,
  p_staff_member_id bigint,
  p_location_id bigint,
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

  if normalized_label is not null and char_length(normalized_label) > 120 then
    raise exception 'SLOT_LABEL_TOO_LONG' using errcode = '22023';
  end if;

  select appointment_type.*
  into appointment_type_row
  from public.appointment_types as appointment_type
  where appointment_type.slug = 'evaluare-initiala-smartmed'
    and appointment_type.is_active
  for share;

  if not found then
    raise exception 'EVALUATION_TYPE_NOT_FOUND' using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from public.staff_members as staff
    where staff.id = p_staff_member_id
      and staff.is_active
      and staff.is_bookable
  ) then
    raise exception 'STAFF_NOT_AVAILABLE' using errcode = 'P0002';
  end if;

  select location.*
  into location_row
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
    select 1
    from public.availability_exceptions as existing
    where existing.staff_member_id = p_staff_member_id
      and tstzrange(existing.starts_at, existing.ends_at, '[)')
        && tstzrange(p_starts_at, computed_ends_at, '[)')
  ) then
    raise exception 'SLOT_TAKEN' using errcode = '23P01';
  end if;

  if exists (
    select 1
    from public.appointments as appointment
    where appointment.staff_member_id = p_staff_member_id
      and appointment.status in ('requested', 'pending', 'confirmed')
      and tstzrange(
        appointment.blocked_starts_at,
        appointment.blocked_ends_at,
        '[)'
      ) && tstzrange(
        p_starts_at
          - appointment_type_row.buffer_before_minutes * interval '1 minute',
        computed_ends_at
          + appointment_type_row.buffer_after_minutes * interval '1 minute',
        '[)'
      )
  ) then
    raise exception 'SLOT_TAKEN' using errcode = '23P01';
  end if;

  insert into public.availability_exceptions (
    staff_member_id,
    appointment_type_id,
    location_id,
    kind,
    starts_at,
    ends_at,
    is_public,
    public_label
  )
  values (
    p_staff_member_id,
    appointment_type_row.id,
    location_row.id,
    'available',
    p_starts_at,
    computed_ends_at,
    true,
    normalized_label
  )
  returning * into inserted_row;

  return jsonb_build_object(
    'slotId', inserted_row.id,
    'startsAt', inserted_row.starts_at,
    'endsAt', inserted_row.ends_at,
    'locationId', inserted_row.location_id,
    'staffMemberId', inserted_row.staff_member_id
  );
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
  deleted_count integer;
begin
  if not private.is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  delete from public.availability_exceptions as slot
  using public.appointment_types as appointment_type
  where slot.id = p_slot_id
    and appointment_type.id = slot.appointment_type_id
    and appointment_type.slug = 'evaluare-initiala-smartmed'
    and slot.kind = 'available'
    and slot.starts_at > statement_timestamp();

  get diagnostics deleted_count = row_count;
  return deleted_count = 1;
end
$function$;

revoke all on function public.admin_create_smartmed_evaluation_slot(
  timestamptz,
  bigint,
  bigint,
  text
) from public, anon, authenticated;
revoke all on function public.admin_delete_smartmed_evaluation_slot(bigint)
  from public, anon, authenticated;

grant execute on function public.admin_create_smartmed_evaluation_slot(
  timestamptz,
  bigint,
  bigint,
  text
) to authenticated;
grant execute on function public.admin_delete_smartmed_evaluation_slot(bigint)
  to authenticated;

comment on function public.admin_create_smartmed_evaluation_slot(
  timestamptz,
  bigint,
  bigint,
  text
) is
  'Creates one validated SmartMed evaluation slot after repeating the database administrator check and checking all schedule conflicts.';
