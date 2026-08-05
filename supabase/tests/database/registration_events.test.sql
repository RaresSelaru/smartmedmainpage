begin;

set local search_path = public, extensions;

select no_plan();

-- Keep global worker assertions deterministic even when the local database
-- already contains due jobs from previous manual testing.
update private.center_enrollment_notification_outbox
set attempt_count = 5;
update private.event_registration_notification_outbox
set attempt_count = 5;

select has_table(
  'public',
  'registration_events',
  'registration events table exists'
);
select has_table(
  'public',
  'event_registrations',
  'event registrations table exists'
);
select has_table(
  'private',
  'event_registration_notification_outbox',
  'event notifications have a private transactional outbox'
);
select has_column(
  'public',
  'registration_events',
  'confirmed_count',
  'events expose a safe confirmed counter'
);
select has_column(
  'public',
  'event_registrations',
  'normalized_email',
  'registrations normalize email addresses'
);
select has_index(
  'public',
  'registration_events',
  'registration_events_public_catalog_idx',
  'public event catalog is indexed'
);
select has_index(
  'public',
  'event_registrations',
  'event_registrations_event_status_idx',
  'participant management is indexed by event and status'
);

select ok(
  (
    select relation.relrowsecurity
    from pg_class as relation
    where relation.oid = 'public.registration_events'::regclass
  ),
  'registration events have RLS enabled'
);
select ok(
  (
    select relation.relrowsecurity
    from pg_class as relation
    where relation.oid = 'public.event_registrations'::regclass
  ),
  'participant PII has RLS enabled'
);
select ok(
  has_column_privilege(
    'anon',
    'public.registration_events',
    'title',
    'SELECT'
  ),
  'anonymous visitors can read public event fields'
);
select ok(
  not has_table_privilege(
    'anon',
    'public.event_registrations',
    'SELECT'
  ),
  'anonymous visitors cannot read participant PII'
);
select ok(
  not has_table_privilege(
    'anon',
    'public.event_registrations',
    'INSERT'
  ),
  'anonymous visitors cannot insert participant rows directly'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.register_for_event(bigint,text,text,text,boolean,boolean)',
    'EXECUTE'
  ),
  'anonymous visitors cannot bypass the server-side registration boundary'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.register_for_event(bigint,text,text,text,boolean,boolean)',
    'EXECUTE'
  ),
  'signed-in users cannot bypass the server-side registration boundary'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.register_for_event_server(uuid,bigint,text,text,text,boolean,boolean)',
    'EXECUTE'
  ),
  'anonymous visitors cannot impersonate the trusted event server'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.register_for_event_server(uuid,bigint,text,text,text,boolean,boolean)',
    'EXECUTE'
  ),
  'the service role can invoke the validated event command'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.claim_event_registration_notifications(uuid)',
    'EXECUTE'
  ),
  'anonymous clients cannot read event email payloads'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.claim_event_registration_notifications(uuid)',
    'EXECUTE'
  ),
  'only the server service role can claim event emails'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.list_registration_notification_retry_targets(integer)',
    'EXECUTE'
  ),
  'anonymous visitors cannot enumerate event retry targets'
);
select ok(
  not has_function_privilege(
    'anon',
    'private.update_registration_event_counts()',
    'EXECUTE'
  ),
  'anonymous visitors cannot execute registration count helpers'
);
select ok(
  not has_function_privilege(
    'anon',
    'private.promote_event_waitlist(bigint)',
    'EXECUTE'
  ),
  'anonymous visitors cannot execute waitlist promotion directly'
);

