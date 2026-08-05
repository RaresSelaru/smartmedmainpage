begin;

set local search_path = public, extensions;

select no_plan();

select has_column(
  'public',
  'appointments',
  'booking_request_id',
  'evaluation appointments have an idempotency key'
);
select has_column(
  'public',
  'appointments',
  'metadata',
  'evaluation context is stored as a structured snapshot'
);
select has_table(
  'private',
  'appointment_notification_outbox',
  'transactional evaluation email has a private outbox'
);
select has_index(
  'public',
  'appointments',
  'appointments_booking_request_unique_idx',
  'a repeated booking request cannot create duplicate appointments'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.book_smartmed_evaluation(bigint,uuid,text,text,text,boolean,text)',
    'EXECUTE'
  ),
  'anonymous visitors cannot book an evaluation'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.book_smartmed_evaluation(bigint,uuid,text,text,text,boolean,text)',
    'EXECUTE'
  ),
  'authenticated users can use the narrow booking RPC'
);
select ok(
  not has_table_privilege('authenticated', 'public.appointments', 'INSERT'),
  'users cannot forge an appointment row directly'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'private.appointment_notification_outbox',
    'SELECT'
  ),
  'users cannot read transactional email payloads'
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
    'evaluation-a@example.invalid',
    '',
    statement_timestamp(),
    '{"provider":"email"}'::jsonb,
    '{"full_name":"Student Evaluare A"}'::jsonb,
    statement_timestamp(),
    statement_timestamp()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '30000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'evaluation-b@example.invalid',
    '',
    statement_timestamp(),
    '{"provider":"email"}'::jsonb,
    '{"full_name":"Student Evaluare B"}'::jsonb,
    statement_timestamp(),
    statement_timestamp()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '30000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'evaluation-c@example.invalid',
    '',
    statement_timestamp(),
    '{"provider":"email"}'::jsonb,
    '{"full_name":"Student Evaluare C"}'::jsonb,
    statement_timestamp(),
    statement_timestamp()
  );

update public.profiles
set full_name = case id
  when '30000000-0000-4000-8000-000000000001'::uuid
    then 'Student Evaluare A'
  when '30000000-0000-4000-8000-000000000002'::uuid
    then 'Student Evaluare B'
  else 'Student Evaluare C'
end
where id in (
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000003'
);

insert into public.availability_exceptions (
  staff_member_id,
  appointment_type_id,
  location_id,
  kind,
  starts_at,
  ends_at,
  capacity,
  is_public,
  public_label
)
select
  staff.id,
  appointment_type.id,
  location.id,
  'available',
  date_trunc('hour', statement_timestamp() + interval '3 days'),
  date_trunc('hour', statement_timestamp() + interval '3 days') + interval '30 minutes',
  2,
  true,
  'Slot pgTAP evaluare'
from public.staff_members as staff
cross join public.appointment_types as appointment_type
cross join public.locations as location
where staff.slug = 'echipa-evaluare-smartmed'
  and appointment_type.slug = 'evaluare-initiala-smartmed'
  and location.slug = 'evaluare-smartmed-online';

insert into public.availability_exceptions (
  staff_member_id,
  appointment_type_id,
  location_id,
  kind,
  starts_at,
  ends_at,
  capacity,
  is_public,
  public_label
)
select
  staff.id,
  appointment_type.id,
  location.id,
  'available',
  date_trunc('hour', statement_timestamp() + interval '4 days'),
  date_trunc('hour', statement_timestamp() + interval '4 days') + interval '30 minutes',
  1,
  true,
  'Slot pgTAP mutare'
from public.staff_members as staff
cross join public.appointment_types as appointment_type
cross join public.locations as location
where staff.slug = 'echipa-evaluare-smartmed'
  and appointment_type.slug = 'evaluare-initiala-smartmed'
  and location.slug = 'evaluare-smartmed-online';

insert into public.availability_exceptions (
  staff_member_id,
  appointment_type_id,
  location_id,
  kind,
  starts_at,
  ends_at,
  capacity,
  is_public,
  public_label
)
select
  staff.id,
  appointment_type.id,
  location.id,
  'available',
  date_trunc('hour', statement_timestamp() + interval '5 days'),
  date_trunc('hour', statement_timestamp() + interval '5 days') + interval '30 minutes',
  3,
  true,
  'Slot pgTAP gol'
