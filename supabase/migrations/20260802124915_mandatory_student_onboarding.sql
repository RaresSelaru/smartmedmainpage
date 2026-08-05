begin;

-- Onboarding remains personalisation data and must never grant access or
-- permissions. It is mandatory only as a product experience for student
-- accounts. Operational administrators are excluded in the application layer.
alter table public.profiles
  add column signup_source text not null default 'account',
  add constraint profiles_signup_source_valid check (
    signup_source in (
      'account',
      'center_enrollment',
      'event_enrollment',
      'oauth'
    )
  );

update public.profiles as profile
set signup_source = 'oauth'
from auth.users as auth_user
where auth_user.id = profile.id
  and auth_user.raw_app_meta_data ->> 'provider' in ('google', 'facebook');

-- The previous optional experience could be snoozed for seven days. Mandatory
-- onboarding deliberately has no persisted dismissal state.
update public.profiles
set onboarding_snoozed_until = null
where onboarding_snoozed_until is not null;

alter table public.profiles
  add constraint profiles_mandatory_onboarding_not_snoozed check (
    onboarding_snoozed_until is null
  );

comment on column public.profiles.signup_source is
  'Validated UX attribution for profile prefill; never use for authorisation.';
comment on column public.profiles.onboarding_status is
  'Mandatory student-profile onboarding lifecycle; never use for authorisation.';
comment on column public.profiles.onboarding_snoozed_until is
  'Legacy compatibility field. Mandatory onboarding requires this value to remain null.';

-- Auth metadata is user-controlled. Every value copied into the profile is
-- therefore constrained to the same allow-lists and length limits as the
-- destination columns. Invalid values are ignored instead of breaking signup.
create or replace function private.handle_new_smartmed_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  metadata_city text;
  metadata_focus_subjects text[] := '{}'::text[];
  metadata_full_name text;
  metadata_phone text;
  metadata_school text;
  metadata_signup_source text;
  metadata_study_stage text;
  metadata_target_exam_plan text;
  metadata_target_exam_year smallint;
  metadata_target_medical_center text;
begin
  metadata_full_name := case
    when char_length(btrim(coalesce(metadata ->> 'full_name', ''))) between 2 and 100
      then btrim(metadata ->> 'full_name')
    else null
  end;
  metadata_phone := case
    when char_length(btrim(coalesce(metadata ->> 'phone', ''))) between 7 and 32
      then btrim(metadata ->> 'phone')
    else null
  end;
  metadata_city := case
    when char_length(btrim(coalesce(metadata ->> 'city', ''))) between 2 and 80
      then btrim(metadata ->> 'city')
    else null
  end;
  metadata_school := case
    when char_length(btrim(coalesce(metadata ->> 'school', ''))) between 2 and 160
      then btrim(metadata ->> 'school')
    else null
  end;
  metadata_signup_source := case
    when metadata ->> 'signup_source' in (
      'account',
      'center_enrollment',
      'event_enrollment',
      'oauth'
    ) then metadata ->> 'signup_source'
    when new.raw_app_meta_data ->> 'provider' in ('google', 'facebook') then 'oauth'
    else 'account'
  end;
  metadata_study_stage := case
    when metadata ->> 'study_stage' in (
      'high_school_9_10',
      'high_school_11',
      'high_school_12',
      'graduate',
      'exploring'
    ) then metadata ->> 'study_stage'
    else null
  end;
  metadata_target_exam_plan := case
    when metadata ->> 'target_exam_plan' in ('scheduled', 'later', 'exploring')
      then metadata ->> 'target_exam_plan'
    else null
  end;
  metadata_target_exam_year := case
    when metadata_target_exam_plan = 'scheduled'
      and coalesce(metadata ->> 'target_exam_year', '') ~ '^[0-9]{4}$'
      and (metadata ->> 'target_exam_year')::integer between 2026 and 2045
      then (metadata ->> 'target_exam_year')::smallint
    else null
  end;

  -- A syntactically valid plan with a missing or invalid year would violate
  -- the profile consistency constraint. Drop that pair as untrusted input so
  -- malformed Auth metadata can never abort identity creation.
  if metadata_target_exam_plan = 'scheduled'
    and metadata_target_exam_year is null then
    metadata_target_exam_plan := null;
  end if;

  metadata_target_medical_center := case
    when metadata ->> 'target_medical_center' in (
      'bucharest',
      'cluj',
      'iasi',
      'timisoara',
      'targu_mures',
      'craiova',
      'other',
      'exploring'
    ) then metadata ->> 'target_medical_center'
    else null
  end;

  if jsonb_typeof(metadata -> 'focus_subjects') = 'array' then
    select coalesce(array_agg(subject.value order by subject.value), '{}'::text[])
    into metadata_focus_subjects
    from (
      select distinct subject_value as value
      from jsonb_array_elements_text(metadata -> 'focus_subjects') as subjects(subject_value)
      where subject_value in ('biology', 'chemistry', 'physics', 'undecided')
      order by subject_value
      limit 3
    ) as subject;

    if 'undecided' = any(metadata_focus_subjects)
      and cardinality(metadata_focus_subjects) > 1 then
      metadata_focus_subjects := array['undecided']::text[];
    end if;
  end if;

  insert into public.profiles (
    id,
    full_name,
    phone,
    city,
    school,
    signup_source,
    study_stage,
    target_exam_plan,
    target_exam_year,
    target_medical_center,
    focus_subjects
  )
  values (
    new.id,
    metadata_full_name,
    metadata_phone,
    metadata_city,
    metadata_school,
    metadata_signup_source,
    metadata_study_stage,
    metadata_target_exam_plan,
    metadata_target_exam_year,
    metadata_target_medical_center,
    metadata_focus_subjects
  )
  on conflict (id) do nothing;

  insert into public.account_roles (user_id, role)
  values (new.id, 'user'::public.smartmed_role)
  on conflict (user_id) do nothing;

  return new;
end
$function$;

revoke all on function private.handle_new_smartmed_user()
from public, anon, authenticated;

commit;
