-- SmartMed initial evaluation booking workflow.
--
-- The generic appointment foundation remains the source of truth. This
-- migration adds the evaluation-specific snapshot, explicit availability,
-- authenticated RPCs, atomic rescheduling, and a transactional notification
-- outbox. No user-supplied identity, email, staff assignment, duration, or
-- status is trusted.

begin;

alter table public.appointments
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists booking_request_id uuid,
  add column if not exists booking_version integer not null default 1,
  add column if not exists reschedule_count integer not null default 0,
  add column if not exists last_rescheduled_at timestamptz;

do $migration$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.appointments'::regclass
      and conname = 'appointments_metadata_object'
  ) then
    alter table public.appointments
      add constraint appointments_metadata_object
      check (jsonb_typeof(metadata) = 'object') not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.appointments'::regclass
      and conname = 'appointments_booking_version_positive'
  ) then
    alter table public.appointments
      add constraint appointments_booking_version_positive
      check (booking_version > 0) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.appointments'::regclass
      and conname = 'appointments_reschedule_count_nonnegative'
  ) then
    alter table public.appointments
      add constraint appointments_reschedule_count_nonnegative
      check (reschedule_count >= 0) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.appointments'::regclass
      and conname = 'appointments_customer_notes_length'
  ) then
    alter table public.appointments
      add constraint appointments_customer_notes_length
      check (
        customer_notes is null
        or char_length(btrim(customer_notes)) between 1 and 600
      ) not valid;
  end if;
end
$migration$;

alter table public.appointments validate constraint appointments_metadata_object;
alter table public.appointments validate constraint appointments_booking_version_positive;
alter table public.appointments validate constraint appointments_reschedule_count_nonnegative;
alter table public.appointments validate constraint appointments_customer_notes_length;

create unique index if not exists appointments_booking_request_unique_idx
  on public.appointments (user_id, booking_request_id)
  where user_id is not null and booking_request_id is not null;

create index if not exists appointments_evaluation_schedule_idx
  on public.appointments (appointment_type_id, status, starts_at, id);

create unique index if not exists availability_exceptions_unique_slot_idx
  on public.availability_exceptions (
    staff_member_id,
    appointment_type_id,
    location_id,
    kind,
    starts_at,
    ends_at
  )
  nulls not distinct;

create index if not exists availability_exceptions_evaluation_slots_idx
  on public.availability_exceptions (
    appointment_type_id,
    kind,
    is_public,
    starts_at,
    ends_at
  );

insert into public.appointment_types (
  name,
  slug,
  description,
  duration_minutes,
  buffer_before_minutes,
  buffer_after_minutes,
  booking_notice_minutes,
  booking_horizon_days,
  location_mode,
  is_active
)
values (
  'Evaluare inițială SmartMed',
  'evaluare-initiala-smartmed',
  'O conversație individuală de orientare pentru nivel, obiective și traseul de pregătire potrivit.',
  30,
  5,
  10,
  120,
  60,
  'either',
  true
)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  duration_minutes = excluded.duration_minutes,
  buffer_before_minutes = excluded.buffer_before_minutes,
  buffer_after_minutes = excluded.buffer_after_minutes,
  booking_notice_minutes = excluded.booking_notice_minutes,
  booking_horizon_days = excluded.booking_horizon_days,
  location_mode = excluded.location_mode,
  is_active = excluded.is_active;

insert into public.staff_members (
  display_name,
  slug,
  title,
  bio,
  timezone,
  is_bookable,
  is_public,
  is_active
)
values (
  'Echipa SmartMed',
  'echipa-evaluare-smartmed',
  'Consilier educațional',
  'Un membru al echipei SmartMed care te ajută să clarifici punctul de plecare și următorii pași.',
  'Europe/Bucharest',
  true,
  true,
  true
)
on conflict (slug) do update
set
  display_name = excluded.display_name,
  title = excluded.title,
  bio = excluded.bio,
  timezone = excluded.timezone,
  is_bookable = excluded.is_bookable,
  is_public = excluded.is_public,
  is_active = excluded.is_active;

insert into public.locations (
  name,
  slug,
  kind,
  timezone,
  country_code,
  is_active
)
values
  (
    'Online · SmartMed',
    'evaluare-smartmed-online',
    'online',
    'Europe/Bucharest',
    'RO',
    true
  ),
  (
    'Centrul SmartMed',
    'evaluare-smartmed-centru',
    'center',
    'Europe/Bucharest',
    'RO',
    true
  )