insert into public.media_assets (
  storage_bucket,
  storage_path,
  kind,
  access_level,
  status,
  title,
  mime_type,
  metadata
)
values
  (
    'cms-media',
    'cms/11111111-1111-4111-8111-111111111111/original.webp',
    'image',
    'private',
    'active',
    'Published event cover',
    'image/webp',
    jsonb_build_object(
      'version', 1,
      'originalFileName', 'published.webp',
      'originalFormat', 'webp',
      'variants', jsonb_build_array(
        jsonb_build_object(
          'byteSize', 100,
          'checksumSha256', repeat('a', 64),
          'height', 800,
          'key', 'original',
          'path', 'cms/11111111-1111-4111-8111-111111111111/original.webp',
          'width', 1200
        )
      )
    )
  ),
  (
    'cms-media',
    'cms/22222222-2222-4222-8222-222222222222/original.webp',
    'image',
    'private',
    'active',
    'Draft event cover',
    'image/webp',
    jsonb_build_object(
      'version', 1,
      'originalFileName', 'draft.webp',
      'originalFormat', 'webp',
      'variants', jsonb_build_array(
        jsonb_build_object(
          'byteSize', 100,
          'checksumSha256', repeat('b', 64),
          'height', 800,
          'key', 'original',
          'path', 'cms/22222222-2222-4222-8222-222222222222/original.webp',
          'width', 1200
        )
      )
    )
  );

insert into public.registration_events (
  slug,
  title,
  summary,
  description,
  event_type,
  delivery_mode,
  status,
  cover_media_id,
  starts_at,
  ends_at,
  registration_opens_at,
  registration_closes_at,
  capacity,
  allow_waitlist,
  location_name,
  published_at
)
values
  (
    'event-pgtap-public',
    'Simulare SmartMed pgTAP',
    'O simulare completă folosită pentru testarea înscrierilor SmartMed.',
    'Eveniment public de test care verifică locurile și lista de așteptare.',
    'simulation',
    'in_person',
    'published',
    (
      select id from public.media_assets
      where title = 'Published event cover'
    ),
    statement_timestamp() + interval '3 days',
    statement_timestamp() + interval '3 days 3 hours',
    statement_timestamp() - interval '1 day',
    statement_timestamp() + interval '2 days',
    2,
    true,
    'Centrul SmartMed București',
    statement_timestamp()
  ),
  (
    'event-pgtap-draft',
    'Webinar SmartMed în lucru',
    'Un webinar aflat în lucru care trebuie să rămână complet invizibil public.',
    'Eveniment de test în starea draft, vizibil exclusiv administratorilor.',
    'webinar',
    'online',
    'draft',
    (
      select id from public.media_assets
      where title = 'Draft event cover'
    ),
    statement_timestamp() + interval '4 days',
    statement_timestamp() + interval '4 days 2 hours',
    statement_timestamp() - interval '1 day',
    statement_timestamp() + interval '3 days',
    null,
    false,
    'Online',
    null
  );

select results_eq(
  $$
    select access_level
    from public.media_assets
    where title = 'Published event cover'
  $$,
  $$ values ('public'::text) $$,
  'publishing an event makes its CMS cover public'
);
select results_eq(
  $$
    select access_level
    from public.media_assets
    where title = 'Draft event cover'
  $$,
  $$ values ('private'::text) $$,
  'draft event covers remain private'
);

set local role anon;

select results_eq(
  $$
    select slug
    from public.registration_events
    where slug like 'event-pgtap-%'
    order by slug
  $$,
  $$ values ('event-pgtap-public'::text) $$,
  'anonymous visitors see published events but never drafts'
);

select throws_ok(
  $$ select * from public.event_registrations $$,
  '42501',
  null,
  'participant PII cannot be selected anonymously'
);

select throws_ok(
  $$
    insert into public.event_registrations (
      event_id,
      full_name,
      email,
      status,
      privacy_policy_version,
      privacy_accepted_at
    )
    values (
      (select id from public.registration_events where slug = 'event-pgtap-public'),
      'Raw Insert',
      'raw@example.invalid',
      'confirmed',
      'test',
      statement_timestamp()
    )
  $$,
  '42501',
  null,
  'participant rows cannot be inserted directly'
);

reset role;
set local role service_role;

select is(
  (
    public.register_for_event_server(
      null,
      (select id from public.registration_events where slug = 'event-pgtap-public'),
      'Student Unu',
      'student1@example.invalid',
      '0711111111',
      true,
      false
    ) ->> 'outcome'
  ),
  'confirmed',
  'the first participant receives a confirmed place'
);
select is(
  (
    public.register_for_event_server(
      null,
      (select id from public.registration_events where slug = 'event-pgtap-public'),
      'Student Doi',
      'student2@example.invalid',
      '0722222222',
      true,
      true
    ) ->> 'outcome'
  ),
  'confirmed',
  'the final available place is confirmed'
);
select is(
  (
    public.register_for_event_server(
      null,
      (select id from public.registration_events where slug = 'event-pgtap-public'),
      'Student Trei',
      'student3@example.invalid',
      null,
      true,
      false
    ) ->> 'outcome'
  ),
  'waitlist',
  'the next participant enters the waitlist without overselling'
);

