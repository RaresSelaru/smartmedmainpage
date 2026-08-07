begin;

set local search_path = public, extensions;
select no_plan();

-- Keep global worker assertions deterministic even when the local database
-- already contains due jobs from previous manual testing.
update private.center_enrollment_notification_outbox
set attempt_count = 5;
update private.event_registration_notification_outbox
set attempt_count = 5;

select has_table('public', 'center_enrollments', 'centre enrolments table exists');
select has_column(
  'public',
  'center_enrollments',
  'follow_up_token',
  'post-submit choices use a temporary capability token'
);
select has_column(
  'public',
  'center_enrollments',
  'selected_access_plan_id',
  'every new centre enrolment is bound to its selected access plan'
);
select has_index(
  'public',
  'center_enrollments',
  'center_enrollments_status_created_idx',
  'admin status lists use a composite index'
);
select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.center_enrollments'::regclass
  ),
  'centre enrolment PII has RLS enabled'
);
select ok(
  not has_table_privilege('anon', 'public.center_enrollments', 'SELECT'),
  'anonymous visitors cannot read enrolment PII'
);
select ok(
  not has_table_privilege('anon', 'public.center_enrollments', 'INSERT'),
  'anonymous visitors cannot insert enrolments directly'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.submit_center_enrollment(uuid,text,text,date,text,text,text,text,text,text,text,text,smallint,text,text,text,boolean,text[],text,text,text,boolean,text[],boolean,text,jsonb)',
    'EXECUTE'
  ),
  'anonymous visitors cannot bypass the server-side enrolment boundary'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.submit_center_enrollment(uuid,text,text,date,text,text,text,text,text,text,text,text,smallint,text,text,text,boolean,text[],text,text,text,boolean,text[],boolean,text,jsonb)',
    'EXECUTE'
  ),
  'signed-in visitors cannot bypass the server-side enrolment boundary'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.submit_center_enrollment_server(uuid,text,uuid,text,text,date,text,text,text,text,text,text,text,text,smallint,text,text,text,boolean,text[],text,text,text,boolean,text[],boolean,text,jsonb)',
    'EXECUTE'
  ),
  'anonymous visitors cannot impersonate the trusted enrolment server'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.submit_center_enrollment_server(uuid,text,uuid,text,text,date,text,text,text,text,text,text,text,text,smallint,text,text,text,boolean,text[],text,text,text,boolean,text[],boolean,text,jsonb)',
    'EXECUTE'
  ),
  'the service role can invoke the validated enrolment command'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.claim_center_enrollment_notifications(uuid)',
    'EXECUTE'
  ),
  'anonymous clients cannot claim PII-bearing email payloads'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.complete_center_enrollment_notification(uuid,uuid,text,text,text)',
    'EXECUTE'
  ),
  'signed-in clients cannot forge email delivery state'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.claim_center_enrollment_notifications(uuid)',
    'EXECUTE'
  ),
  'only the server service role can dispatch email outbox records'
);
select results_eq(
  $$
    select slug, name, status
    from public.access_plans
    where slug in (
      'online-esential',
      'centru-plus',
      'module-signature',
      'esential-1-materie',
      'esential-2-materii',
      'avansat-1-materie',
      'avansat-2-materii',
      'performanta-1-materie',
      'performanta-2-materii'
    )
    order by (metadata ->> 'displayOrder')::integer
  $$,
  $$ values
    ('online-esential'::text, 'Online Esențial'::text, 'active'::text),
    ('centru-plus'::text, 'Centru Plus'::text, 'active'::text),
    ('module-signature'::text, 'Module Signature'::text, 'active'::text),
    ('esential-1-materie'::text, 'Esențial · 1 materie'::text, 'active'::text),
    ('esential-2-materii'::text, 'Esențial · 2 materii'::text, 'active'::text),
    ('avansat-1-materie'::text, 'Avansat · 1 materie'::text, 'active'::text),
    ('avansat-2-materii'::text, 'Avansat · 2 materii'::text, 'active'::text),
    ('performanta-1-materie'::text, 'Performanță · 1 materie'::text, 'active'::text),
    ('performanta-2-materii'::text, 'Performanță · 2 materii'::text, 'active'::text)
  $$,
  'legacy and current centre-enrolment plans are seeded and active'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.list_registration_notification_retry_targets(integer)',
    'EXECUTE'
  ),
  'anonymous visitors cannot enumerate retry targets'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.list_registration_notification_retry_targets(integer)',
    'EXECUTE'
  ),
  'signed-in clients cannot enumerate retry targets'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.list_registration_notification_retry_targets(integer)',
    'EXECUTE'
  ),
  'only the service-role worker can list due notification targets'
);