on conflict (slug) do update
set
  name = excluded.name,
  kind = excluded.kind,
  timezone = excluded.timezone,
  is_active = excluded.is_active;

create table if not exists private.appointment_notification_outbox (
  id uuid primary key default gen_random_uuid(),
  appointment_id bigint not null
    references public.appointments(id) on delete cascade,
  notification_type text not null
    check (
      notification_type in (
        'evaluation_confirmed',
        'evaluation_rescheduled',
        'evaluation_cancelled'
      )
    ),
  booking_version integer not null check (booking_version > 0),
  idempotency_key text not null unique
    check (char_length(idempotency_key) between 1 and 256),
  recipient_email text not null
    check (
      char_length(btrim(recipient_email)) between 5 and 320
      and btrim(recipient_email) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  status text not null default 'pending'
    check (
      status in (
        'pending',
        'processing',
        'pending_configuration',
        'sent',
        'failed'
      )
    ),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default statement_timestamp(),
  claimed_by uuid references auth.users(id) on delete set null,
  claim_token uuid,
  claimed_at timestamptz,
  provider_message_id text,
  last_error_code text,
  sent_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  unique (appointment_id, notification_type, booking_version),
  check (
    (status = 'processing' and claimed_by is not null and claim_token is not null and claimed_at is not null)
    or status <> 'processing'
  ),
  check ((status = 'sent' and sent_at is not null) or status <> 'sent')
);

create index if not exists appointment_notification_outbox_dispatch_idx
  on private.appointment_notification_outbox (
    status,
    next_attempt_at,
    created_at,
    id
  )
  where status in ('pending', 'pending_configuration', 'failed', 'processing');

create index if not exists appointment_notification_outbox_appointment_idx
  on private.appointment_notification_outbox (appointment_id, created_at desc);

drop trigger if exists set_appointment_notification_outbox_updated_at
  on private.appointment_notification_outbox;
create trigger set_appointment_notification_outbox_updated_at
before update on private.appointment_notification_outbox
for each row execute function private.set_updated_at();

create or replace function private.is_evaluation_appointment(
  p_appointment_type_id bigint
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.appointment_types as appointment_type
    where appointment_type.id = p_appointment_type_id
      and appointment_type.slug = 'evaluare-initiala-smartmed'
  )
$function$;

create or replace function private.evaluation_delivery_mode(
  p_location_kind text
)
returns text
language sql
immutable
set search_path = ''
as $function$
  select case
    when p_location_kind = 'online' then 'online'
    else 'in_person'
  end
$function$;

create or replace function private.enqueue_evaluation_notification(
  p_appointment_id bigint,
  p_notification_type text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  appointment_row record;
begin
  if p_notification_type not in (
    'evaluation_confirmed',
    'evaluation_rescheduled',
    'evaluation_cancelled'
  ) then
    raise exception 'INVALID_NOTIFICATION_TYPE' using errcode = '22023';
  end if;

  select
    appointment.id,
    appointment.public_id,
    appointment.booking_version,
    appointment.contact_name,
    appointment.contact_email,
    appointment.starts_at,
    appointment.ends_at,
    appointment.timezone,
    appointment.status,
    appointment.metadata,
    appointment.customer_notes,
    location.name as location_name,
    location.kind as location_kind,
    location.address_line_1,
    location.address_line_2,
    location.city as location_city,
    staff.display_name as staff_name,
    staff.title as staff_title
  into appointment_row
  from public.appointments as appointment
  join public.appointment_types as appointment_type
    on appointment_type.id = appointment.appointment_type_id
  left join public.locations as location
    on location.id = appointment.location_id
  left join public.staff_members as staff
    on staff.id = appointment.staff_member_id
  where appointment.id = p_appointment_id
    and appointment_type.slug = 'evaluare-initiala-smartmed';

  if not found then
    raise exception 'EVALUATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into private.appointment_notification_outbox (
    appointment_id,
    notification_type,
    booking_version,
    idempotency_key,
    recipient_email,
    payload
  )
  values (
    appointment_row.id,
    p_notification_type,
    appointment_row.booking_version,
    format(
      '%s/%s/v%s',
      p_notification_type,
      appointment_row.public_id,
      appointment_row.booking_version
    ),
    lower(btrim(appointment_row.contact_email)),
    jsonb_build_object(
      'publicId', appointment_row.public_id,
      'fullName', appointment_row.contact_name,
      'startsAt', appointment_row.starts_at,
      'endsAt', appointment_row.ends_at,
      'timezone', appointment_row.timezone,
      'status', appointment_row.status,
      'deliveryMode', private.evaluation_delivery_mode(appointment_row.location_kind),
      'locationName', appointment_row.location_name,
      'locationAddress', concat_ws(', ', appointment_row.address_line_1, appointment_row.address_line_2),
      'locationCity', appointment_row.location_city,
      'staffName', appointment_row.staff_name,
      'staffTitle', appointment_row.staff_title,
      'metadata', appointment_row.metadata,
      'customerNotes', appointment_row.customer_notes
    )
  )
  on conflict (appointment_id, notification_type, booking_version) do nothing;
end
$function$;

create or replace function public.get_smartmed_evaluation_slots(
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
  public_label text
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
    slot.public_label
  from public.availability_exceptions as slot
  join public.appointment_types as appointment_type
    on appointment_type.id = slot.appointment_type_id
  join public.staff_members as staff
    on staff.id = slot.staff_member_id
  join public.locations as location
    on location.id = slot.location_id
  where appointment_type.slug = 'evaluare-initiala-smartmed'
    and appointment_type.is_active
    and staff.is_active
    and staff.is_bookable
    and location.is_active
    and location.kind in ('online', 'center')
    and slot.kind = 'available'
    and slot.is_public
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
    'evaluate_level',
    'build_plan',
    'choose_program',
    'visit_center',
    'choose_modules'
  ) then
    raise exception 'INVALID_EVALUATION_GOAL' using errcode = '22023';
  end if;

  if normalized_phone is not null
    and char_length(normalized_phone) not between 7 and 32
  then
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
    slot.id,
    slot.starts_at,
    slot.ends_at,
    slot.staff_member_id,
    slot.location_id,
    slot.appointment_type_id,
    appointment_type.duration_minutes,
    appointment_type.booking_notice_minutes,
    appointment_type.booking_horizon_days,
    location.kind as location_kind,
    location.name as location_name,
    location.city as location_city,
    staff.display_name as staff_name,
    staff.title as staff_title
  into slot_row
  from public.availability_exceptions as slot
  join public.appointment_types as appointment_type
    on appointment_type.id = slot.appointment_type_id
  join public.staff_members as staff
    on staff.id = slot.staff_member_id
  join public.locations as location
    on location.id = slot.location_id
  where slot.id = p_slot_id
    and slot.kind = 'available'
    and slot.is_public
    and appointment_type.slug = 'evaluare-initiala-smartmed'
    and appointment_type.is_active
    and staff.is_active
    and staff.is_bookable
    and location.is_active
    and location.kind in ('online', 'center')
  for update of slot;

  if not found then
    raise exception 'SLOT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if slot_row.starts_at
      < statement_timestamp()
        + slot_row.booking_notice_minutes * interval '1 minute'
    or slot_row.starts_at
      > statement_timestamp()
        + slot_row.booking_horizon_days * interval '1 day'
    or slot_row.ends_at - slot_row.starts_at
      <> slot_row.duration_minutes * interval '1 minute'
  then
    raise exception 'SLOT_NOT_AVAILABLE' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.availability_exceptions as blocked
    where blocked.staff_member_id = slot_row.staff_member_id
      and blocked.kind = 'unavailable'
      and (
        blocked.appointment_type_id is null
        or blocked.appointment_type_id = slot_row.appointment_type_id
      )
      and (
        blocked.location_id is null
        or blocked.location_id = slot_row.location_id
      )
      and tstzrange(blocked.starts_at, blocked.ends_at, '[)')
        && tstzrange(slot_row.starts_at, slot_row.ends_at, '[)')
  ) then
    raise exception 'SLOT_NOT_AVAILABLE' using errcode = '23P01';
  end if;

  if exists (
    select 1
    from public.appointments as active_evaluation
    where active_evaluation.user_id = current_user_id
      and private.is_evaluation_appointment(
        active_evaluation.appointment_type_id
      )
      and active_evaluation.status in ('requested', 'pending', 'confirmed')
      and active_evaluation.starts_at > statement_timestamp()
  ) then
    raise exception 'ACTIVE_EVALUATION_EXISTS' using errcode = '23505';
  end if;

  select profile.full_name, profile.phone,
    profile.study_stage, profile.target_medical_center,
    profile.target_exam_plan, profile.focus_subjects
  into profile_row
  from public.profiles as profile
  where profile.id = current_user_id;

  if profile_row.full_name is null
    or char_length(btrim(profile_row.full_name)) < 2
  then
    raise exception 'PROFILE_NAME_REQUIRED' using errcode = '22023';
  end if;

  begin
    insert into public.appointments (
      user_id,
      appointment_type_id,
      staff_member_id,
      location_id,
      starts_at,
      ends_at,
      timezone,
      status,
      contact_name,
      contact_email,
      contact_phone,
      customer_notes,
      source,
      created_by,
      confirmed_at,
      booking_request_id,
      booking_version,
      metadata
    )
    values (
      current_user_id,
      slot_row.appointment_type_id,
      slot_row.staff_member_id,
      slot_row.location_id,
      slot_row.starts_at,
      slot_row.ends_at,
      'Europe/Bucharest',
      'confirmed',
      btrim(profile_row.full_name),
      lower(btrim(auth_row.email)),
      coalesce(normalized_phone, profile_row.phone),
      normalized_notes,
      case
        when normalized_source in ('website', 'admin', 'phone', 'migration')
          then normalized_source
        else 'website'
      end,
      current_user_id,
      statement_timestamp(),
      p_booking_request_id,
      1,
      jsonb_strip_nulls(
        jsonb_build_object(
          'evaluationGoal', normalized_goal,
          'deliveryMode', private.evaluation_delivery_mode(slot_row.location_kind),
          'sourcePlacement', normalized_source,
          'studyStage', profile_row.study_stage,
          'targetMedicalCenter', profile_row.target_medical_center,
          'targetExamPlan', profile_row.target_exam_plan,
          'focusSubjects', profile_row.focus_subjects
        )
      )
    )
    returning * into inserted_row;
  exception
    when exclusion_violation or unique_violation then
      raise exception 'SLOT_TAKEN' using errcode = '23P01';
  end;

  if normalized_phone is not null then
    update public.profiles
    set phone = normalized_phone
    where id = current_user_id;
  end if;

  insert into public.appointment_status_history (
    appointment_id,
    from_status,
    to_status,
    changed_by,
    reason
  )
  values (
    inserted_row.id,
    null,
    'confirmed',
    current_user_id,
    'Programare creată de utilizator'
  );

  perform private.enqueue_evaluation_notification(
    inserted_row.id,
    'evaluation_confirmed'
  );

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
    'reused', false
  );
