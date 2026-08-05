begin;

set local search_path = public, extensions;

select no_plan();

-- Keep the authorization assertions independent of the developer machine's
-- local MFA override. The governance control plane must fail closed here.
update private.admin_security_settings
set require_mfa = true
where singleton;

select has_table(
  'private',
  'super_admin_assignment',
  'private super-admin assignment exists'
);
select has_table(
  'private',
  'admin_invitations',
  'private administrator invitation registry exists'
);

select ok(
  (
    select relation.relrowsecurity
    from pg_class as relation
    where relation.oid = 'private.super_admin_assignment'::regclass
  ),
  'super-admin assignment has RLS enabled'
);
select ok(
  (
    select relation.relrowsecurity
    from pg_class as relation
    where relation.oid = 'private.admin_invitations'::regclass
  ),
  'administrator invitations have RLS enabled'
);

select ok(
  exists (
    select 1
    from pg_constraint as constraint_definition
    where constraint_definition.conrelid =
      'private.super_admin_assignment'::regclass
      and constraint_definition.contype = 'p'
      and pg_get_constraintdef(constraint_definition.oid)
        = 'PRIMARY KEY (singleton)'
  ),
  'the super-admin assignment is a database-enforced singleton'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'private.super_admin_assignment',
    'SELECT'
  )
  and not has_table_privilege(
    'authenticated',
    'private.super_admin_assignment',
    'INSERT'
  )
  and not has_table_privilege(
    'authenticated',
    'private.super_admin_assignment',
    'UPDATE'
  )
  and not has_table_privilege(
    'authenticated',
    'private.super_admin_assignment',
    'DELETE'
  ),
  'authenticated clients have no direct access to the owner assignment'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'private.admin_invitations',
    'SELECT'
  )
  and not has_table_privilege(
    'authenticated',
    'private.admin_invitations',
    'INSERT'
  )
  and not has_table_privilege(
    'authenticated',
    'private.admin_invitations',
    'UPDATE'
  )
  and not has_table_privilege(
    'authenticated',
    'private.admin_invitations',
    'DELETE'
  ),
  'authenticated clients have no direct access to invitations'
);
select ok(
  not has_table_privilege(
    'service_role',
    'private.super_admin_assignment',
    'UPDATE'
  )
  and not has_table_privilege(
    'service_role',
    'private.admin_invitations',
    'UPDATE'
  ),
  'service_role must use the narrow control-plane RPCs'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.cms_is_super_admin()',
    'EXECUTE'
  ),
  'authenticated users can perform the guarded owner lookup'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.cms_list_administrators()',
    'EXECUTE'
  ),
  'authenticated users can reach the guarded administrator overview RPC'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.cms_prepare_admin_invitation(text,text,text,text)',
    'EXECUTE'
  ),
  'authenticated users can reach the guarded invitation RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.cms_prepare_admin_invitation(text,text,text,text)',
    'EXECUTE'
  ),
  'anonymous users cannot prepare administrator invitations'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.cms_mark_admin_invitation_delivery(uuid,uuid,boolean,text,text)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    'public.cms_mark_admin_invitation_delivery(uuid,uuid,boolean,text,text)',
    'EXECUTE'
  ),
  'only service_role can record Auth invitation delivery'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.cms_operator_set_super_admin(uuid,text,text,text)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    'public.cms_operator_set_super_admin(uuid,text,text,text)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'public.cms_operator_set_super_admin(uuid,text,text,text)',
    'EXECUTE'
  ),
  'bootstrap and break-glass ownership transfer are service-only'
);

-- Real Auth rows exercise the same confirmed-identity and role authority used
-- in production. All rows disappear with the surrounding transaction.
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
    'governance-owner-pgtap@example.invalid',
    '',
    statement_timestamp(),
    '{}'::jsonb,
    '{"full_name":"Governance Owner"}'::jsonb,
    statement_timestamp(),
    statement_timestamp()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '30000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'delegated-admin-pgtap@example.invalid',
    '',
    statement_timestamp(),
    '{}'::jsonb,
    '{"full_name":"Delegated Admin"}'::jsonb,
    statement_timestamp(),
    statement_timestamp()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '30000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'invited-admin-pgtap@example.invalid',
    '',
    null,
    '{}'::jsonb,
    '{}'::jsonb,
    statement_timestamp(),
    statement_timestamp()
  );