set local role service_role;

select throws_ok(
  $$
    select public.submit_center_enrollment_server(
      null,
      'plan-inexistent',
      '41000000-0000-4000-8000-000000000010',
      'adult',
      'Plan Invalid',
      date '2000-05-12',
      'București',
      '0712345678',
      'invalid-plan@example.invalid',
      'Colegiul Național',
      'Științe ale naturii',
      null,
      null,
      null,
      (extract(year from current_date)::integer + 2)::smallint,
      'grade_11',
      'umf_bucharest',
      null,
      true,
      array['biology_corint'],
      'online',
      'intermediate',
      null,
      false,
      array['courses'],
      true,
      'pricing',
      '{}'::jsonb
    )
  $$,
  '22023',
  'INVALID_CENTER_ENROLLMENT_PLAN',
  'an unsupported plan slug is rejected before enrolment data is stored'
);

update public.access_plans
set status = 'retired'
where slug = 'module-signature';

select throws_ok(
  $$
    select public.submit_center_enrollment_server(
      null,
      'module-signature',
      '41000000-0000-4000-8000-000000000011',
      'adult',
      'Plan Inactiv',
      date '2000-05-12',
      'București',
      '0712345678',
      'inactive-plan@example.invalid',
      'Colegiul Național',
      'Științe ale naturii',
      null,
      null,
      null,
      (extract(year from current_date)::integer + 2)::smallint,
      'grade_11',
      'umf_bucharest',
      null,
      true,
      array['biology_corint'],
      'online',
      'intermediate',
      null,
      false,
      array['special_modules'],
      true,
      'pricing',
      '{}'::jsonb
    )
  $$,
  '22023',
  'INVALID_CENTER_ENROLLMENT_PLAN',
  'a supported but inactive plan cannot receive a new enrolment'
);

update public.access_plans
set status = 'active'
where slug = 'module-signature';

select is(
  public.submit_center_enrollment_server(
    null,
    'avansat-2-materii',
    '41000000-0000-4000-8000-000000000001',
    'adult',
    'Student Centru',
    date '2000-05-12',
    'București',
    '0712345678',
    ' Center.Student@Example.Invalid ',
    'Colegiul Național',
    'Științe ale naturii',
    null,
    null,
    null,
    (extract(year from current_date)::integer + 2)::smallint,
    'grade_11',
    'umf_bucharest',
    null,
    true,
    array['biology_corint', 'organic_chemistry'],
    'in_person',
    'intermediate',
    'beginner',
    true,
    array['courses', 'special_modules'],
    true,
    'homepage-hero',
    '{"flow":"center"}'::jsonb
  ) ->> 'outcome',
  'received',
  'a valid guest enrolment submitted through the server is accepted'
);

reset role;

select results_eq(
  $$
    select
      public.submit_center_enrollment_server(
        null,
        'avansat-2-materii',
        '41000000-0000-4000-8000-000000000001',
        'adult',
        'Student Centru',
        date '2000-05-12',
        'București',
        '0712345678',
        'center.student@example.invalid',
        'Colegiul Național',
        'Științe ale naturii',
        null,
        null,
        null,
        (extract(year from current_date)::integer + 2)::smallint,
        'grade_11',
        'umf_bucharest',
        null,
        true,
        array['biology_corint', 'organic_chemistry'],
        'in_person',
        'intermediate',
        'beginner',
        true,
        array['courses', 'special_modules'],
        true,
        'homepage-hero',
        '{}'::jsonb
      ) ->> 'followUpToken'
  $$,
  $$
    select follow_up_token::text
    from public.center_enrollments
    where idempotency_key = '41000000-0000-4000-8000-000000000001'
  $$,
  'an idempotent retry returns the same follow-up capability'
);

set local role service_role;

