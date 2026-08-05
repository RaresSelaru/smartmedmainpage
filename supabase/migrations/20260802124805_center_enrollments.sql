-- SmartMed centre enrolments.
--
-- The public application is intentionally available to both anonymous and
-- authenticated visitors. PII is never writable or readable directly through
-- the Data API: the public surface consists of narrow, validated RPCs. A
-- short-lived capability token powers the optional post-submit conversion
-- step (newsletter and account creation) without making either choice a
-- prerequisite for the enrolment itself.

begin;

create table public.center_enrollments (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  idempotency_key uuid not null unique,
  follow_up_token uuid not null default gen_random_uuid() unique,
  follow_up_expires_at timestamptz not null
    default (statement_timestamp() + interval '7 days'),
  account_link_key uuid not null default gen_random_uuid() unique,
  user_id uuid references auth.users(id) on delete set null,

  participant_status text not null
    constraint center_enrollments_participant_status_check
      check (participant_status in ('adult', 'minor')),
  full_name text not null
    constraint center_enrollments_full_name_length
      check (char_length(btrim(full_name)) between 2 and 100),
  birth_date date not null
    constraint center_enrollments_birth_date_range
      check (birth_date between date '1900-01-01' and date '2100-01-01'),
  locality_county text not null
    constraint center_enrollments_locality_county_length
      check (char_length(btrim(locality_county)) between 2 and 160),
  phone text not null
    constraint center_enrollments_phone_length
      check (char_length(btrim(phone)) between 7 and 32),
  email text not null
    constraint center_enrollments_email_format
      check (
        char_length(btrim(email)) between 5 and 320
        and btrim(email) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      ),
  normalized_email text generated always as (lower(btrim(email))) stored,
  high_school text not null
    constraint center_enrollments_high_school_length
      check (char_length(btrim(high_school)) between 2 and 160),
  study_profile text not null
    constraint center_enrollments_study_profile_length
      check (char_length(btrim(study_profile)) between 2 and 120),

  guardian_name text,
  guardian_phone text,
  guardian_email text,
  constraint center_enrollments_guardian_name_length check (
    guardian_name is null
    or char_length(btrim(guardian_name)) between 2 and 120
  ),
  constraint center_enrollments_guardian_phone_length check (
    guardian_phone is null
    or char_length(btrim(guardian_phone)) between 7 and 32
  ),
  constraint center_enrollments_guardian_email_format check (
    guardian_email is null
    or (
      char_length(btrim(guardian_email)) between 5 and 320
      and btrim(guardian_email) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    )
  ),
  constraint center_enrollments_minor_guardian_required check (
    participant_status <> 'minor'
    or (
      guardian_name is not null
      and guardian_phone is not null
      and guardian_email is not null
    )
  ),

  exam_year smallint not null
    constraint center_enrollments_exam_year_range
      check (exam_year between 2026 and 2045),
  current_grade text not null
    constraint center_enrollments_current_grade_check
      check (current_grade in ('grade_10', 'grade_11', 'grade_12', 'graduate')),
  target_university text not null
    constraint center_enrollments_target_university_check
      check (
        target_university in (
          'umf_bucharest',
          'umf_brasov',
          'umf_sibiu',
          'umf_cluj',
          'umf_targu_mures',
          'umf_iasi',
          'umf_craiova',
          'umf_constanta',
          'umf_timisoara',
          'other'
        )
      ),
  target_university_other text,
  constraint center_enrollments_target_university_other_length check (
    target_university_other is null
    or char_length(btrim(target_university_other)) between 2 and 160
  ),
  constraint center_enrollments_target_university_other_consistent check (
    (target_university = 'other' and target_university_other is not null)
    or (target_university <> 'other' and target_university_other is null)
  ),

  previous_tutoring boolean not null,
  subjects text[] not null,
  delivery_mode text not null
    constraint center_enrollments_delivery_mode_check
      check (delivery_mode in ('in_person', 'online')),
  biology_level text,
  chemistry_level text,
  whatsapp_opt_in boolean not null,
  preparation_types text[] not null,
  constraint center_enrollments_subjects_check check (
    cardinality(subjects) between 1 and 3
    and subjects <@ array[
      'biology_corint',
      'biology_barrons',
      'organic_chemistry'
    ]::text[]
  ),
  constraint center_enrollments_preparation_types_check check (
    cardinality(preparation_types) between 1 and 2
    and preparation_types <@ array['courses', 'special_modules']::text[]
  ),
  constraint center_enrollments_biology_level_check check (
    biology_level is null
    or biology_level in ('beginner', 'intermediate', 'advanced', 'mastery')
  ),
  constraint center_enrollments_chemistry_level_check check (
    chemistry_level is null
    or chemistry_level in ('beginner', 'intermediate', 'advanced', 'mastery')
  ),
  constraint center_enrollments_subject_levels_consistent check (
    (
      ('biology_corint' = any(subjects) or 'biology_barrons' = any(subjects))
      and biology_level is not null
    )
    or (
      not ('biology_corint' = any(subjects))
      and not ('biology_barrons' = any(subjects))
      and biology_level is null
    )
  ),
  constraint center_enrollments_chemistry_level_consistent check (
    ('organic_chemistry' = any(subjects) and chemistry_level is not null)
    or (not ('organic_chemistry' = any(subjects)) and chemistry_level is null)
  ),

  privacy_policy_version text not null,
  privacy_accepted_at timestamptz not null,
  newsletter_opt_in boolean not null default false,
  newsletter_consent_version text,
  newsletter_consent_at timestamptz,
  account_creation_requested boolean not null default false,
  account_creation_requested_at timestamptz,
  account_created_at timestamptz,
  constraint center_enrollments_newsletter_consent_consistent check (
    (
      newsletter_opt_in
      and newsletter_consent_version is not null
      and newsletter_consent_at is not null
    )
    or (
      not newsletter_opt_in
      and newsletter_consent_version is null
      and newsletter_consent_at is null
    )
  ),
  constraint center_enrollments_account_intent_consistent check (
    (account_creation_requested and account_creation_requested_at is not null)
    or (
      not account_creation_requested
      and account_creation_requested_at is null
      and account_created_at is null
    )
  ),

  status text not null default 'new'
    constraint center_enrollments_status_check
      check (
        status in (
          'new',
          'contacted',
          'qualified',
          'enrolled',
          'not_interested',
          'duplicate',
          'archived'
        )
      ),
  admin_notes text
    constraint center_enrollments_admin_notes_length
      check (admin_notes is null or char_length(admin_notes) <= 5000),
  assigned_to uuid references auth.users(id) on delete set null,
  next_follow_up_at timestamptz,
  source text not null default 'website'
    constraint center_enrollments_source_check
      check (source in ('website', 'admin', 'import')),
  source_context text not null default 'direct'
    constraint center_enrollments_source_context_length
      check (char_length(btrim(source_context)) between 1 and 120),
  context jsonb not null default '{}'::jsonb
    constraint center_enrollments_context_object check (
      jsonb_typeof(context) = 'object'
      and pg_column_size(context) <= 4096
    ),
  confirmation_email_sent_at timestamptz,
  staff_email_sent_at timestamptz,
  email_last_error text
    constraint center_enrollments_email_last_error_length
      check (email_last_error is null or char_length(email_last_error) <= 160),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp()
);

