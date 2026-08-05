-- Registration backend hardening.
--
-- * Public form commands are service-role only. Browser sessions can no longer
--   bypass the application boundary by calling PostgREST directly.
-- * Authenticated ownership is linked only when the verified Auth email equals
--   the submitted email.
-- * Waitlist/manual confirmations enqueue a fresh participant notification.
-- * Newsletter consent is tracked per acquisition source and can be withdrawn
--   through an opaque public token.
-- * Existing accounts can safely claim a centre enrolment and receive missing
--   onboarding prefill without overwriting answers they already supplied.

begin;

create or replace function private.registration_user_for_email(
  p_user_id uuid,
  p_email text
)
returns uuid
language sql
stable
security definer
set search_path = ''
as $function$
  select auth_user.id
  from auth.users as auth_user
  where auth_user.id = p_user_id
    and auth_user.email is not null
    and lower(btrim(auth_user.email)) = lower(btrim(coalesce(p_email, '')))
  limit 1
$function$;

revoke all on function private.registration_user_for_email(uuid, text)
  from public, anon, authenticated, service_role;

create or replace function public.submit_center_enrollment_server(
  p_authenticated_user_id uuid,
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
  effective_user_id uuid := private.registration_user_for_email(
    p_authenticated_user_id,
    p_email
  );
  result jsonb;
begin
  result := public.submit_center_enrollment(
    p_idempotency_key,
    p_participant_status,
    p_full_name,
    p_birth_date,
    p_locality_county,
    p_phone,
    p_email,
    p_high_school,
    p_study_profile,
    p_guardian_name,
    p_guardian_phone,
    p_guardian_email,
    p_exam_year,
    p_current_grade,
    p_target_university,
    p_target_university_other,
    p_previous_tutoring,
    p_subjects,
    p_delivery_mode,
    p_biology_level,
    p_chemistry_level,
    p_whatsapp_opt_in,
    p_preparation_types,
    p_privacy_accepted,
    p_source_context,
    p_context
  );

  if effective_user_id is not null then
    update public.center_enrollments
    set user_id = effective_user_id
    where idempotency_key = p_idempotency_key
      and normalized_email = lower(btrim(p_email));
  end if;

  return result;
end
$function$;

revoke all on function public.submit_center_enrollment_server(
  uuid, uuid, text, text, date, text, text, text, text, text, text, text,
  text, smallint, text, text, text, boolean, text[], text, text, text,
  boolean, text[], boolean, text, jsonb
) from public, anon, authenticated, service_role;
grant execute on function public.submit_center_enrollment_server(
  uuid, uuid, text, text, date, text, text, text, text, text, text, text,
  text, smallint, text, text, text, boolean, text[], text, text, text,
  boolean, text[], boolean, text, jsonb
) to service_role;

create or replace function public.register_for_event_server(
  p_authenticated_user_id uuid,
  p_event_id bigint,
  p_full_name text,
  p_email text,
  p_phone text default null,
  p_privacy_accepted boolean default false,
  p_marketing_opt_in boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  effective_user_id uuid := private.registration_user_for_email(
    p_authenticated_user_id,
    p_email
  );
  result jsonb;
begin
  result := public.register_for_event(
    p_event_id,
    p_full_name,
    p_email,
    p_phone,
    p_privacy_accepted,
    p_marketing_opt_in
  );

  if effective_user_id is not null then
    update public.event_registrations
    set user_id = effective_user_id
    where event_id = p_event_id
      and normalized_email = lower(btrim(p_email));

    if p_marketing_opt_in then
      update public.newsletter_subscribers
      set user_id = coalesce(user_id, effective_user_id)
      where normalized_email = lower(btrim(p_email));
    end if;
  end if;

  return result;
end
$function$;

revoke all on function public.register_for_event_server(
  uuid, bigint, text, text, text, boolean, boolean
) from public, anon, authenticated, service_role;
grant execute on function public.register_for_event_server(
  uuid, bigint, text, text, text, boolean, boolean
) to service_role;

-- The old browser-callable commands remain as implementation details for the
-- trusted wrappers above, but no Data API role can invoke them directly.
revoke all on function public.submit_center_enrollment(
  uuid, text, text, date, text, text, text, text, text, text, text, text,
  smallint, text, text, text, boolean, text[], text, text, text, boolean,
  text[], boolean, text, jsonb
) from public, anon, authenticated, service_role;
revoke all on function public.register_for_event(
  bigint, text, text, text, boolean, boolean
) from public, anon, authenticated, service_role;

-- Queue a new participant confirmation when a waitlisted/cancelled registration
-- becomes confirmed outside the normal public re-registration transaction. The
-- public transaction already rotates notification_batch_id itself, which keeps
-- this trigger from producing a duplicate message there.
create or replace function private.enqueue_event_status_confirmation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  event_record public.registration_events%rowtype;
  registration_record public.event_registrations%rowtype;
  next_batch_id uuid := gen_random_uuid();
begin
  if new.status <> 'confirmed'
    or old.status = 'confirmed'
    or old.notification_batch_id is distinct from new.notification_batch_id
  then
    return new;
  end if;

  update public.event_registrations
  set
    notification_batch_id = next_batch_id,
    confirmation_email_sent_at = null,
    email_last_error = null
  where id = new.id
  returning * into registration_record;

  select candidate.*
  into event_record
  from public.registration_events as candidate
  where candidate.id = registration_record.event_id;

  if not found then
    return new;
  end if;

  insert into private.event_registration_notification_outbox (
    registration_id,
    batch_id,
    notification_type,
    recipient_kind,
    recipient_email,
    payload,
    idempotency_key
  )
  values (
    registration_record.id,
    registration_record.notification_batch_id,
    'event_registration_confirmation',
    'participant',
    registration_record.normalized_email,
    private.event_registration_payload(registration_record, event_record),
    format(
      'event-registration:%s:%s:confirmation',
      registration_record.id,
      registration_record.notification_batch_id
    )
  );

  return new;
end
$function$;

drop trigger if exists enqueue_event_status_confirmation
  on public.event_registrations;
create trigger enqueue_event_status_confirmation
after update of status on public.event_registrations
for each row
when (old.status is distinct from new.status)
execute function private.enqueue_event_status_confirmation();

revoke all on function private.enqueue_event_status_confirmation()
  from public, anon, authenticated, service_role;

-- Consent must be source-aware. A withdrawal from one flow must not invalidate
-- a still-active consent acquired through another flow.
create table public.newsletter_consent_sources (
  subscriber_id bigint not null
    references public.newsletter_subscribers(id) on delete cascade,
  source text not null
    constraint newsletter_consent_sources_source_length
      check (char_length(btrim(source)) between 1 and 80),
  status text not null
    constraint newsletter_consent_sources_status_valid
      check (status in ('granted', 'withdrawn')),
  granted_at timestamptz,
  withdrawn_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
    constraint newsletter_consent_sources_metadata_object
      check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  primary key (subscriber_id, source),
  constraint newsletter_consent_sources_timestamps_consistent check (
    (status = 'granted' and granted_at is not null and withdrawn_at is null)
    or (status = 'withdrawn' and withdrawn_at is not null)
  )
);

create index newsletter_consent_sources_active_idx
  on public.newsletter_consent_sources (subscriber_id)
  where status = 'granted';

create trigger set_newsletter_consent_sources_updated_at
before update on public.newsletter_consent_sources
for each row execute function private.set_updated_at();

alter table public.newsletter_subscribers
  add column unsubscribe_token uuid not null default gen_random_uuid();
create unique index newsletter_subscribers_unsubscribe_token_uidx
  on public.newsletter_subscribers (unsubscribe_token);

insert into public.newsletter_consent_sources (
  subscriber_id,
  source,
  status,
  granted_at,
  withdrawn_at,
  metadata
)
select
  subscriber.id,
  left(coalesce(nullif(btrim(subscriber.source), ''), 'legacy'), 80),
  case when subscriber.status = 'active' then 'granted' else 'withdrawn' end,
  case
    when subscriber.status = 'active'
      then coalesce(subscriber.confirmed_at, subscriber.created_at)
    else null
  end,
  case
    when subscriber.status = 'active' then null
    else coalesce(subscriber.unsubscribed_at, subscriber.updated_at)
  end,
  jsonb_build_object('backfilled', true)
from public.newsletter_subscribers as subscriber
where subscriber.status not in ('bounced', 'complained')
on conflict (subscriber_id, source) do nothing;

create or replace function private.set_newsletter_source_consent(
  p_user_id uuid,
  p_email text,
  p_source text,
  p_granted boolean,
  p_policy_version text,
  p_metadata jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  normalized_email_value text := lower(btrim(coalesce(p_email, '')));
  normalized_source text := btrim(coalesce(p_source, ''));
  subscriber public.newsletter_subscribers%rowtype;
  previous_status text;
  has_active_source boolean;
begin
  if char_length(normalized_email_value) not between 5 and 320
    or normalized_email_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  then
    raise exception 'INVALID_EMAIL' using errcode = '22023';
  end if;
  if char_length(normalized_source) not between 1 and 80
    or p_granted is null
    or char_length(btrim(coalesce(p_policy_version, ''))) not between 1 and 80
    or jsonb_typeof(coalesce(p_metadata, '{}'::jsonb)) <> 'object'
  then
    raise exception 'INVALID_NEWSLETTER_CONSENT' using errcode = '22023';
  end if;

  insert into public.newsletter_subscribers (
    user_id,
    email,
    status,
    source,
    confirmed_at,
    unsubscribed_at
  )
  values (
    p_user_id,
    normalized_email_value,
    case when p_granted then 'active' else 'unsubscribed' end,
    normalized_source,
    case when p_granted then statement_timestamp() else null end,
    case when p_granted then null else statement_timestamp() end
  )
  on conflict (normalized_email) do update
  set user_id = coalesce(
        public.newsletter_subscribers.user_id,
        excluded.user_id
      )
  returning * into subscriber;

  select source_consent.status
  into previous_status
  from public.newsletter_consent_sources as source_consent
  where source_consent.subscriber_id = subscriber.id
    and source_consent.source = normalized_source;

  insert into public.newsletter_consent_sources (
    subscriber_id,
    source,
    status,
    granted_at,
    withdrawn_at,
    metadata
  )
  values (
    subscriber.id,
    normalized_source,
    case when p_granted then 'granted' else 'withdrawn' end,
    case when p_granted then statement_timestamp() else null end,
    case when p_granted then null else statement_timestamp() end,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (subscriber_id, source) do update
  set
    status = excluded.status,
    granted_at = case
      when excluded.status = 'granted' then statement_timestamp()
      else public.newsletter_consent_sources.granted_at
    end,
    withdrawn_at = case
      when excluded.status = 'withdrawn' then statement_timestamp()
      else null
    end,
    metadata = excluded.metadata;

  select exists (
    select 1
    from public.newsletter_consent_sources as active_source
    where active_source.subscriber_id = subscriber.id
      and active_source.status = 'granted'
  ) into has_active_source;

  update public.newsletter_subscribers
  set
    status = case
      when status in ('bounced', 'complained') then status
      when has_active_source then 'active'
      else 'unsubscribed'
    end,
    confirmed_at = case
      when status in ('bounced', 'complained') then confirmed_at
      when has_active_source then coalesce(confirmed_at, statement_timestamp())
      else confirmed_at
    end,
    unsubscribed_at = case
      when status in ('bounced', 'complained') then unsubscribed_at
      when has_active_source then null
      else statement_timestamp()
    end,
    updated_at = statement_timestamp()
  where id = subscriber.id;

  if previous_status is distinct from (
    case when p_granted then 'granted' else 'withdrawn' end
  ) then
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
      p_user_id,
      normalized_email_value,
      'newsletter',
      case when p_granted then 'granted' else 'withdrawn' end,
      btrim(p_policy_version),
      normalized_source,
      statement_timestamp(),
      coalesce(p_metadata, '{}'::jsonb)
    );
  end if;

  return subscriber.id;
end
$function$;

revoke all on function private.set_newsletter_source_consent(
  uuid, text, text, boolean, text, jsonb
) from public, anon, authenticated, service_role;

create or replace function private.record_registration_newsletter_consent(
  p_user_id uuid,
  p_email text,
  p_metadata jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform private.set_newsletter_source_consent(
    p_user_id,
    p_email,
    'event_registration',
    true,
    '2026-08-02',
    p_metadata
  );
end
$function$;

revoke all on function private.record_registration_newsletter_consent(
  uuid, text, jsonb
) from public, anon, authenticated, service_role;

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

  if previous_newsletter_opt_in is distinct from p_newsletter_opt_in then
    perform private.set_newsletter_source_consent(
      auth.uid(),
      enrollment.normalized_email,
      'center_enrollment',
      p_newsletter_opt_in,
      '2026-08-02',
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

create or replace function public.unsubscribe_newsletter(
  p_unsubscribe_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  subscriber public.newsletter_subscribers%rowtype;
  active_sources text[];
begin
  if p_unsubscribe_token is null then
    return jsonb_build_object('accepted', true);
  end if;

  select candidate.*
  into subscriber
  from public.newsletter_subscribers as candidate
  where candidate.unsubscribe_token = p_unsubscribe_token
  for update;

  if not found then
    return jsonb_build_object('accepted', true);
  end if;

  select coalesce(array_agg(source_consent.source order by source_consent.source), '{}'::text[])
  into active_sources
  from public.newsletter_consent_sources as source_consent
  where source_consent.subscriber_id = subscriber.id
    and source_consent.status = 'granted';

  update public.newsletter_consent_sources
  set
    status = 'withdrawn',
    withdrawn_at = statement_timestamp()
  where subscriber_id = subscriber.id
    and status = 'granted';

  update public.newsletter_subscribers
  set
    status = case
      when status in ('bounced', 'complained') then status
      else 'unsubscribed'
    end,
    unsubscribed_at = case
      when status in ('bounced', 'complained') then unsubscribed_at
      else statement_timestamp()
    end,
    updated_at = statement_timestamp()
  where id = subscriber.id;

  if cardinality(active_sources) > 0 then
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
      subscriber.user_id,
      subscriber.normalized_email,
      'newsletter',
      'withdrawn',
      '2026-08-02',
      'unsubscribe_link',
      statement_timestamp(),
      jsonb_build_object('withdrawnSources', to_jsonb(active_sources))
    );
  end if;

  return jsonb_build_object('accepted', true);
end
$function$;

revoke all on function public.unsubscribe_newsletter(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.unsubscribe_newsletter(uuid)
  to anon, authenticated, service_role;

alter table public.newsletter_consent_sources enable row level security;
revoke all on table public.newsletter_consent_sources
  from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.newsletter_consent_sources
  to service_role;

-- Existing-account claim used after login/callback. The opaque follow-up token
-- is necessary but not sufficient: Auth email equality is mandatory.
create or replace function public.link_center_enrollment_to_current_account(
  p_follow_up_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := auth.uid();
  current_email text;
  enrollment public.center_enrollments%rowtype;
  mapped_study_stage text;
  mapped_medical_center text;
  mapped_focus_subjects text[] := '{}'::text[];
  profile_prefilled boolean := false;
begin
  if current_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  select lower(btrim(auth_user.email))
  into current_email
  from auth.users as auth_user
  where auth_user.id = current_user_id
    and auth_user.email is not null;

  if current_email is null then
    raise exception 'VERIFIED_EMAIL_REQUIRED' using errcode = '42501';
  end if;

  select candidate.*
  into enrollment
  from public.center_enrollments as candidate
  where candidate.follow_up_token = p_follow_up_token
  for update;

  if not found or enrollment.follow_up_expires_at <= statement_timestamp() then
    raise exception 'FOLLOW_UP_EXPIRED' using errcode = 'P0002';
  end if;
  if enrollment.normalized_email <> current_email then
    raise exception 'ENROLLMENT_EMAIL_MISMATCH' using errcode = '42501';
  end if;

  update public.center_enrollments
  set
    user_id = current_user_id,
    account_creation_requested = true,
    account_creation_requested_at = coalesce(
      account_creation_requested_at,
      statement_timestamp()
    ),
    account_created_at = coalesce(account_created_at, statement_timestamp())
  where id = enrollment.id;

  mapped_study_stage := case enrollment.current_grade
    when 'grade_10' then 'high_school_9_10'
    when 'grade_11' then 'high_school_11'
    when 'grade_12' then 'high_school_12'
    else 'graduate'
  end;
  mapped_medical_center := case enrollment.target_university
    when 'umf_bucharest' then 'bucharest'
    when 'umf_cluj' then 'cluj'
    when 'umf_iasi' then 'iasi'
    when 'umf_timisoara' then 'timisoara'
    when 'umf_targu_mures' then 'targu_mures'
    when 'umf_craiova' then 'craiova'
    else 'other'
  end;
  mapped_focus_subjects := array_remove(array[
    case
      when enrollment.subjects && array['biology_corint', 'biology_barrons']::text[]
        then 'biology'
      else null
    end,
    case
      when 'organic_chemistry' = any(enrollment.subjects) then 'chemistry'
      else null
    end
  ]::text[], null);

  update public.profiles
  set
    study_stage = coalesce(study_stage, mapped_study_stage),
    target_exam_plan = case
      when target_exam_plan is null and target_exam_year is null then 'scheduled'
      else target_exam_plan
    end,
    target_exam_year = case
      when target_exam_plan is null and target_exam_year is null
        then enrollment.exam_year
      else target_exam_year
    end,
    target_medical_center = coalesce(target_medical_center, mapped_medical_center),
    focus_subjects = case
      when cardinality(focus_subjects) = 0 then mapped_focus_subjects
      else focus_subjects
    end
  where id = current_user_id
    and (
      study_stage is null
      or (target_exam_plan is null and target_exam_year is null)
      or target_medical_center is null
      or cardinality(focus_subjects) = 0
    );

  profile_prefilled := found;

  return jsonb_build_object(
    'accepted', true,
    'linked', true,
    'profilePrefilled', profile_prefilled
  );
end
$function$;

revoke all on function public.link_center_enrollment_to_current_account(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.link_center_enrollment_to_current_account(uuid)
  to authenticated;

comment on function public.submit_center_enrollment_server(
  uuid, uuid, text, text, date, text, text, text, text, text, text, text,
  text, smallint, text, text, text, boolean, text[], text, text, text,
  boolean, text[], boolean, text, jsonb
) is 'Service-only centre enrolment command. User ownership is accepted only for a matching Auth email.';
comment on function public.register_for_event_server(
  uuid, bigint, text, text, text, boolean, boolean
) is 'Service-only event registration command. User ownership is accepted only for a matching Auth email.';
comment on function public.unsubscribe_newsletter(uuid) is
  'Opaque-token global newsletter unsubscribe command. It intentionally returns the same receipt for valid and invalid tokens.';
comment on function public.link_center_enrollment_to_current_account(uuid) is
  'Authenticated claim of an unexpired centre enrolment with exact Auth email verification and fill-only onboarding prefill.';

commit;