from public.staff_members as staff
cross join public.appointment_types as appointment_type
cross join public.locations as location
where staff.slug = 'echipa-evaluare-smartmed'
  and appointment_type.slug = 'evaluare-initiala-smartmed'
  and location.slug = 'evaluare-smartmed-online';

select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;

select lives_ok(
  format(
    $test$
      select public.book_smartmed_evaluation(
        %s,
        '30000000-0000-4000-8000-000000000011'::uuid,
        'build_plan',
        '+40 721 000 001',
        'Vreau un plan realist.',
        true,
        'website'
      )
    $test$,
    (
      select id
      from public.availability_exceptions
      where public_label = 'Slot pgTAP evaluare'
    )
  ),
  'a confirmed account can book a real available slot'
);

select results_eq(
  $$
    select contact_email, status, metadata ->> 'evaluationGoal'
    from public.appointments
    where booking_request_id = '30000000-0000-4000-8000-000000000011'
  $$,
  $$ values ('evaluation-a@example.invalid'::text, 'confirmed'::text, 'build_plan'::text) $$,
  'identity is derived from the account and the goal is snapshotted'
);

select results_eq(
  $$
    select capacity, booked_count, remaining_places
    from public.get_smartmed_evaluation_slots(
      statement_timestamp(),
      statement_timestamp() + interval '7 days'
    )
    where public_label = 'Slot pgTAP evaluare'
  $$,
  $$ values (2::integer, 1::integer, 1::integer) $$,
  'public availability reports group capacity, occupancy, and remaining places'
);

select throws_ok(
  format(
    $test$
      select public.reschedule_own_smartmed_evaluation(
        (
          select public_id
          from public.appointments
          where booking_request_id = '30000000-0000-4000-8000-000000000011'
        ),
        %s
      )
    $test$,
    (
      select id
      from public.availability_exceptions
      where public_label = 'Slot pgTAP evaluare'
    )
  ),
  '22023',
  'EVALUATION_SLOT_UNCHANGED',
  'selecting the current group slot does not create a fake reschedule'
);

select is(
  (
    select count(*)
    from public.appointments
    where booking_request_id = '30000000-0000-4000-8000-000000000011'
  ),
  1::bigint,
  'the user sees their own appointment through RLS'
);

select lives_ok(
  format(
    $test$
      select public.book_smartmed_evaluation(
        %s,
        '30000000-0000-4000-8000-000000000011'::uuid,
        'build_plan',
        null,
        null,
        true,
        'website'
      )
    $test$,
    (
      select id
      from public.availability_exceptions
      where public_label = 'Slot pgTAP evaluare'
    )
  ),
  'repeating the same client request is idempotent'
);

