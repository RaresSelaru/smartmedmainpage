begin;

set local search_path = public, extensions;

select no_plan();

select has_column(
  'public',
  'profiles',
  'study_stage',
  'profiles store the voluntary academic stage'
);
select has_column(
  'public',
  'profiles',
  'focus_subjects',
  'profiles store admission subjects'
);
select has_column(
  'public',
  'profiles',
  'target_exam_year',
  'profiles store the onboarding admission year separately'
);
select has_column(
  'public',
  'profiles',
  'study_challenges',
  'profiles store at most two current challenges'
);
select has_column(
  'public',
  'profiles',
  'onboarding_status',
  'profiles store the mandatory student onboarding lifecycle'
);
select has_column(
  'public',
  'profiles',
  'signup_source',
  'profiles store a validated signup source for onboarding prefill'
);
select has_index(
  'public',
  'profiles',
  'profiles_onboarding_status_updated_idx',
  'onboarding lifecycle has an analytics-friendly index'
);

select ok(
  (
    select relation.relrowsecurity
    from pg_class as relation
    where relation.oid = 'public.profiles'::regclass
  ),
  'profile onboarding remains protected by RLS'
);
select ok(
  not has_table_privilege('anon', 'public.profiles', 'SELECT'),
  'anonymous visitors cannot read profile onboarding answers'
);
select ok(
  has_table_privilege('authenticated', 'public.profiles', 'UPDATE'),
  'authenticated users can update their own profile through RLS'
);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'onboarding-a@example.invalid',
    '',
    statement_timestamp(),
    '{"provider":"google"}'::jsonb,
    '{"full_name":"Student A"}'::jsonb,
    statement_timestamp(),
    statement_timestamp()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'onboarding-b@example.invalid',
    '',
    statement_timestamp(),
    '{"provider":"facebook"}'::jsonb,
    '{"full_name":"Student B"}'::jsonb,
    statement_timestamp(),
    statement_timestamp()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'onboarding-enrollment@example.invalid',
    '',
    statement_timestamp(),
    '{"provider":"email"}'::jsonb,
    '{
      "city":"Brașov",
      "focus_subjects":["biology","chemistry"],
      "full_name":"Student din înscriere",
      "phone":"+40722111222",
      "school":"Colegiul Național",
      "signup_source":"center_enrollment",
      "study_stage":"high_school_11",
      "target_exam_plan":"scheduled",
      "target_exam_year":2028,
      "target_medical_center":"other"
    }'::jsonb,
    statement_timestamp(),
    statement_timestamp()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-4000-8000-000000000004',
    'authenticated',
    'authenticated',
    'onboarding-invalid-metadata@example.invalid',
    '',
    statement_timestamp(),
    '{"provider":"email"}'::jsonb,
    '{
      "city":"x",
      "focus_subjects":["not-a-subject"],
      "full_name":"x",
      "phone":"123",
      "school":"x",
      "signup_source":"admin",
      "study_stage":"not-a-stage",
      "target_exam_plan":"scheduled",
      "target_exam_year":9999,
      "target_medical_center":"not-a-center"
    }'::jsonb,
    statement_timestamp(),
    statement_timestamp()
  );

select results_eq(
  $$
    select onboarding_status, onboarding_step, onboarding_version, signup_source
    from public.profiles
    where id = '20000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('not_started'::text, 0::smallint, 1::smallint, 'oauth'::text) $$,
  'new social identities receive a fresh mandatory onboarding profile'
);

select results_eq(
  $$
    select
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
    from public.profiles
    where id = '20000000-0000-4000-8000-000000000003'
  $$,
  $$
    values (
      'Student din înscriere'::text,
      '+40722111222'::text,
      'Brașov'::text,
      'Colegiul Național'::text,
      'center_enrollment'::text,
      'high_school_11'::text,
      'scheduled'::text,
      2028::smallint,
      'other'::text,
      array['biology', 'chemistry']::text[]
    )
  $$,
  'an account created from enrollment starts with its safe answers prefilled'
);

select results_eq(
  $$
    select
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
    from public.profiles
    where id = '20000000-0000-4000-8000-000000000004'
  $$,
  $$
    values (
      null::text,
      null::text,
      null::text,
      null::text,
      'account'::text,
      null::text,
      null::text,
      null::smallint,
      null::text,
      '{}'::text[]
    )
  $$,
  'malformed user metadata is ignored without aborting account creation'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;

select results_eq(
  $$
    select id
    from public.profiles
    where id in (
      '20000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000002'
    )
    order by id
  $$,
  $$ values ('20000000-0000-4000-8000-000000000001'::uuid) $$,
  'a student sees only their own onboarding answers'
);

select lives_ok(
  $$
    update public.profiles
    set
      study_stage = 'high_school_12',
      onboarding_status = 'in_progress',
      onboarding_step = 2,
      onboarding_started_at = statement_timestamp()
    where id = '20000000-0000-4000-8000-000000000001'
  $$,
  'a student can save and resume their own progress'
);

select results_eq(
  $$
    update public.profiles
    set study_stage = 'graduate'
    where id = '20000000-0000-4000-8000-000000000002'
    returning id
  $$,
  $$ select null::uuid where false $$,
  'a student cannot update another profile'
);

reset role;

select throws_ok(
  $$
    update public.profiles
    set onboarding_snoozed_until = statement_timestamp() + interval '7 days'
    where id = '20000000-0000-4000-8000-000000000002'
  $$,
  '23514',
  null,
  'mandatory onboarding cannot be snoozed before completion'
);

select throws_ok(
  $$
    update public.profiles
    set focus_subjects = array['undecided', 'biology']::text[]
    where id = '20000000-0000-4000-8000-000000000001'
  $$,
  '23514',
  null,
  'the database rejects contradictory subject choices'
);

select throws_ok(
  $$
    update public.profiles
    set
      onboarding_status = 'completed',
      onboarding_step = 6,
      onboarding_completed_at = statement_timestamp()
    where id = '20000000-0000-4000-8000-000000000001'
  $$,
  '23514',
  null,
  'the database rejects completion before required answers exist'
);

select lives_ok(
  $$
    update public.profiles
    set
      study_stage = 'high_school_12',
      target_exam_plan = 'scheduled',
      exam_year = 'Anul II',
      target_exam_year = 2027,
      target_medical_center = 'bucharest',
      focus_subjects = array['biology', 'chemistry']::text[],
      study_challenges = array['consistency', 'retention']::text[],
      primary_learning_goal = 'study_plan',
      onboarding_status = 'completed',
      onboarding_step = 6,
      onboarding_started_at = coalesce(onboarding_started_at, statement_timestamp()),
      onboarding_completed_at = statement_timestamp(),
      onboarding_snoozed_until = null
    where id = '20000000-0000-4000-8000-000000000001'
  $$,
  'a complete and coherent study profile is accepted'
);

select results_eq(
  $$
    select exam_year, target_exam_year
    from public.profiles
    where id = '20000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('Anul II'::text, 2027::smallint) $$,
  'onboarding keeps its target year separate from the legacy profile year'
);

select results_eq(
  $$
    select onboarding_snoozed_until
    from public.profiles
    where id = '20000000-0000-4000-8000-000000000001'
  $$,
  $$ values (null::timestamptz) $$,
  'completed onboarding retains no legacy snooze state'
);

select * from finish();

rollback;