select throws_ok(
  $$
    select public.submit_center_enrollment_server(
      null,
      'online-esential',
      '41000000-0000-4000-8000-000000000001',
      'adult', 'Student Centru', date '2000-05-12', 'București', '0712345678',
      'center.student@example.invalid', 'Colegiul Național', 'Științe ale naturii',
      null, null, null,
      (extract(year from current_date)::integer + 2)::smallint,
      'grade_11', 'umf_bucharest', null, true,
      array['biology_corint', 'organic_chemistry'], 'in_person',
      'intermediate', 'beginner', true,
      array['courses', 'special_modules'], true, 'homepage-hero', '{}'::jsonb
    )
  $$,
  '22023',
  'IDEMPOTENCY_PLAN_CONFLICT',
  'an idempotent retry cannot silently change the selected plan'
);

select throws_ok(
  $$
    select public.submit_center_enrollment_server(
      null,
      'online-esential',
      '41000000-0000-4000-8000-000000000002',
      'adult', 'Fără acord', date '2000-01-01', 'Iași', '0711111111',
      'privacy-center@example.invalid', 'Liceu Test', 'Real',
      null, null, null,
      (extract(year from current_date)::integer + 2)::smallint,
      'grade_12', 'umf_iasi', null, false,
      array['biology_barrons'], 'online', 'beginner', null,
      false, array['courses'], false, 'direct', '{}'::jsonb
    )
  $$,
  '22023',
  'PRIVACY_REQUIRED',
  'privacy consent is mandatory'
);

select throws_ok(
  $$
    select public.submit_center_enrollment_server(
      null,
      'online-esential',
      '41000000-0000-4000-8000-000000000003',
      'minor', 'Student Minor', (current_date - interval '16 years')::date,
      'Cluj-Napoca', '0722222222', 'minor-center@example.invalid',
      'Liceu Test', 'Real', null, null, null,
      (extract(year from current_date)::integer + 2)::smallint,
      'grade_10', 'umf_cluj', null, false,
      array['biology_barrons'], 'online', 'beginner', null,
      false, array['courses'], true, 'direct', '{}'::jsonb
    )
  $$,
  '22023',
  'GUARDIAN_REQUIRED',
  'minor enrolments require guardian contact details'
);

reset role;