select is(
  (
    public.register_for_event_server(
      null,
      (select id from public.registration_events where slug = 'event-pgtap-public'),
      'Student Patru',
      'student4@example.invalid',
      null,
      true,
      false
    ) ->> 'outcome'
  ),
  'waitlist',
  'later participants keep their FIFO position on the waitlist'
);

reset role;

set local role service_role;
select is(
  jsonb_array_length(
    public.list_registration_notification_retry_targets(2) -> 'targets'
  ),
  2,
  'the worker enforces its cross-registration batch limit'
);
select results_eq(
  $$
    select distinct target ->> 'kind'
    from jsonb_array_elements(
      public.list_registration_notification_retry_targets(2) -> 'targets'
    ) as target
  $$,
  $$ values ('event'::text) $$,
  'event retry targets are routed through the protected worker'
);
reset role;

select results_eq(
  $$
    select confirmed_count, waitlist_count
    from public.registration_events
    where slug = 'event-pgtap-public'
  $$,
  $$ values (2, 2) $$,
  'capacity counters reflect confirmed and waitlisted participants'
);

set local role service_role;

select results_eq(
  $$
    select public.register_for_event_server(
      null,
      (select id from public.registration_events where slug = 'event-pgtap-public'),
      'Student Unu',
      ' STUDENT1@EXAMPLE.INVALID ',
      '0711111111',
      true,
      false
    )
  $$,
  $$ values ('{"accepted": true, "outcome": "received"}'::jsonb) $$,
  'an idempotent retry returns no participant id or registration status'
);

select throws_ok(
  $$
    select public.register_for_event_server(
      null,
      (select id from public.registration_events where slug = 'event-pgtap-public'),
      'Fără Consimțământ',
      'privacy@example.invalid',
      null,
      false,
      false
    )
  $$,
  '22023',
  'PRIVACY_REQUIRED',
  'privacy consent is mandatory'
);

reset role;

select results_eq(
  $$
    select confirmed_count, waitlist_count
    from public.registration_events
    where slug = 'event-pgtap-public'
  $$,
  $$ values (2, 2) $$,
  'an idempotent retry does not change capacity counters'
);

select is(
  (
    select count(*)
    from private.event_registration_notification_outbox as outbox
    join public.event_registrations as registration
      on registration.id = outbox.registration_id
    where registration.event_id = (
      select id from public.registration_events where slug = 'event-pgtap-public'
    )
  ),
  8::bigint,
  'each initial event registration queues participant and staff emails atomically'
);

select results_eq(
  $$
    select status, source
    from public.newsletter_subscribers
    where normalized_email = 'student2@example.invalid'
  $$,
  $$ values ('active'::text, 'event_registration'::text) $$,
  'event marketing consent creates a real newsletter subscriber'
);

select is(
  (
    select count(*)
    from public.consent_events
    where subject_email = 'student2@example.invalid'
      and purpose = 'newsletter'
      and action = 'granted'
      and source = 'event_registration'
  ),
  1::bigint,
  'event newsletter consent is auditable and idempotent'
);

set local role service_role;
select is(
  jsonb_array_length(
    public.claim_event_registration_notifications(
      (
        select id
        from public.event_registrations
        where normalized_email = 'student1@example.invalid'
      )
    ) -> 'claimed'
  ),
  2,
  'the server claims participant and staff event notifications'
);
reset role;

select throws_ok(
  $$
    update public.registration_events
    set capacity = 1
    where slug = 'event-pgtap-public'
  $$,
  '23514',
  null,
  'capacity cannot be reduced below confirmed registrations'
);