end
$function$;

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

  select appointment.*
  into appointment_row
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

  select
    slot.id,
    slot.starts_at,
    slot.ends_at,
    slot.staff_member_id,
    slot.location_id,
    slot.appointment_type_id,
    appointment_type.duration_minutes,
    appointment_type.booking_notice_minutes,
    appointment_type.booking_horizon_days,
    location.kind as location_kind,
    location.name as location_name,
    location.city as location_city,
    staff.display_name as staff_name,
    staff.title as staff_title
  into slot_row
  from public.availability_exceptions as slot
  join public.appointment_types as appointment_type
    on appointment_type.id = slot.appointment_type_id
  join public.staff_members as staff
    on staff.id = slot.staff_member_id
  join public.locations as location
    on location.id = slot.location_id
  where slot.id = p_slot_id
    and slot.kind = 'available'
    and slot.is_public
    and appointment_type.slug = 'evaluare-initiala-smartmed'
    and appointment_type.is_active
    and staff.is_active
    and staff.is_bookable
    and location.is_active
    and location.kind in ('online', 'center')
  for update of slot;

  if not found then
    raise exception 'SLOT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if slot_row.starts_at
      < statement_timestamp()
        + slot_row.booking_notice_minutes * interval '1 minute'
    or slot_row.starts_at
      > statement_timestamp()
        + slot_row.booking_horizon_days * interval '1 day'
    or slot_row.ends_at - slot_row.starts_at
      <> slot_row.duration_minutes * interval '1 minute'
  then
    raise exception 'SLOT_NOT_AVAILABLE' using errcode = '22023';
  end if;

  old_starts_at := appointment_row.starts_at;

  begin
    update public.appointments
    set
      appointment_type_id = slot_row.appointment_type_id,
      staff_member_id = slot_row.staff_member_id,
      location_id = slot_row.location_id,
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
    format('Reprogramare de la %s', old_starts_at)
  );

  perform private.enqueue_evaluation_notification(
    updated_row.id,
    'evaluation_rescheduled'
  );

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
    'staffTitle', slot_row.staff_title
  );