select is(
  (
    select count(*)
    from public.center_enrollments
    where idempotency_key = '41000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'idempotent retries do not create duplicate enrolments'
);
select is(
  (
    select count(*)
    from private.center_enrollment_notification_outbox
    where enrollment_id = (
      select id from public.center_enrollments
      where idempotency_key = '41000000-0000-4000-8000-000000000001'
    )
  ),
  2::bigint,
  'participant and staff email jobs are committed atomically'
);
select results_eq(
  $$
    select plan.slug
    from public.center_enrollments as enrollment
    join public.access_plans as plan
      on plan.id = enrollment.selected_access_plan_id
    where enrollment.idempotency_key = '41000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('avansat-2-materii'::text) $$,
  'the selected plan is persisted through its access-plans foreign key'
);
select is(
  (
    select count(*)
    from private.center_enrollment_notification_outbox as notification
    join public.center_enrollments as enrollment
      on enrollment.id = notification.enrollment_id
    where enrollment.idempotency_key = '41000000-0000-4000-8000-000000000001'
      and notification.payload ->> 'selectedPlanSlug' = 'avansat-2-materii'
      and notification.payload ->> 'selectedPlanName' = 'Avansat · 2 materii'
  ),
  2::bigint,
  'both transactional email payloads include the selected plan snapshot'
);

update public.center_enrollments
set follow_up_token = '41000000-0000-4000-8000-000000000099'
where idempotency_key = '41000000-0000-4000-8000-000000000001';

set local role anon;

select is(
  public.set_center_enrollment_post_submit_preferences(
    '41000000-0000-4000-8000-000000000099',
    true,
    true,
    true
  ) ->> 'newsletterOptIn',
  'true',
  'post-submit newsletter consent is accepted explicitly'
);

select lives_ok(
  $$
    select public.set_center_enrollment_post_submit_preferences(
      '41000000-0000-4000-8000-000000000099',
      true,
      true,
      true
    )
  $$,
  'repeating the same preferences is idempotent'
);

reset role;

select results_eq(
  $$
    select status, source
    from public.newsletter_subscribers
    where normalized_email = 'center.student@example.invalid'
  $$,
  $$ values ('active'::text, 'center_enrollment'::text) $$,
  'newsletter consent creates a real active subscriber'
);
select is(
  (
    select count(*)
    from public.consent_events
    where subject_email = 'center.student@example.invalid'
      and purpose = 'newsletter'
      and action = 'granted'
      and source = 'center_enrollment'
  ),
  1::bigint,
  'retries do not duplicate the auditable consent event'
);

select lives_ok(
  $$
    select private.set_newsletter_source_consent(
      null,
      'center.student@example.invalid',
      'event_registration',
      true,
      '2026-08-02',
      '{"test":true}'::jsonb
    )
  $$,
  'a subscriber can have independent consent from another acquisition source'
);

set local role anon;
select is(
  public.set_center_enrollment_post_submit_preferences(
    '41000000-0000-4000-8000-000000000099',
    true,
    false,
    false
  ) ->> 'newsletterOptIn',
  'false',
  'the centre flow can withdraw only its own newsletter consent'
);
reset role;

select results_eq(
  $$
    select status
    from public.newsletter_subscribers
    where normalized_email = 'center.student@example.invalid'
  $$,
  $$ values ('active'::text) $$,
  'withdrawing centre consent keeps the subscriber active while event consent remains granted'
);

select is(
  (
    select status
    from public.newsletter_consent_sources
    where subscriber_id = (
      select id
      from public.newsletter_subscribers
      where normalized_email = 'center.student@example.invalid'
    )
      and source = 'center_enrollment'
  ),
  'withdrawn'::text,
  'the centre source is withdrawn independently'
);

select set_config(
  'test.newsletter_unsubscribe_token',
  (
    select unsubscribe_token::text
    from public.newsletter_subscribers
    where normalized_email = 'center.student@example.invalid'
  ),
  true
);
set local role anon;
select is(
  public.unsubscribe_newsletter(
    current_setting('test.newsletter_unsubscribe_token')::uuid
  ),
  '{"accepted": true}'::jsonb,
  'the opaque public link withdraws newsletter consent globally'
);
select is(
  public.unsubscribe_newsletter(
    '41000000-0000-4000-8000-000000000098'
  ),
  '{"accepted": true}'::jsonb,
  'an unknown token returns the same non-enumerating receipt'
);
reset role;

select results_eq(
  $$
    select status
    from public.newsletter_subscribers
    where normalized_email = 'center.student@example.invalid'
  $$,
  $$ values ('unsubscribed'::text) $$,
  'global unsubscribe deactivates the subscriber after every source is withdrawn'
);

select is(
  (
    select count(*)
    from public.newsletter_consent_sources
    where subscriber_id = (
      select id
      from public.newsletter_subscribers
      where normalized_email = 'center.student@example.invalid'
    )
      and status = 'granted'
  ),
  0::bigint,
  'global unsubscribe leaves no active acquisition source'
);

set local role anon;
select ok(
  (public.prepare_center_enrollment_account(
    '41000000-0000-4000-8000-000000000099'
  ) ->> 'accountLinkKey') is not null,
  'the valid follow-up capability can prepare optional account creation'
);
reset role;

set local role service_role;
select is(
  jsonb_array_length(
    public.list_registration_notification_retry_targets(12) -> 'targets'
  ),
  1,
  'the worker lists one centre target even when both of its messages are due'
);
select is(
  public.list_registration_notification_retry_targets(12)
    -> 'targets' -> 0 ->> 'kind',
  'center',
  'centre retry targets are routed without exposing enrolment PII'
);
select throws_ok(
  $$ select public.list_registration_notification_retry_targets(0) $$,
  '22023',
  'INVALID_RETRY_TARGET_LIMIT',
  'the worker cannot request an unbounded retry batch'
);
select is(
  jsonb_array_length(
    public.claim_center_enrollment_notifications(
      (
        select public_id
        from public.center_enrollments
        where idempotency_key = '41000000-0000-4000-8000-000000000001'
      )
    ) -> 'claimed'
  ),
  2,
  'the server claims both transactional notifications'
);
reset role;

update public.center_enrollments
set email_last_error = 'PRIOR_FAILURE'
where idempotency_key = '41000000-0000-4000-8000-000000000001';

select lives_ok(
  format(
    'select public.complete_center_enrollment_notification(%L, %L, %L, %L, null)',
    (
      select notification.id
      from private.center_enrollment_notification_outbox as notification
      join public.center_enrollments as enrollment
        on enrollment.id = notification.enrollment_id
      where enrollment.idempotency_key = '41000000-0000-4000-8000-000000000001'
        and notification.notification_type = 'center_enrollment_confirmation'
    ),
    (
      select notification.claim_token
      from private.center_enrollment_notification_outbox as notification
      join public.center_enrollments as enrollment
        on enrollment.id = notification.enrollment_id
      where enrollment.idempotency_key = '41000000-0000-4000-8000-000000000001'
        and notification.notification_type = 'center_enrollment_confirmation'
    ),
    'sent',
    'resend-participant-test'
  ),
  'the server can complete the participant notification'
);

select is(
  (
    select email_last_error
    from public.center_enrollments
    where idempotency_key = '41000000-0000-4000-8000-000000000001'
  ),
  'PRIOR_FAILURE'::text,
  'a successful partial delivery does not hide an outstanding notification error'
);

select lives_ok(
  format(
    'select public.complete_center_enrollment_notification(%L, %L, %L, %L, null)',
    (
      select notification.id
      from private.center_enrollment_notification_outbox as notification
      join public.center_enrollments as enrollment
        on enrollment.id = notification.enrollment_id
      where enrollment.idempotency_key = '41000000-0000-4000-8000-000000000001'
        and notification.notification_type = 'center_enrollment_staff_alert'
    ),
    (
      select notification.claim_token
      from private.center_enrollment_notification_outbox as notification
      join public.center_enrollments as enrollment
        on enrollment.id = notification.enrollment_id
      where enrollment.idempotency_key = '41000000-0000-4000-8000-000000000001'
        and notification.notification_type = 'center_enrollment_staff_alert'
    ),
    'sent',
    'resend-staff-test'
  ),
  'the server can complete the staff notification'
);

select ok(
  (
    select email_last_error is null
    from public.center_enrollments
    where idempotency_key = '41000000-0000-4000-8000-000000000001'
  ),
  'the stale email error is cleared only after every notification is delivered'
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
    '42000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'center-admin@example.invalid',
    '',
    statement_timestamp(),
    '{}'::jsonb,
    '{}'::jsonb,
    statement_timestamp(),
    statement_timestamp()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '42000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'center-ordinary@example.invalid',
    '',
    statement_timestamp(),
    '{}'::jsonb,
    '{"role":"admin"}'::jsonb,
    statement_timestamp(),
    statement_timestamp()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '42000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'center.student@example.invalid',
    '',
    statement_timestamp(),
    '{}'::jsonb,
    '{}'::jsonb,
    statement_timestamp(),
    statement_timestamp()
  );

update public.profiles
set
  study_stage = 'exploring',
  target_exam_plan = 'later',
  target_exam_year = null,
  target_medical_center = null,
  focus_subjects = '{}'::text[]
where id = '42000000-0000-4000-8000-000000000003';

select set_config(
  'request.jwt.claims',
  '{"sub":"42000000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;
select is(
  public.link_center_enrollment_to_current_account(
    '41000000-0000-4000-8000-000000000099'
  ) ->> 'linked',
  'true',
  'a signed-in user can claim an enrolment only through the opaque follow-up capability'
);
reset role;

select is(
  (
    select user_id
    from public.center_enrollments
    where idempotency_key = '41000000-0000-4000-8000-000000000001'
  ),
  '42000000-0000-4000-8000-000000000003'::uuid,
  'the matching verified Auth account is linked to the enrolment'
);

select results_eq(
  $$
    select
      study_stage,
      target_exam_plan,
      target_exam_year,
      target_medical_center,
      focus_subjects
    from public.profiles
    where id = '42000000-0000-4000-8000-000000000003'
  $$,
  $$
    values (
      'exploring'::text,
      'later'::text,
      null::smallint,
      'bucharest'::text,
      array['biology', 'chemistry']::text[]
    )
  $$,
  'claiming an enrolment fills missing onboarding answers without overwriting existing choices'
);

update public.account_roles
set role = 'admin'
where user_id = '42000000-0000-4000-8000-000000000001';

select set_config(
  'request.jwt.claims',
  '{"sub":"42000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}',
  true
);
set local role authenticated;
select is(
  (select count(*) from public.center_enrollments),
  0::bigint,
  'editable user metadata cannot expose centre enrolment PII'
);
reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"42000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);
set local role authenticated;
select is(
  (
    select count(*)
    from public.center_enrollments
    where idempotency_key = '41000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'a real AAL2 admin can read centre enrolments'
);
select lives_ok(
  $$
    update public.center_enrollments
    set status = 'contacted', admin_notes = 'Contactat prin telefon.'
    where idempotency_key = '41000000-0000-4000-8000-000000000001'
  $$,
  'an authorized admin can manage status and internal notes'
);
reset role;

select * from finish();
rollback;