update public.account_roles
set role = 'admin'::public.smartmed_role
where user_id = '30000000-0000-4000-8000-000000000002';

create or replace function pg_temp.set_governance_auth_claims(
  p_user_id uuid,
  p_aal text,
  p_totp_age_seconds integer default null
)
returns void
language plpgsql
as $function$
declare
  jwt_claims jsonb;
begin
  jwt_claims := jsonb_build_object(
    'sub', p_user_id,
    'role', 'authenticated',
    'aal', p_aal
  );

  if p_totp_age_seconds is not null then
    jwt_claims := jwt_claims || jsonb_build_object(
      'amr',
      jsonb_build_array(
        jsonb_build_object(
          'method', 'totp',
          'timestamp',
          extract(epoch from statement_timestamp()) - p_totp_age_seconds
        )
      )
    );
  end if;

  perform set_config('request.jwt.claims', jwt_claims::text, true);
end
$function$;

create temporary table admin_governance_rpc_results (
  operation text primary key,
  result jsonb not null
) on commit drop;

-- The ownership RPC is not merely protected by SQL grants; it independently
-- verifies the service JWT claim as defense in depth.
select pg_temp.set_governance_auth_claims(
  '30000000-0000-4000-8000-000000000001',
  'aal2',
  0
);

select throws_ok(
  $$
    select public.cms_operator_set_super_admin(
      '30000000-0000-4000-8000-000000000001',
      'pgtap-browser',
      'A browser caller must not bootstrap ownership',
      'pgtap-browser-bootstrap'
    )
  $$,
  '42501',
  'Service-role request required',
  'an authenticated JWT cannot invoke the ownership operator RPC'
);

select set_config(
  'request.jwt.claims',
  '{"role":"service_role","aal":"aal1"}',
  true
);

select lives_ok(
  $$
    insert into admin_governance_rpc_results (operation, result)
    select
      'bootstrap',
      public.cms_operator_set_super_admin(
        '30000000-0000-4000-8000-000000000001',
        'pgtap-bootstrap',
        'Initial super-admin assignment for governance verification',
        'pgtap-bootstrap'
      )
  $$,
  'service_role can bootstrap the sole super-admin'
);