end
$function$;

create or replace function public.cancel_own_smartmed_evaluation(
  p_public_id uuid
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
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select appointment.*
  into appointment_row
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
    raise exception 'EVALUATION_CANNOT_BE_CANCELLED' using errcode = '22023';
  end if;

  update public.appointments
  set
    status = 'cancelled',
    cancelled_at = statement_timestamp(),
    booking_version = booking_version + 1
  where id = appointment_row.id
  returning * into updated_row;

  perform private.enqueue_evaluation_notification(
    updated_row.id,
    'evaluation_cancelled'
  );

  return jsonb_build_object(
    'publicId', updated_row.public_id,
    'startsAt', updated_row.starts_at,
    'endsAt', updated_row.ends_at,
    'status', updated_row.status,
    'bookingVersion', updated_row.booking_version
  );
end
$function$;

create or replace function public.claim_smartmed_evaluation_notification(
  p_public_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := (select auth.uid());
  outbox_row private.appointment_notification_outbox%rowtype;
  generated_claim_token uuid := gen_random_uuid();
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select outbox.*
  into outbox_row
  from private.appointment_notification_outbox as outbox
  join public.appointments as appointment
    on appointment.id = outbox.appointment_id
  where appointment.public_id = p_public_id
    and (
      appointment.user_id = current_user_id
      or private.is_admin()
    )
    and outbox.status in (
      'pending',
      'pending_configuration',
      'failed',
      'processing'
    )
    and outbox.attempt_count < 6
    and (
      outbox.status <> 'processing'
      or outbox.claimed_at < statement_timestamp() - interval '10 minutes'
    )
    and outbox.next_attempt_at <= statement_timestamp()
  order by outbox.created_at desc, outbox.id
  for update of outbox skip locked
  limit 1;

  if not found then
    return jsonb_build_object('claimed', false);
  end if;

  update private.appointment_notification_outbox
  set
    status = 'processing',
    attempt_count = attempt_count + 1,
    claimed_by = current_user_id,
    claim_token = generated_claim_token,
    claimed_at = statement_timestamp(),
    last_error_code = null
  where id = outbox_row.id
  returning * into outbox_row;

  return jsonb_build_object(
    'claimed', true,
    'notificationId', outbox_row.id,
    'claimToken', generated_claim_token,
    'notificationType', outbox_row.notification_type,
    'idempotencyKey', outbox_row.idempotency_key,
    'recipientEmail', outbox_row.recipient_email,
    'payload', outbox_row.payload
  );
end
$function$;

create or replace function public.complete_smartmed_evaluation_notification(
  p_notification_id uuid,
  p_claim_token uuid,
  p_outcome text,
  p_provider_message_id text default null,
  p_error_code text default null
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

  if p_outcome not in ('sent', 'failed', 'pending_configuration') then
    raise exception 'INVALID_NOTIFICATION_OUTCOME' using errcode = '22023';
  end if;

  update private.appointment_notification_outbox
  set
    status = p_outcome,
    provider_message_id = case
      when p_outcome = 'sent' then left(nullif(p_provider_message_id, ''), 200)
      else null
    end,
    last_error_code = case
      when p_outcome = 'sent' then null
      else left(coalesce(nullif(p_error_code, ''), 'unknown'), 120)
    end,
    sent_at = case
      when p_outcome = 'sent' then statement_timestamp()
      else null
    end,
    next_attempt_at = case
      when p_outcome = 'failed'
        then statement_timestamp() + interval '15 minutes'
      when p_outcome = 'pending_configuration'
        then statement_timestamp() + interval '1 hour'
      else next_attempt_at
    end,
    claimed_by = null,
    claim_token = null,
    claimed_at = null
  where id = p_notification_id
    and claim_token = p_claim_token
    and claimed_by = current_user_id
    and status = 'processing';

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end
$function$;

create or replace function public.retry_smartmed_evaluation_notification(
  p_public_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  updated_count integer;
begin
  if not private.is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
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
    and outbox.status <> 'sent'
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

create or replace function public.get_admin_smartmed_evaluations()
returns table (
  id bigint,
  public_id uuid,
  user_id uuid,
  contact_name text,
  contact_email text,
  contact_phone text,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone text,
  status text,
  customer_notes text,
  metadata jsonb,
  booking_version integer,
  reschedule_count integer,
  last_rescheduled_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  location_id bigint,
  location_name text,
  location_kind text,
  location_city text,
  staff_member_id bigint,
  staff_name text,
  staff_title text,
  notification_status text,
  notification_type text,
  notification_attempts integer,
  notification_error text,
  notification_sent_at timestamptz
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

  return query
  select
    appointment.id,
    appointment.public_id,
    appointment.user_id,
    appointment.contact_name,
    appointment.contact_email,
    appointment.contact_phone,
    appointment.starts_at,
    appointment.ends_at,
    appointment.timezone,
    appointment.status,
    appointment.customer_notes,
    appointment.metadata,
    appointment.booking_version,
    appointment.reschedule_count,
    appointment.last_rescheduled_at,
    appointment.created_at,
    appointment.updated_at,
    location.id,
    location.name,
    location.kind,
    location.city,
    staff.id,
    staff.display_name,
    staff.title,
    notification.status,
    notification.notification_type,
    notification.attempt_count,
    notification.last_error_code,
    notification.sent_at
  from public.appointments as appointment
  join public.appointment_types as appointment_type
    on appointment_type.id = appointment.appointment_type_id
  left join public.locations as location
    on location.id = appointment.location_id
  left join public.staff_members as staff
    on staff.id = appointment.staff_member_id
  left join lateral (
    select outbox.*
    from private.appointment_notification_outbox as outbox
    where outbox.appointment_id = appointment.id
    order by outbox.created_at desc, outbox.id
    limit 1
  ) as notification on true
  where appointment_type.slug = 'evaluare-initiala-smartmed'
  order by appointment.starts_at desc, appointment.id desc;
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
  slot_row record;
  updated_row public.appointments%rowtype;
  normalized_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  notification_type text;
  schedule_changed boolean := false;
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

  if p_slot_id is not null then
    select
      slot.starts_at,
      slot.ends_at,
      slot.staff_member_id,
      slot.location_id,
      slot.appointment_type_id,
      location.kind as location_kind
    into slot_row
    from public.availability_exceptions as slot
    join public.appointment_types as appointment_type
      on appointment_type.id = slot.appointment_type_id
    join public.staff_members as staff
      on staff.id = slot.staff_member_id
    join public.locations as location
      on location.id = slot.location_id
    where slot.id = p_slot_id
      and slot.kind = 'available'
      and appointment_type.slug = 'evaluare-initiala-smartmed'
      and staff.is_active
      and staff.is_bookable
      and location.is_active
    for update of slot;

    if not found then
      raise exception 'SLOT_NOT_FOUND' using errcode = 'P0002';
    end if;

    schedule_changed := slot_row.starts_at is distinct from appointment_row.starts_at
      or slot_row.location_id is distinct from appointment_row.location_id
      or slot_row.staff_member_id is distinct from appointment_row.staff_member_id;
  end if;

  begin
    update public.appointments
    set
      appointment_type_id = coalesce(slot_row.appointment_type_id, appointment_type_id),
      staff_member_id = coalesce(slot_row.staff_member_id, staff_member_id),
      location_id = coalesce(slot_row.location_id, location_id),
      starts_at = coalesce(slot_row.starts_at, starts_at),
      ends_at = coalesce(slot_row.ends_at, ends_at),
      status = coalesce(p_status, status),
      confirmed_at = case
        when coalesce(p_status, status) = 'confirmed'
          then coalesce(confirmed_at, statement_timestamp())
        else confirmed_at
      end,
      cancelled_at = case
        when coalesce(p_status, status) = 'cancelled'
          then coalesce(cancelled_at, statement_timestamp())
        else null
      end,
      booking_version = booking_version + case
        when schedule_changed or p_status is distinct from null
          and p_status is distinct from appointment_row.status
        then 1 else 0 end,
      reschedule_count = reschedule_count + case when schedule_changed then 1 else 0 end,
      last_rescheduled_at = case
        when schedule_changed then statement_timestamp()
        else last_rescheduled_at
      end,
      metadata = case
        when schedule_changed then metadata || jsonb_build_object(
          'deliveryMode', private.evaluation_delivery_mode(slot_row.location_kind),
          'previousStartsAt', appointment_row.starts_at,
          'adminReason', normalized_reason
        )
        else metadata
      end
    where id = appointment_row.id
    returning * into updated_row;
  exception
    when exclusion_violation or unique_violation then
      raise exception 'SLOT_TAKEN' using errcode = '23P01';
  end;

  if schedule_changed then
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
    notification_type := 'evaluation_rescheduled';
  elsif updated_row.status = 'cancelled'
    and appointment_row.status is distinct from updated_row.status
  then
    notification_type := 'evaluation_cancelled';
  elsif updated_row.status = 'confirmed'
    and appointment_row.status is distinct from updated_row.status
  then
    notification_type := 'evaluation_confirmed';
  end if;

  if notification_type is not null then
    perform private.enqueue_evaluation_notification(
      updated_row.id,
      notification_type
    );
  end if;

  if normalized_reason is not null and not schedule_changed then
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
      normalized_reason
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

revoke all on function private.is_evaluation_appointment(bigint)
  from public, anon, authenticated;
revoke all on function private.evaluation_delivery_mode(text)
  from public, anon, authenticated;
revoke all on function private.enqueue_evaluation_notification(bigint, text)
  from public, anon, authenticated;

revoke all on function public.get_smartmed_evaluation_slots(timestamptz, timestamptz)
  from public, anon, authenticated;
revoke all on function public.book_smartmed_evaluation(bigint, uuid, text, text, text, boolean, text)
  from public, anon, authenticated;
revoke all on function public.reschedule_own_smartmed_evaluation(uuid, bigint)
  from public, anon, authenticated;
revoke all on function public.cancel_own_smartmed_evaluation(uuid)
  from public, anon, authenticated;
revoke all on function public.claim_smartmed_evaluation_notification(uuid)
  from public, anon, authenticated;
revoke all on function public.complete_smartmed_evaluation_notification(uuid, uuid, text, text, text)
  from public, anon, authenticated;
revoke all on function public.retry_smartmed_evaluation_notification(uuid)
  from public, anon, authenticated;
revoke all on function public.get_admin_smartmed_evaluations()
  from public, anon, authenticated;
revoke all on function public.admin_update_smartmed_evaluation(uuid, text, bigint, text)
  from public, anon, authenticated;

grant usage on schema private to authenticated;
grant execute on function private.is_evaluation_appointment(bigint)
  to authenticated;

grant execute on function public.get_smartmed_evaluation_slots(timestamptz, timestamptz)
  to authenticated;
grant execute on function public.book_smartmed_evaluation(bigint, uuid, text, text, text, boolean, text)
  to authenticated;
grant execute on function public.reschedule_own_smartmed_evaluation(uuid, bigint)
  to authenticated;
grant execute on function public.cancel_own_smartmed_evaluation(uuid)
  to authenticated;
grant execute on function public.claim_smartmed_evaluation_notification(uuid)
  to authenticated;
grant execute on function public.complete_smartmed_evaluation_notification(uuid, uuid, text, text, text)
  to authenticated;
grant execute on function public.retry_smartmed_evaluation_notification(uuid)
  to authenticated;
grant execute on function public.get_admin_smartmed_evaluations()
  to authenticated;
grant execute on function public.admin_update_smartmed_evaluation(uuid, text, bigint, text)
  to authenticated;

grant select (
  metadata,
  booking_request_id,
  booking_version,
  reschedule_count,
  last_rescheduled_at
) on table public.appointments to authenticated;

revoke all on table private.appointment_notification_outbox
  from public, anon, authenticated;

comment on function public.book_smartmed_evaluation(bigint, uuid, text, text, text, boolean, text) is
  'Books one SmartMed evaluation for the authenticated, email-confirmed user. Identity, email, staff, duration, and status are always derived server-side.';

comment on table private.appointment_notification_outbox is
  'Transactional outbox for evaluation emails. Private by default; narrow authenticated RPCs claim and complete only notifications owned by the caller or an admin.';

commit;