select is(
  (
    select count(*)
    from public.appointments
    where booking_request_id = '30000000-0000-4000-8000-000000000011'
  ),
  1::bigint,
  'idempotency keeps a single appointment row'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;

select lives_ok(
  format(
    $test$
      select public.book_smartmed_evaluation(
        %s,
        '30000000-0000-4000-8000-000000000012'::uuid,
        'evaluate_level',
        null,
        null,
        true,
        'website'
      )
    $test$,
    (
      select id
      from public.availability_exceptions
      where public_label = 'Slot pgTAP evaluare'
    )
  ),
  'a second user can reserve another place in the same evaluator slot'
);

select is(
  (
    select count(*)
    from public.get_smartmed_evaluation_slots(
      statement_timestamp(),
      statement_timestamp() + interval '7 days'
    )
    where public_label = 'Slot pgTAP evaluare'
  ),
  0::bigint,
  'a full slot is omitted from public availability'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;

select lives_ok(
  $$
    select public.reschedule_own_smartmed_evaluation(
      (
        select public_id
        from public.appointments
        where booking_request_id = '30000000-0000-4000-8000-000000000011'
      ),
      (
        select id
        from public.availability_exceptions
        where public_label = 'Slot pgTAP mutare'
      )
    )
  $$,
  'a booking can move atomically between two capacity slots'
);

reset role;

select results_eq(
  $$
    select slot.public_label,
      private.evaluation_slot_active_booking_count(slot.id)
    from public.availability_exceptions as slot
    where slot.public_label in ('Slot pgTAP evaluare', 'Slot pgTAP mutare')
    order by slot.public_label
  $$,
  $$
    values
      ('Slot pgTAP evaluare'::text, 1::integer),
      ('Slot pgTAP mutare'::text, 1::integer)
  $$,
  'rescheduling releases the old seat and occupies the new seat'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;

select throws_ok(
  $$
    select public.reschedule_own_smartmed_evaluation(
      (
        select public_id
        from public.appointments
        where booking_request_id = '30000000-0000-4000-8000-000000000012'
      ),
      (
        select id
        from public.availability_exceptions
        where public_label = 'Slot pgTAP mutare'
      )
    )
  $$,
  '23P01',
  'SLOT_FULL',
  'rescheduling to a capacity-full target is rejected'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;

select lives_ok(
  $$
    select public.reschedule_own_smartmed_evaluation(
      (
        select public_id
        from public.appointments
        where booking_request_id = '30000000-0000-4000-8000-000000000011'
      ),
      (
        select id
        from public.availability_exceptions
        where public_label = 'Slot pgTAP evaluare'
      )
    )
  $$,
  'the booking can return when the original group slot still has room'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;

select is(
  (
    select count(*)
    from public.appointments
    where booking_request_id = '30000000-0000-4000-8000-000000000011'
  ),
  0::bigint,
  'a student cannot read another student evaluation'
);

select throws_ok(
  $$
    select public.cancel_own_smartmed_evaluation(
      (
        select public_id
        from public.appointments
        where booking_request_id = '30000000-0000-4000-8000-000000000011'
      )
    )
  $$,
  'P0002',
  'EVALUATION_NOT_FOUND',
  'a student cannot cancel another student evaluation'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;

select throws_ok(
  format(
    $test$
      select public.book_smartmed_evaluation(
        %s,
        '30000000-0000-4000-8000-000000000013'::uuid,
        'choose_program',
        null,
        null,
        true,
        'website'
      )
    $test$,
    (
      select id
      from public.availability_exceptions
      where public_label = 'Slot pgTAP evaluare'
    )
  ),
  '23P01',
  'SLOT_FULL',
  'the next user is rejected once all group places are occupied'
);

reset role;

update public.account_roles
set role = 'admin'
where user_id = '30000000-0000-4000-8000-000000000001';

select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);
set local role authenticated;

select throws_ok(
  format(
    $test$
      select public.admin_update_smartmed_evaluation(
        (
          select public_id
          from public.appointments
          where booking_request_id = '30000000-0000-4000-8000-000000000012'
        ),
        'cancelled',
        %s,
        'Combinație invalidă de test'
      )
    $test$,
    (
      select id
      from public.availability_exceptions
      where public_label = 'Slot pgTAP evaluare'
    )
  ),
  '22023',
  'INVALID_APPOINTMENT_STATUS_COMBINATION',
  'admin cannot reprogram into a slot while assigning a terminal status'
);

select throws_ok(
  format(
    $test$
      select public.admin_update_smartmed_evaluation_slot_capacity(%s, 1)
    $test$,
    (
      select id
      from public.availability_exceptions
      where public_label = 'Slot pgTAP evaluare'
    )
  ),
  '23514',
  'CAPACITY_BELOW_BOOKED_COUNT',
  'an administrator cannot reduce capacity below active occupancy'
);

select throws_ok(
  format(
    $test$
      select public.admin_delete_smartmed_evaluation_slot(%s)
    $test$,
    (
      select id
      from public.availability_exceptions
      where public_label = 'Slot pgTAP evaluare'
    )
  ),
  '23503',
  'SLOT_HAS_ACTIVE_BOOKINGS',
  'an administrator cannot delete a session with active reservations'
);

reset role;

select throws_ok(
  $$
    update public.availability_exceptions
    set capacity = 1
    where public_label = 'Slot pgTAP evaluare'
  $$,
  '23514',
  'CAPACITY_BELOW_BOOKED_COUNT',
  'the table trigger protects occupied capacity even for privileged direct DML'
);

select throws_ok(
  $$
    delete from public.availability_exceptions
    where public_label = 'Slot pgTAP evaluare'
  $$,
  '23503',
  'SLOT_HAS_ACTIVE_BOOKINGS',
  'the table trigger protects occupied sessions even for privileged direct DML'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);
set local role authenticated;

select ok(
  not has_table_privilege('authenticated', 'public.availability_exceptions', 'INSERT')
  and not has_table_privilege('authenticated', 'public.availability_exceptions', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.availability_exceptions', 'DELETE'),
  'direct availability writes are revoked so RPC invariants cannot be bypassed'
);

select results_eq(
  $$
    select
      (result ->> 'deletedCount')::integer > 0,
      (result ->> 'protectedCount')::integer > 0
    from (
      select public.admin_delete_all_smartmed_evaluation_slots() as result
    ) as bulk_delete
  $$,
  $$ values (true, true) $$,
  'bulk delete removes empty sessions and reports occupied sessions protected'
);

select results_eq(
  $$
    select
      count(*) filter (where public_label = 'Slot pgTAP evaluare'),
      count(*) filter (where public_label in ('Slot pgTAP mutare', 'Slot pgTAP gol'))
    from public.availability_exceptions
  $$,
  $$ values (1::bigint, 0::bigint) $$,
  'bulk delete preserves the occupied session and removes known empty sessions'
);

select lives_ok(
  $$
    select public.admin_update_smartmed_evaluation(
      (
        select public_id
        from public.appointments
        where booking_request_id = '30000000-0000-4000-8000-000000000012'
      ),
      'cancelled',
      null,
      'Pregătire test reactivare'
    )
  $$,
  'admin can move an active appointment to a terminal status'
);

select throws_ok(
  $$
    select public.admin_update_smartmed_evaluation(
      (
        select public_id
        from public.appointments
        where booking_request_id = '30000000-0000-4000-8000-000000000012'
      ),
      'confirmed',
      null,
      'Reactivare fără slot'
    )
  $$,
  '22023',
  'SLOT_REQUIRED_FOR_REACTIVATION',
  'terminal appointments require an explicit valid slot before reactivation'
);

select lives_ok(
  $$
    select public.admin_update_smartmed_evaluation(
      (
        select public_id
        from public.appointments
        where booking_request_id = '30000000-0000-4000-8000-000000000012'
      ),
      'confirmed',
      (
        select id
        from public.availability_exceptions
        where public_label = 'Slot pgTAP evaluare'
      ),
      'Reactivare cu slot valid'
    )
  $$,
  'terminal appointments can be reactivated only through an explicit slot'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;

select lives_ok(
  $$
    select public.cancel_own_smartmed_evaluation(
      (
        select public_id
        from public.appointments
        where booking_request_id = '30000000-0000-4000-8000-000000000011'
      )
    )
  $$,
  'the owner can cancel their evaluation'
);

select results_eq(
  $$
    select status, count(*)
    from public.appointments
    where booking_request_id = '30000000-0000-4000-8000-000000000011'
    group by status
  $$,
  $$ values ('cancelled'::text, 1::bigint) $$,
  'cancellation updates the existing appointment without deleting history'
);

select results_eq(
  $$
    select capacity, booked_count, remaining_places
    from public.get_smartmed_evaluation_slots(
      statement_timestamp(),
      statement_timestamp() + interval '7 days'
    )
    where public_label = 'Slot pgTAP evaluare'
  $$,
  $$ values (2::integer, 1::integer, 1::integer) $$,
  'cancelling a reservation immediately releases one group place'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;

select lives_ok(
  format(
    $test$
      select public.book_smartmed_evaluation(
        %s,
        '30000000-0000-4000-8000-000000000013'::uuid,
        'choose_program',
        null,
        null,
        true,
        'website'
      )
    $test$,
    (
      select id
      from public.availability_exceptions
      where public_label = 'Slot pgTAP evaluare'
    )
  ),
  'the released place can be booked by the next user'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;

select is(
  (
    public.claim_smartmed_evaluation_notification(
      (
        select public_id
        from public.appointments
        where booking_request_id = '30000000-0000-4000-8000-000000000011'
      )
    ) ->> 'notificationType'
  ),
  'evaluation_cancelled',
  'the newest lifecycle email supersedes an unsent confirmation'
);

select is(
  (
    public.claim_smartmed_evaluation_notification(
      (
        select public_id
        from public.appointments
        where booking_request_id = '30000000-0000-4000-8000-000000000011'
      )
    ) ->> 'claimed'
  ),
  'false',
  'an older confirmation cannot be claimed while the latest email is processing'
);

reset role;

select * from finish();

rollback;