select throws_ok(
  $$
    update public.media_assets
    set status = 'archived'
    where title = 'Draft event cover'
  $$,
  '55000',
  'Referenced event media cannot be archived',
  'an event cover cannot be archived while referenced'
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
    '30000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'events-admin-pgtap@example.invalid',
    '',
    statement_timestamp(),
    '{}'::jsonb,
    '{}'::jsonb,
    statement_timestamp(),
    statement_timestamp()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '30000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'events-user-pgtap@example.invalid',
    '',
    statement_timestamp(),
    '{}'::jsonb,
    '{"role":"admin"}'::jsonb,
    statement_timestamp(),
    statement_timestamp()
  );

update public.account_roles
set role = 'admin'
where user_id = '30000000-0000-4000-8000-000000000001';

select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}',
  true
);
set local role authenticated;

select is(
  (
    select count(*)
    from public.event_registrations
  ),
  0::bigint,
  'user metadata cannot grant access to participant PII'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);
set local role authenticated;

select is(
  (
    select count(*)
    from public.event_registrations
    where event_id = (
      select id from public.registration_events where slug = 'event-pgtap-public'
    )
  ),
  4::bigint,
  'a confirmed AAL2 admin can manage participants'
);

select lives_ok(
  $$
    update public.event_registrations
    set
      status = 'cancelled',
      cancelled_at = statement_timestamp(),
      attended_at = null
    where email = 'student2@example.invalid'
  $$,
  'an admin can cancel a participant registration'
);

reset role;

select results_eq(
  $$
    select confirmed_count, waitlist_count
    from public.registration_events
    where slug = 'event-pgtap-public'
  $$,
  $$ values (2, 1) $$,
  'cancelling a confirmed participant atomically fills the released place'
);

select results_eq(
  $$
    select email, status
    from public.event_registrations
    where email in ('student3@example.invalid', 'student4@example.invalid')
    order by email
  $$,
  $$
    values
      ('student3@example.invalid'::text, 'confirmed'::text),
      ('student4@example.invalid'::text, 'waitlist'::text)
  $$,
  'the oldest waitlisted participant is promoted first'
);

select is(
  (
    select count(*)
    from private.event_registration_notification_outbox as outbox
    join public.event_registrations as registration
      on registration.id = outbox.registration_id
     and registration.notification_batch_id = outbox.batch_id
    where registration.normalized_email = 'student3@example.invalid'
      and outbox.notification_type = 'event_registration_confirmation'
  ),
  1::bigint,
  'automatic waitlist promotion queues a fresh participant confirmation'
);

update public.registration_events
set capacity = 3
where slug = 'event-pgtap-public';

set local role service_role;

select is(
  (
    public.register_for_event_server(
      null,
      (select id from public.registration_events where slug = 'event-pgtap-public'),
      'Student Cinci',
      'student5@example.invalid',
      null,
      true,
      false
    ) ->> 'outcome'
  ),
  'waitlist',
  'a new registration cannot take a place ahead of the existing waitlist'
);

reset role;

select results_eq(
  $$
    select email, status
    from public.event_registrations
    where email in ('student4@example.invalid', 'student5@example.invalid')
    order by email
  $$,
  $$
    values
      ('student4@example.invalid'::text, 'confirmed'::text),
      ('student5@example.invalid'::text, 'waitlist'::text)
  $$,
  'the queued participant is promoted before accepting the newcomer'
);

select is(
  (
    select count(*)
    from private.event_registration_notification_outbox as outbox
    join public.event_registrations as registration
      on registration.id = outbox.registration_id
     and registration.notification_batch_id = outbox.batch_id
    where registration.normalized_email = 'student4@example.invalid'
      and outbox.notification_type = 'event_registration_confirmation'
  ),
  1::bigint,
  'capacity-driven promotion also queues a fresh participant confirmation'
);

select results_eq(
  $$
    select confirmed_count, waitlist_count
    from public.registration_events
    where slug = 'event-pgtap-public'
  $$,
  $$ values (3, 1) $$,
  'capacity counters remain correct after FIFO promotion'
);

update public.registration_events
set status = 'archived'
where slug = 'event-pgtap-public';

select results_eq(
  $$
    select access_level
    from public.media_assets
    where title = 'Published event cover'
  $$,
  $$ values ('private'::text) $$,
  'archiving the only public event makes its cover private again'
);

select * from finish();

rollback;