create index center_enrollments_created_idx
  on public.center_enrollments (created_at desc, id desc);

create index center_enrollments_status_created_idx
  on public.center_enrollments (status, created_at desc, id desc);

create index center_enrollments_email_created_idx
  on public.center_enrollments (normalized_email, created_at desc, id desc);

create index center_enrollments_user_idx
  on public.center_enrollments (user_id, created_at desc)
  where user_id is not null;

create index center_enrollments_assigned_follow_up_idx
  on public.center_enrollments (assigned_to, next_follow_up_at, id)
  where assigned_to is not null and next_follow_up_at is not null;

create trigger set_center_enrollments_updated_at
before update on public.center_enrollments
for each row execute function private.set_updated_at();

create table private.center_enrollment_notification_outbox (
  id uuid primary key default gen_random_uuid(),
  enrollment_id bigint not null
    references public.center_enrollments(id) on delete cascade,
  notification_type text not null
    constraint center_enrollment_outbox_type_check
      check (
        notification_type in (
          'center_enrollment_confirmation',
          'center_enrollment_staff_alert'
        )
      ),
  recipient_kind text not null
    constraint center_enrollment_outbox_recipient_kind_check
      check (recipient_kind in ('applicant', 'staff')),
  recipient_email text,
  payload jsonb not null
    constraint center_enrollment_outbox_payload_object check (
      jsonb_typeof(payload) = 'object' and pg_column_size(payload) <= 32768
    ),
  idempotency_key text not null unique,
  state text not null default 'pending'
    constraint center_enrollment_outbox_state_check
      check (
        state in (
          'pending',
          'sending',
          'sent',
          'failed',
          'pending_configuration'
        )
      ),
  attempt_count smallint not null default 0
    constraint center_enrollment_outbox_attempt_count_check
      check (attempt_count between 0 and 10),
  next_attempt_at timestamptz not null default statement_timestamp(),
  claim_token uuid,
  claimed_at timestamptz,
  provider_message_id text,
  last_error_code text,
  sent_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint center_enrollment_outbox_recipient_consistent check (
    (
      recipient_kind = 'applicant'
      and recipient_email is not null
      and char_length(btrim(recipient_email)) between 5 and 320
    )
    or (recipient_kind = 'staff' and recipient_email is null)
  ),
  constraint center_enrollment_outbox_claim_consistent check (
    (state = 'sending' and claim_token is not null and claimed_at is not null)
    or (state <> 'sending' and claim_token is null and claimed_at is null)
  ),
  constraint center_enrollment_outbox_sent_consistent check (
    (state = 'sent' and sent_at is not null and provider_message_id is not null)
    or (state <> 'sent' and sent_at is null)
  ),
  unique (enrollment_id, notification_type)
);