select is(
  (
    select count(*)
    from private.super_admin_assignment
    where singleton
      and user_id = '30000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'bootstrap creates exactly one owner assignment'
);
select results_eq(
  $$
    select role::text
    from public.account_roles
    where user_id = '30000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('admin'::text) $$,
  'bootstrap grants the owner the existing admin role without a new enum value'
);
select ok(
  (
    select (result ->> 'changed')::boolean
      and (result ->> 'isSuperAdmin')::boolean
      and result ->> 'role' = 'admin'
    from admin_governance_rpc_results
    where operation = 'bootstrap'
  ),
  'bootstrap returns a verified ownership receipt'
);

-- An ordinary administrator remains an administrator but cannot inspect or
-- mutate the governance control plane, even with a fresh AAL2/TOTP claim.
select pg_temp.set_governance_auth_claims(
  '30000000-0000-4000-8000-000000000002',
  'aal2',
  0
);

select is(
  public.cms_is_super_admin(),
  false,
  'a delegated administrator is not the super-admin'
);
select throws_ok(
  $$ select public.cms_list_administrators() $$,
  '42501',
  'Super-admin access denied',
  'a delegated administrator cannot list administrator governance data'
);
select throws_ok(
  $$
    select public.cms_prepare_admin_invitation(
      'blocked-invite-pgtap@example.invalid',
      'Blocked Invite',
      'A delegated admin must not issue invitations',
      'pgtap-blocked-invite'
    )
  $$,
  '42501',
  'Super-admin access denied',
  'a delegated administrator cannot invite another administrator'
);

-- The owner must satisfy both the normal admin AAL requirement and the
-- governance-specific recent TOTP requirement.
select pg_temp.set_governance_auth_claims(
  '30000000-0000-4000-8000-000000000001',
  'aal1',
  null
);

select throws_ok(
  $$ select public.cms_list_administrators() $$,
  '42501',
  'Super-admin access denied',
  'the owner is denied at AAL1'
);

select pg_temp.set_governance_auth_claims(
  '30000000-0000-4000-8000-000000000001',
  'aal2',
  601
);

select throws_ok(
  $$ select public.cms_list_administrators() $$,
  '42501',
  'A recent TOTP verification is required',
  'an AAL2 owner with stale TOTP verification is denied'
);

select pg_temp.set_governance_auth_claims(
  '30000000-0000-4000-8000-000000000001',
  'aal2',
  0
);

select lives_ok(
  $$
    insert into admin_governance_rpc_results (operation, result)
    select 'initial-overview', public.cms_list_administrators()
  $$,
  'the owner with recent AAL2/TOTP can list administrators'
);
select is(
  public.cms_is_super_admin(),
  true,
  'the authoritative owner lookup succeeds for the current owner'
);

-- Invitation delivery does not grant authority. The database grants admin
-- only after Auth confirms the exact invited identity and email.
select lives_ok(
  $$
    insert into admin_governance_rpc_results (operation, result)
    select
      'prepare-invite',
      public.cms_prepare_admin_invitation(
        'Invited-Admin-PgTAP@example.invalid',
        'Invited Administrator',
        'Invite a confirmed operational administrator for pgTAP coverage',
        'pgtap-invite'
      )
  $$,
  'the owner can prepare an administrator invitation'
);
select results_eq(
  $$
    select
      result ->> 'mode',
      result ->> 'email'
    from admin_governance_rpc_results
    where operation = 'prepare-invite'
  $$,
  $$
    values (
      'invitation-required'::text,
      'invited-admin-pgtap@example.invalid'::text
    )
  $$,
  'invitation preparation normalizes the email and returns a private ID'
);
select results_eq(
  $$
    select invitation.status
    from private.admin_invitations as invitation
    where invitation.id = (
      select (result ->> 'invitationId')::uuid
      from admin_governance_rpc_results
      where operation = 'prepare-invite'
    )
  $$,
  $$ values ('requested'::text) $$,
  'a prepared invitation starts in requested state'
);

select set_config(
  'request.jwt.claims',
  '{"role":"service_role","aal":"aal1"}',
  true
);

select lives_ok(
  $$
    insert into admin_governance_rpc_results (operation, result)
    select
      'mark-delivered',
      public.cms_mark_admin_invitation_delivery(
        (
          select (result ->> 'invitationId')::uuid
          from admin_governance_rpc_results
          where operation = 'prepare-invite'
        ),
        '30000000-0000-4000-8000-000000000003',
        true,
        null,
        'pgtap-invite'
      )
  $$,
  'service_role can bind delivered mail to the exact Auth identity'
);
select results_eq(
  $$
    select invitation.status
    from private.admin_invitations as invitation
    where invitation.id = (
      select (result ->> 'invitationId')::uuid
      from admin_governance_rpc_results
      where operation = 'prepare-invite'
    )
  $$,
  $$ values ('sent'::text) $$,
  'delivery alone leaves an unconfirmed invitation in sent state'
);
select results_eq(
  $$
    select role::text
    from public.account_roles
    where user_id = '30000000-0000-4000-8000-000000000003'
  $$,
  $$ values ('user'::text) $$,
  'delivery alone does not grant administrator authority'
);

update auth.users
set
  email_confirmed_at = statement_timestamp(),
  updated_at = statement_timestamp()
where id = '30000000-0000-4000-8000-000000000003';

select results_eq(
  $$
    select invitation.status
    from private.admin_invitations as invitation
    where invitation.id = (
      select (result ->> 'invitationId')::uuid
      from admin_governance_rpc_results
      where operation = 'prepare-invite'
    )
  $$,
  $$ values ('accepted'::text) $$,
  'Auth confirmation atomically accepts the invitation'
);
select results_eq(
  $$
    select role::text
    from public.account_roles
    where user_id = '30000000-0000-4000-8000-000000000003'
  $$,
  $$ values ('admin'::text) $$,
  'Auth confirmation grants the invited identity the admin role'
);
select results_eq(
  $$
    select audit.action
    from private.audit_log as audit
    where audit.correlation_id = 'pgtap-invite'
    order by audit.action
  $$,
  $$
    values
      ('cms.admin.granted'::text),
      ('cms.admin.invitation.accepted'::text),
      ('cms.admin.invitation.delivered'::text),
      ('cms.admin.invitation.requested'::text)
  $$,
  'request, delivery, confirmation, and role grant are fully audited'
);

-- The owner is protected both through the new browser RPC and through direct
-- or legacy service-role paths.
select pg_temp.set_governance_auth_claims(
  '30000000-0000-4000-8000-000000000001',
  'aal2',
  0
);

select throws_ok(
  $$
    select public.cms_revoke_admin(
      '30000000-0000-4000-8000-000000000001',
      'governance-owner-pgtap@example.invalid',
      'The owner must never revoke their own authority',
      'pgtap-owner-self-revoke'
    )
  $$,
  '42501',
  'A super-admin cannot revoke their own role',
  'the owner cannot revoke their own role through the browser RPC'
);
select throws_ok(
  $$
    update public.account_roles
    set role = 'user'::public.smartmed_role
    where user_id = '30000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  'The super-admin role cannot be removed or reassigned',
  'the owner cannot be demoted by a direct role update'
);
select throws_ok(
  $$
    delete from public.account_roles
    where user_id = '30000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  'The super-admin role cannot be removed or reassigned',
  'the owner role row cannot be deleted'
);
select throws_ok(
  $$
    delete from public.profiles
    where id = '30000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  'The super-admin profile cannot be removed or reassigned',
  'the owner profile cannot be deleted'
);
select throws_ok(
  $$ delete from private.super_admin_assignment where singleton $$,
  '42501',
  'The super-admin assignment cannot be deleted',
  'the singleton owner assignment cannot be deleted'
);

select set_config(
  'request.jwt.claims',
  '{"role":"service_role","aal":"aal1"}',
  true
);
select throws_ok(
  $$
    select public.cms_operator_revoke_admin(
      '30000000-0000-4000-8000-000000000001',
      'pgtap-legacy-operator',
      'Legacy operator revocation must not remove the owner',
      'pgtap-owner-operator-revoke'
    )
  $$,
  '42501',
  'The super-admin role cannot be removed or reassigned',
  'the legacy service operator cannot demote the owner'
);

-- Revoke a delegated administrator through the owner-only path.
select pg_temp.set_governance_auth_claims(
  '30000000-0000-4000-8000-000000000001',
  'aal2',
  0
);
select lives_ok(
  $$
    insert into admin_governance_rpc_results (operation, result)
    select
      'revoke-invited-admin',
      public.cms_revoke_admin(
        '30000000-0000-4000-8000-000000000003',
        'invited-admin-pgtap@example.invalid',
        'Remove delegated access after the governance verification',
        'pgtap-revoke'
      )
  $$,
  'the owner can revoke a delegated administrator'
);
select results_eq(
  $$
    select role::text
    from public.account_roles
    where user_id = '30000000-0000-4000-8000-000000000003'
  $$,
  $$ values ('user'::text) $$,
  'revocation immediately restores the delegated account to user'
);
select is(
  (
    select count(*)
    from private.audit_log
    where correlation_id = 'pgtap-revoke'
      and action = 'cms.admin.revoked'
  ),
  1::bigint,
  'administrator revocation writes one audit event'
);

-- Pending invitations can be cancelled by the owner and remain auditable.
select lives_ok(
  $$
    insert into admin_governance_rpc_results (operation, result)
    select
      'prepare-cancel',
      public.cms_prepare_admin_invitation(
        'cancelled-admin-pgtap@example.invalid',
        'Cancelled Administrator',
        'Create a pending invitation for cancellation verification',
        'pgtap-cancel'
      )
  $$,
  'the owner can create a second pending invitation'
);
select lives_ok(
  $$
    insert into admin_governance_rpc_results (operation, result)
    select
      'cancel-invite',
      public.cms_cancel_admin_invitation(
        (
          select (result ->> 'invitationId')::uuid
          from admin_governance_rpc_results
          where operation = 'prepare-cancel'
        ),
        'Cancel the invitation after the governance verification',
        'pgtap-cancel'
      )
  $$,
  'the owner can cancel a pending administrator invitation'
);
select results_eq(
  $$
    select invitation.status
    from private.admin_invitations as invitation
    where invitation.id = (
      select (result ->> 'invitationId')::uuid
      from admin_governance_rpc_results
      where operation = 'prepare-cancel'
    )
  $$,
  $$ values ('cancelled'::text) $$,
  'cancelled invitations leave the active lifecycle'
);
select results_eq(
  $$
    select audit.action
    from private.audit_log as audit
    where audit.correlation_id = 'pgtap-cancel'
    order by audit.action
  $$,
  $$
    values
      ('cms.admin.invitation.cancelled'::text),
      ('cms.admin.invitation.requested'::text)
  $$,
  'invitation request and cancellation are both audited'
);

select * from finish();

rollback;