create index center_enrollment_outbox_dispatch_idx
  on private.center_enrollment_notification_outbox (
    state,
    next_attempt_at,
    created_at,
    id
  )
  where state in ('pending', 'failed', 'pending_configuration');

create index center_enrollment_outbox_enrollment_idx
  on private.center_enrollment_notification_outbox (enrollment_id, created_at, id);

create trigger set_center_enrollment_notification_outbox_updated_at
before update on private.center_enrollment_notification_outbox
for each row execute function private.set_updated_at();

create or replace function private.center_enrollment_payload(
  enrollment public.center_enrollments
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  select jsonb_build_object(
    'publicId', enrollment.public_id,
    'participantStatus', enrollment.participant_status,
    'fullName', enrollment.full_name,
    'birthDate', enrollment.birth_date,
    'localityCounty', enrollment.locality_county,
    'phone', enrollment.phone,
    'email', enrollment.normalized_email,
    'highSchool', enrollment.high_school,
    'studyProfile', enrollment.study_profile,
    'guardianName', enrollment.guardian_name,
    'guardianPhone', enrollment.guardian_phone,
    'guardianEmail', enrollment.guardian_email,
    'examYear', enrollment.exam_year,
    'currentGrade', enrollment.current_grade,
    'targetUniversity', enrollment.target_university,
    'targetUniversityOther', enrollment.target_university_other,
    'previousTutoring', enrollment.previous_tutoring,
    'subjects', to_jsonb(enrollment.subjects),
    'deliveryMode', enrollment.delivery_mode,
    'biologyLevel', enrollment.biology_level,
    'chemistryLevel', enrollment.chemistry_level,
    'whatsappOptIn', enrollment.whatsapp_opt_in,
    'preparationTypes', to_jsonb(enrollment.preparation_types),
    'sourceContext', enrollment.source_context,
    'createdAt', enrollment.created_at
  )
$function$;

create or replace function public.submit_center_enrollment(
  p_idempotency_key uuid,
  p_participant_status text,
  p_full_name text,
  p_birth_date date,
  p_locality_county text,
  p_phone text,
  p_email text,
  p_high_school text,
  p_study_profile text,
  p_guardian_name text,
  p_guardian_phone text,
  p_guardian_email text,
  p_exam_year smallint,
  p_current_grade text,
  p_target_university text,
  p_target_university_other text,
  p_previous_tutoring boolean,
  p_subjects text[],
  p_delivery_mode text,
  p_biology_level text,
  p_chemistry_level text,
  p_whatsapp_opt_in boolean,
  p_preparation_types text[],
  p_privacy_accepted boolean,
  p_source_context text,
  p_context jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  existing_enrollment public.center_enrollments%rowtype;
  enrollment public.center_enrollments%rowtype;
  normalized_participant_status text := lower(btrim(coalesce(p_participant_status, '')));
  normalized_name text := btrim(coalesce(p_full_name, ''));
  normalized_locality text := btrim(coalesce(p_locality_county, ''));
  normalized_phone text := btrim(coalesce(p_phone, ''));
  normalized_email_value text := lower(btrim(coalesce(p_email, '')));
  normalized_school text := btrim(coalesce(p_high_school, ''));
  normalized_profile text := btrim(coalesce(p_study_profile, ''));
  normalized_guardian_name text := nullif(btrim(coalesce(p_guardian_name, '')), '');
  normalized_guardian_phone text := nullif(btrim(coalesce(p_guardian_phone, '')), '');
  normalized_guardian_email text := nullif(lower(btrim(coalesce(p_guardian_email, ''))), '');
  normalized_grade text := lower(btrim(coalesce(p_current_grade, '')));
  normalized_university text := lower(btrim(coalesce(p_target_university, '')));
  normalized_university_other text := nullif(btrim(coalesce(p_target_university_other, '')), '');
  normalized_delivery_mode text := lower(btrim(coalesce(p_delivery_mode, '')));
  normalized_biology_level text := nullif(lower(btrim(coalesce(p_biology_level, ''))), '');
  normalized_chemistry_level text := nullif(lower(btrim(coalesce(p_chemistry_level, ''))), '');
  normalized_source_context text := btrim(coalesce(p_source_context, 'direct'));
  normalized_subjects text[];
  normalized_preparation_types text[];
  normalized_context jsonb := coalesce(p_context, '{}'::jsonb);
  is_minor_by_birth_date boolean;
  recent_email_submissions integer;
begin
  if p_idempotency_key is null then
    raise exception 'INVALID_IDEMPOTENCY_KEY' using errcode = '22023';
  end if;

  select item_array.normalized_values
  into normalized_subjects
  from (
    select coalesce(
      array_agg(distinct lower(btrim(item)) order by lower(btrim(item))),
      '{}'::text[]
    ) as normalized_values
    from unnest(coalesce(p_subjects, '{}'::text[])) as subject(item)
    where btrim(item) <> ''
  ) as item_array;

  select item_array.normalized_values
  into normalized_preparation_types
  from (
    select coalesce(
      array_agg(distinct lower(btrim(item)) order by lower(btrim(item))),
      '{}'::text[]
    ) as normalized_values
    from unnest(coalesce(p_preparation_types, '{}'::text[])) as preparation(item)
    where btrim(item) <> ''
  ) as item_array;

  select candidate.*
  into existing_enrollment
  from public.center_enrollments as candidate
  where candidate.idempotency_key = p_idempotency_key
  for update;

  if found then
    return jsonb_build_object(
      'accepted', true,
      'expiresAt', existing_enrollment.follow_up_expires_at,
      'followUpToken', existing_enrollment.follow_up_token,
      'outcome', 'received'
    );
  end if;

  if normalized_participant_status not in ('adult', 'minor') then
    raise exception 'INVALID_PARTICIPANT_STATUS' using errcode = '22023';
  end if;
  if char_length(normalized_name) not between 2 and 100 then
    raise exception 'INVALID_NAME' using errcode = '22023';
  end if;
  if p_birth_date is null
    or p_birth_date < date '1900-01-01'
    or p_birth_date > current_date
  then
    raise exception 'INVALID_BIRTH_DATE' using errcode = '22023';
  end if;

  is_minor_by_birth_date := p_birth_date > (current_date - interval '18 years')::date;
  if (normalized_participant_status = 'minor') <> is_minor_by_birth_date then
    raise exception 'PARTICIPANT_STATUS_MISMATCH' using errcode = '22023';
  end if;

  if char_length(normalized_locality) not between 2 and 160 then
    raise exception 'INVALID_LOCALITY' using errcode = '22023';
  end if;
  if char_length(normalized_phone) not between 7 and 32 then
    raise exception 'INVALID_PHONE' using errcode = '22023';
  end if;
  if char_length(normalized_email_value) not between 5 and 320
    or normalized_email_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  then
    raise exception 'INVALID_EMAIL' using errcode = '22023';
  end if;
  if char_length(normalized_school) not between 2 and 160 then
    raise exception 'INVALID_HIGH_SCHOOL' using errcode = '22023';
  end if;
  if char_length(normalized_profile) not between 2 and 120 then
    raise exception 'INVALID_STUDY_PROFILE' using errcode = '22023';
  end if;

  if normalized_participant_status = 'minor' then
    if normalized_guardian_name is null
      or char_length(normalized_guardian_name) not between 2 and 120
      or normalized_guardian_phone is null
      or char_length(normalized_guardian_phone) not between 7 and 32
      or normalized_guardian_email is null
      or char_length(normalized_guardian_email) not between 5 and 320
      or normalized_guardian_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    then
      raise exception 'GUARDIAN_REQUIRED' using errcode = '22023';
    end if;
  else
    normalized_guardian_name := null;
    normalized_guardian_phone := null;
    normalized_guardian_email := null;
  end if;

  if p_exam_year is null
    or p_exam_year < extract(year from current_date)::integer
    or p_exam_year > extract(year from current_date)::integer + 8
  then
    raise exception 'INVALID_EXAM_YEAR' using errcode = '22023';
  end if;
  if normalized_grade not in ('grade_10', 'grade_11', 'grade_12', 'graduate') then
    raise exception 'INVALID_CURRENT_GRADE' using errcode = '22023';
  end if;
  if normalized_university not in (
    'umf_bucharest',
    'umf_brasov',
    'umf_sibiu',
    'umf_cluj',
    'umf_targu_mures',
    'umf_iasi',
    'umf_craiova',
    'umf_constanta',
    'umf_timisoara',
    'other'
  ) then
    raise exception 'INVALID_TARGET_UNIVERSITY' using errcode = '22023';
  end if;
  if normalized_university = 'other' then
    if normalized_university_other is null
      or char_length(normalized_university_other) not between 2 and 160
    then
      raise exception 'TARGET_UNIVERSITY_REQUIRED' using errcode = '22023';
    end if;
  else
    normalized_university_other := null;
  end if;

  if p_previous_tutoring is null or p_whatsapp_opt_in is null then
    raise exception 'INVALID_BOOLEAN_CHOICE' using errcode = '22023';
  end if;
  if cardinality(normalized_subjects) not between 1 and 3
    or not (
      normalized_subjects <@ array[
        'biology_corint',
        'biology_barrons',
        'organic_chemistry'
      ]::text[]
    )
  then
    raise exception 'INVALID_SUBJECTS' using errcode = '22023';
  end if;
  if cardinality(normalized_preparation_types) not between 1 and 2
    or not (
      normalized_preparation_types <@ array['courses', 'special_modules']::text[]
    )
  then
    raise exception 'INVALID_PREPARATION_TYPE' using errcode = '22023';
  end if;
  if normalized_delivery_mode not in ('in_person', 'online') then
    raise exception 'INVALID_DELIVERY_MODE' using errcode = '22023';
  end if;

  if 'biology_corint' = any(normalized_subjects)
    or 'biology_barrons' = any(normalized_subjects)
  then
    if normalized_biology_level is null
      or normalized_biology_level not in ('beginner', 'intermediate', 'advanced', 'mastery')
    then
      raise exception 'BIOLOGY_LEVEL_REQUIRED' using errcode = '22023';
    end if;
  else
    normalized_biology_level := null;
  end if;

  if 'organic_chemistry' = any(normalized_subjects) then
    if normalized_chemistry_level is null
      or normalized_chemistry_level not in ('beginner', 'intermediate', 'advanced', 'mastery')
    then
      raise exception 'CHEMISTRY_LEVEL_REQUIRED' using errcode = '22023';
    end if;
  else
    normalized_chemistry_level := null;
  end if;

  if p_privacy_accepted is not true then
    raise exception 'PRIVACY_REQUIRED' using errcode = '22023';
  end if;
  if char_length(normalized_source_context) not between 1 and 120 then
    raise exception 'INVALID_SOURCE_CONTEXT' using errcode = '22023';
  end if;
  if jsonb_typeof(normalized_context) <> 'object'
    or pg_column_size(normalized_context) > 4096
  then
    raise exception 'INVALID_CONTEXT' using errcode = '22023';
  end if;

  -- Serialise submissions for the same email so parallel requests cannot race
  -- through the daily abuse limit.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('center-enrollment:' || normalized_email_value, 0)
  );

  select count(*)::integer
  into recent_email_submissions
  from public.center_enrollments as recent
  where recent.normalized_email = normalized_email_value
    and recent.created_at >= statement_timestamp() - interval '24 hours';

  if recent_email_submissions >= 3 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;

  insert into public.center_enrollments (
    idempotency_key,
    user_id,
    participant_status,
    full_name,
    birth_date,
    locality_county,
    phone,
    email,
    high_school,
    study_profile,
    guardian_name,
    guardian_phone,
    guardian_email,
    exam_year,
    current_grade,
    target_university,
    target_university_other,
    previous_tutoring,
    subjects,
    delivery_mode,
    biology_level,
    chemistry_level,
    whatsapp_opt_in,
    preparation_types,
    privacy_policy_version,
    privacy_accepted_at,
    source,
    source_context,
    context
  )
  values (
    p_idempotency_key,
    auth.uid(),
    normalized_participant_status,
    normalized_name,
    p_birth_date,
    normalized_locality,
    normalized_phone,
    normalized_email_value,
    normalized_school,
    normalized_profile,
    normalized_guardian_name,
    normalized_guardian_phone,
    normalized_guardian_email,
    p_exam_year,
    normalized_grade,
    normalized_university,
    normalized_university_other,
    p_previous_tutoring,
    normalized_subjects,
    normalized_delivery_mode,
    normalized_biology_level,
    normalized_chemistry_level,
    p_whatsapp_opt_in,
    normalized_preparation_types,
    '2026-08-02',
    statement_timestamp(),
    'website',
    normalized_source_context,
    normalized_context
  )
  returning * into enrollment;

  insert into private.center_enrollment_notification_outbox (
    enrollment_id,
    notification_type,
    recipient_kind,
    recipient_email,
    payload,
    idempotency_key
  )
  values
    (
      enrollment.id,
      'center_enrollment_confirmation',
      'applicant',
      enrollment.normalized_email,
      private.center_enrollment_payload(enrollment),
      format('center-enrollment:%s:confirmation', enrollment.public_id)
    ),
    (
      enrollment.id,
      'center_enrollment_staff_alert',
      'staff',
      null,
      private.center_enrollment_payload(enrollment),
      format('center-enrollment:%s:staff', enrollment.public_id)
    );

  return jsonb_build_object(
    'accepted', true,
    'expiresAt', enrollment.follow_up_expires_at,
    'followUpToken', enrollment.follow_up_token,
    'outcome', 'received'
  );
end
$function$;

create or replace function public.set_center_enrollment_post_submit_preferences(
  p_follow_up_token uuid,
  p_account_requested boolean,
  p_newsletter_opt_in boolean,
  p_newsletter_consent boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  enrollment public.center_enrollments%rowtype;
  previous_newsletter_opt_in boolean;
begin
  if p_follow_up_token is null
    or p_account_requested is null
    or p_newsletter_opt_in is null
  then
    raise exception 'INVALID_PREFERENCES' using errcode = '22023';
  end if;
  if p_newsletter_opt_in and p_newsletter_consent is not true then
    raise exception 'NEWSLETTER_CONSENT_REQUIRED' using errcode = '22023';
  end if;

  select candidate.*
  into enrollment
  from public.center_enrollments as candidate
  where candidate.follow_up_token = p_follow_up_token
  for update;

  if not found or enrollment.follow_up_expires_at <= statement_timestamp() then
    raise exception 'FOLLOW_UP_EXPIRED' using errcode = 'P0002';
  end if;

  previous_newsletter_opt_in := enrollment.newsletter_opt_in;

  update public.center_enrollments
  set
    user_id = coalesce(auth.uid(), user_id),
    account_creation_requested = account_creation_requested or p_account_requested,
    account_creation_requested_at = case
      when account_creation_requested or p_account_requested
        then coalesce(account_creation_requested_at, statement_timestamp())
      else null
    end,
    newsletter_opt_in = p_newsletter_opt_in,
    newsletter_consent_version = case
      when p_newsletter_opt_in then '2026-08-02' else null
    end,
    newsletter_consent_at = case
      when p_newsletter_opt_in
        then coalesce(newsletter_consent_at, statement_timestamp())
      else null
    end
  where id = enrollment.id;

  if p_newsletter_opt_in then
    insert into public.newsletter_subscribers (
      user_id,
      email,
      status,
      source,
      confirmed_at,
      unsubscribed_at
    )
    values (
      auth.uid(),
      enrollment.normalized_email,
      'active',
      'center_enrollment',
      statement_timestamp(),
      null
    )
    on conflict (normalized_email) do update
    set
      user_id = coalesce(
        public.newsletter_subscribers.user_id,
        excluded.user_id
      ),
      status = case
        when public.newsletter_subscribers.status in ('bounced', 'complained')
          then public.newsletter_subscribers.status
        else 'active'
      end,
      confirmed_at = case
        when public.newsletter_subscribers.status in ('bounced', 'complained')
          then public.newsletter_subscribers.confirmed_at
        else coalesce(
          public.newsletter_subscribers.confirmed_at,
          statement_timestamp()
        )
      end,
      unsubscribed_at = case
        when public.newsletter_subscribers.status in ('bounced', 'complained')
          then public.newsletter_subscribers.unsubscribed_at
        else null
      end,
      updated_at = statement_timestamp();

    if not previous_newsletter_opt_in then
      insert into public.consent_events (
        user_id,
        subject_email,
        purpose,
        action,
        policy_version,
        source,
        occurred_at,
        metadata
      )
      values (
        auth.uid(),
        enrollment.normalized_email,
        'newsletter',
        'granted',
        '2026-08-02',
        'center_enrollment',
        statement_timestamp(),
        jsonb_build_object('enrollmentPublicId', enrollment.public_id)
      );
    end if;
  elsif previous_newsletter_opt_in then
    -- A withdrawal applies globally only when this flow created the
    -- subscription. Subscribers acquired through another source keep their
    -- existing status while this enrolment's own consent is still withdrawn.
    update public.newsletter_subscribers
    set
      status = 'unsubscribed',
      unsubscribed_at = statement_timestamp(),
      updated_at = statement_timestamp()
    where normalized_email = enrollment.normalized_email
      and source = 'center_enrollment'
      and status not in ('bounced', 'complained');

    insert into public.consent_events (
      user_id,
      subject_email,
      purpose,
      action,
      policy_version,
      source,
      occurred_at,
      metadata
    )
    values (
      auth.uid(),
      enrollment.normalized_email,
      'newsletter',
      'withdrawn',
      '2026-08-02',
      'center_enrollment',
      statement_timestamp(),
      jsonb_build_object('enrollmentPublicId', enrollment.public_id)
    );
  end if;

  return jsonb_build_object(
    'accepted', true,
    'accountRequested', enrollment.account_creation_requested or p_account_requested,
    'newsletterOptIn', p_newsletter_opt_in
  );
end
$function$;

create or replace function public.prepare_center_enrollment_account(
  p_follow_up_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  enrollment public.center_enrollments%rowtype;
begin
  if p_follow_up_token is null then
    raise exception 'INVALID_FOLLOW_UP_TOKEN' using errcode = '22023';
  end if;

  select candidate.*
  into enrollment
  from public.center_enrollments as candidate
  where candidate.follow_up_token = p_follow_up_token
  for update;

  if not found or enrollment.follow_up_expires_at <= statement_timestamp() then
    raise exception 'FOLLOW_UP_EXPIRED' using errcode = 'P0002';
  end if;

  update public.center_enrollments
  set
    user_id = coalesce(auth.uid(), user_id),
    account_creation_requested = true,
    account_creation_requested_at = coalesce(
      account_creation_requested_at,
      statement_timestamp()
    )
  where id = enrollment.id
  returning * into enrollment;

  if auth.uid() is not null then
    return jsonb_build_object(
      'accepted', true,
      'alreadyAuthenticated', true
    );
  end if;

  return jsonb_build_object(
    'accepted', true,
    'accountLinkKey', enrollment.account_link_key,
    'alreadyAuthenticated', false,
    'city', enrollment.locality_county,
    'currentGrade', enrollment.current_grade,
    'email', enrollment.normalized_email,
    'examYear', enrollment.exam_year,
    'fullName', enrollment.full_name,
    'phone', enrollment.phone,
    'school', enrollment.high_school,
    'subjects', to_jsonb(enrollment.subjects),
    'targetUniversity', enrollment.target_university
  );
end
$function$;

create or replace function public.claim_center_enrollment_notifications(
  p_public_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  enrollment public.center_enrollments%rowtype;
  outbox private.center_enrollment_notification_outbox%rowtype;
  claim_id uuid;
  claimed jsonb := '[]'::jsonb;
begin
  select candidate.*
  into enrollment
  from public.center_enrollments as candidate
  where candidate.public_id = p_public_id;

  if not found then
    raise exception 'ENROLLMENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  for outbox in
    select queued.*
    from private.center_enrollment_notification_outbox as queued
    where queued.enrollment_id = enrollment.id
      and queued.attempt_count < 5
      and (
        (
          queued.state in ('pending', 'failed', 'pending_configuration')
          and queued.next_attempt_at <= statement_timestamp()
        )
        or (
          queued.state = 'sending'
          and queued.claimed_at < statement_timestamp() - interval '15 minutes'
        )
      )
    order by queued.created_at, queued.id
    for update skip locked
  loop
    claim_id := gen_random_uuid();

    update private.center_enrollment_notification_outbox
    set
      state = 'sending',
      attempt_count = attempt_count + 1,
      claim_token = claim_id,
      claimed_at = statement_timestamp(),
      last_error_code = null
    where id = outbox.id
    returning * into outbox;

    claimed := claimed || jsonb_build_array(
      jsonb_build_object(
        'claimToken', outbox.claim_token,
        'idempotencyKey', outbox.idempotency_key,
        'notificationId', outbox.id,
        'notificationType', outbox.notification_type,
        'payload', outbox.payload,
        'recipientEmail', outbox.recipient_email,
        'recipientKind', outbox.recipient_kind
      )
    );
  end loop;

  return jsonb_build_object('claimed', claimed);
end
$function$;

create or replace function public.complete_center_enrollment_notification(
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
  outbox private.center_enrollment_notification_outbox%rowtype;
begin
  if p_outcome not in ('sent', 'failed', 'pending_configuration') then
    raise exception 'INVALID_NOTIFICATION_OUTCOME' using errcode = '22023';
  end if;

  select queued.*
  into outbox
  from private.center_enrollment_notification_outbox as queued
  join public.center_enrollments as enrollment
    on enrollment.id = queued.enrollment_id
  where queued.id = p_notification_id
    and queued.claim_token = p_claim_token
    and queued.state = 'sending'
  for update of queued;

  if not found then
    return false;
  end if;

  if p_outcome = 'sent'
    and nullif(btrim(coalesce(p_provider_message_id, '')), '') is null
  then
    raise exception 'PROVIDER_MESSAGE_ID_REQUIRED' using errcode = '22023';
  end if;

  update private.center_enrollment_notification_outbox
  set
    state = p_outcome,
    claim_token = null,
    claimed_at = null,
    provider_message_id = case
      when p_outcome = 'sent' then left(btrim(p_provider_message_id), 200)
      else null
    end,
    last_error_code = case
      when p_outcome = 'sent' then null
      else left(coalesce(nullif(btrim(p_error_code), ''), 'unknown'), 160)
    end,
    sent_at = case when p_outcome = 'sent' then statement_timestamp() else null end,
    next_attempt_at = case
      when p_outcome = 'sent' then next_attempt_at
      else statement_timestamp() + interval '15 minutes'
    end
  where id = outbox.id;

  update public.center_enrollments
  set
    confirmation_email_sent_at = case
      when p_outcome = 'sent'
        and outbox.notification_type = 'center_enrollment_confirmation'
      then statement_timestamp()
      else confirmation_email_sent_at
    end,
    staff_email_sent_at = case
      when p_outcome = 'sent'
        and outbox.notification_type = 'center_enrollment_staff_alert'
      then statement_timestamp()
      else staff_email_sent_at
    end,
    email_last_error = case
      when p_outcome = 'sent' then email_last_error
      else left(coalesce(nullif(btrim(p_error_code), ''), 'unknown'), 160)
    end
  where id = outbox.enrollment_id;

  return true;
end
$function$;

create or replace function public.admin_retry_center_enrollment_notifications(
  p_enrollment_id bigint
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not private.is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  update private.center_enrollment_notification_outbox
  set
    state = 'pending',
    attempt_count = 0,
    next_attempt_at = statement_timestamp(),
    claim_token = null,
    claimed_at = null,
    provider_message_id = null,
    last_error_code = null,
    sent_at = null
  where enrollment_id = p_enrollment_id
    and state <> 'sent';

  update public.center_enrollments
  set email_last_error = null
  where id = p_enrollment_id;

  return found;
end
$function$;

create or replace function private.link_center_enrollment_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  link_key_text text := btrim(
    coalesce(new.raw_user_meta_data ->> 'center_enrollment_link_key', '')
  );
begin
  if new.raw_user_meta_data ->> 'signup_source' <> 'center_enrollment'
    or link_key_text !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
    or new.email is null
  then
    return new;
  end if;

  update public.center_enrollments
  set
    user_id = new.id,
    account_creation_requested = true,
    account_creation_requested_at = coalesce(
      account_creation_requested_at,
      statement_timestamp()
    ),
    account_created_at = statement_timestamp()
  where account_link_key = link_key_text::uuid
    and normalized_email = lower(btrim(new.email))
    and account_creation_requested
    and follow_up_expires_at > statement_timestamp();

  return new;
end
$function$;

drop trigger if exists on_auth_user_created_link_center_enrollment on auth.users;
create trigger on_auth_user_created_link_center_enrollment
after insert on auth.users
for each row execute function private.link_center_enrollment_account();

alter table public.center_enrollments enable row level security;

create policy center_enrollments_admin_select
on public.center_enrollments
for select
to authenticated
using ((select private.is_admin()));

create policy center_enrollments_admin_update
on public.center_enrollments
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

revoke all on table public.center_enrollments
  from public, anon, authenticated;
grant select, update on table public.center_enrollments to authenticated;
grant select, insert, update, delete on table public.center_enrollments to service_role;

revoke all on table private.center_enrollment_notification_outbox
  from public, anon, authenticated, service_role;

revoke all on function private.center_enrollment_payload(public.center_enrollments)
  from public, anon, authenticated, service_role;
revoke all on function private.link_center_enrollment_account()
  from public, anon, authenticated, service_role;

revoke all on function public.submit_center_enrollment(
  uuid,
  text,
  text,
  date,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  smallint,
  text,
  text,
  text,
  boolean,
  text[],
  text,
  text,
  text,
  boolean,
  text[],
  boolean,
  text,
  jsonb
) from public, anon, authenticated;
grant execute on function public.submit_center_enrollment(
  uuid,
  text,
  text,
  date,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  smallint,
  text,
  text,
  text,
  boolean,
  text[],
  text,
  text,
  text,
  boolean,
  text[],
  boolean,
  text,
  jsonb
) to anon, authenticated, service_role;

revoke all on function public.set_center_enrollment_post_submit_preferences(
  uuid,
  boolean,
  boolean,
  boolean
) from public, anon, authenticated;
grant execute on function public.set_center_enrollment_post_submit_preferences(
  uuid,
  boolean,
  boolean,
  boolean
) to anon, authenticated, service_role;

revoke all on function public.prepare_center_enrollment_account(uuid)
  from public, anon, authenticated;
grant execute on function public.prepare_center_enrollment_account(uuid)
  to anon, authenticated, service_role;

revoke all on function public.claim_center_enrollment_notifications(uuid)
  from public, anon, authenticated;
grant execute on function public.claim_center_enrollment_notifications(uuid)
  to service_role;

revoke all on function public.complete_center_enrollment_notification(
  uuid,
  uuid,
  text,
  text,
  text
) from public, anon, authenticated;
grant execute on function public.complete_center_enrollment_notification(
  uuid,
  uuid,
  text,
  text,
  text
) to service_role;

revoke all on function public.admin_retry_center_enrollment_notifications(bigint)
  from public, anon, authenticated;
grant execute on function public.admin_retry_center_enrollment_notifications(bigint)
  to authenticated, service_role;

comment on table public.center_enrollments is
  'Centre enrolment applications. PII is admin-only; anonymous and signed-in visitors submit through a narrow idempotent RPC.';
comment on table private.center_enrollment_notification_outbox is
  'Transactional Resend outbox for applicant confirmations and SmartMed staff alerts.';
comment on function public.submit_center_enrollment(
  uuid,
  text,
  text,
  date,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  smallint,
  text,
  text,
  text,
  boolean,
  text[],
  text,
  text,
  text,
  boolean,
  text[],
  boolean,
  text,
  jsonb
) is
  'Public, idempotent centre enrolment command. Returns only a temporary follow-up capability token and no participant PII.';

commit;
