-- SmartMed super-admin ownership and administrator invitation control plane.
--
-- The public.smartmed_role enum deliberately remains unchanged. Both the
-- owner and delegated administrators keep role = 'admin'; ownership is a
-- separate, private, singleton property. Every browser mutation is performed
-- through a narrow SECURITY DEFINER RPC and every service mutation is guarded
-- by the service-role JWT claim.

begin;

-- ---------------------------------------------------------------------------
-- Private ownership and invitation state.
-- ---------------------------------------------------------------------------

create table private.super_admin_assignment (
  singleton boolean primary key default true
    constraint super_admin_assignment_singleton_check check (singleton),
  user_id uuid not null unique
    references auth.users(id) on delete restrict,
  assigned_at timestamptz not null default statement_timestamp(),
  assigned_by_reference text not null
    constraint super_admin_assignment_reference_check check (
      char_length(btrim(assigned_by_reference)) between 1 and 200
    ),
  reason text not null
    constraint super_admin_assignment_reason_check check (
      char_length(btrim(reason)) between 1 and 1000
    ),
  updated_at timestamptz not null default statement_timestamp()
);

create table private.admin_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null
    constraint admin_invitations_email_length_check check (
      char_length(btrim(email)) between 3 and 320
    ),
  normalized_email text generated always as (lower(btrim(email))) stored,
  display_name text
    constraint admin_invitations_display_name_check check (
      display_name is null
      or char_length(btrim(display_name)) between 2 and 100
    ),
  status text not null default 'requested'
    constraint admin_invitations_status_check check (
      status in (
        'requested',
        'sent',
        'accepted',
        'cancelled',
        'expired',
        'failed'
      )
    ),
  requested_by_user_id uuid not null,
  auth_user_id uuid references auth.users(id) on delete set null,
  reason text not null
    constraint admin_invitations_reason_check check (
      char_length(btrim(reason)) between 1 and 1000
    ),
  correlation_id text
    constraint admin_invitations_correlation_check check (
      correlation_id is null
      or char_length(btrim(correlation_id)) between 1 and 200
    ),
  requested_at timestamptz not null default statement_timestamp(),
  sent_at timestamptz,
  accepted_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by_user_id uuid,
  expired_at timestamptz,
  failed_at timestamptz,
  failure_code text
    constraint admin_invitations_failure_code_check check (
      failure_code is null
      or (
        char_length(failure_code) between 1 and 100
        and failure_code ~ '^[a-zA-Z0-9_.:-]+$'
      )
    ),
  expires_at timestamptz not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint admin_invitations_email_format_check check (
    normalized_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  constraint admin_invitations_expiry_check check (
    expires_at > requested_at
  ),
  constraint admin_invitations_state_check check (
    (
      status = 'requested'
      and sent_at is null
      and accepted_at is null
      and cancelled_at is null
      and expired_at is null
      and failed_at is null
      and failure_code is null
    )
    or (
      status = 'sent'
      and auth_user_id is not null
      and sent_at is not null
      and accepted_at is null
      and cancelled_at is null
      and expired_at is null
      and failed_at is null
      and failure_code is null
    )
    or (
      status = 'accepted'
      and auth_user_id is not null
      and sent_at is not null
      and accepted_at is not null
      and cancelled_at is null
      and expired_at is null
      and failed_at is null
      and failure_code is null
    )
    or (
      status = 'cancelled'
      and accepted_at is null
      and cancelled_at is not null
      and expired_at is null
      and failed_at is null
      and failure_code is null
    )
    or (
      status = 'expired'
      and accepted_at is null
      and cancelled_at is null
      and expired_at is not null
      and failed_at is null
      and failure_code is null
    )
    or (
      status = 'failed'
      and accepted_at is null
      and cancelled_at is null
      and expired_at is null
      and failed_at is not null
      and failure_code is not null
    )
  )
);

create unique index admin_invitations_one_active_email_idx
  on private.admin_invitations (normalized_email)
  where status in ('requested', 'sent');

create unique index admin_invitations_one_active_auth_user_idx
  on private.admin_invitations (auth_user_id)
  where auth_user_id is not null
    and status in ('requested', 'sent');

create index admin_invitations_requested_by_created_idx
  on private.admin_invitations (
    requested_by_user_id,
    created_at desc
  );

create index admin_invitations_status_expiry_idx
  on private.admin_invitations (status, expires_at)
  where status in ('requested', 'sent');

alter table private.super_admin_assignment enable row level security;
alter table private.admin_invitations enable row level security;

revoke all on table
  private.super_admin_assignment,
  private.admin_invitations
from public, anon, authenticated, service_role;

drop trigger if exists set_admin_invitations_updated_at
  on private.admin_invitations;
create trigger set_admin_invitations_updated_at
before update on private.admin_invitations
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Dedicated administrative audit writer. Unlike the editorial helper, this
-- writer can correctly identify private control-plane entities.
-- ---------------------------------------------------------------------------

create or replace function private.write_admin_audit(
  p_action text,
  p_entity_schema text,
  p_entity_table text,
  p_entity_id text,
  p_before_state jsonb,
  p_after_state jsonb,
  p_correlation_id text default null,
  p_operator_reference text default null,
  p_reason text default null,
  p_context jsonb default '{}'::jsonb,
  p_actor_type text default 'user',
  p_actor_user_id uuid default auth.uid()
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  audit_id bigint;
  effective_correlation_id text;
begin
  effective_correlation_id := nullif(btrim(coalesce(
    p_correlation_id,
    (
      coalesce(
        nullif(current_setting('request.headers', true), ''),
        '{}'
      )::jsonb ->> 'x-request-id'
    )
  )), '');

  if p_entity_schema not in ('public', 'private')
    or nullif(btrim(coalesce(p_action, '')), '') is null
    or char_length(p_action) > 200
    or nullif(btrim(coalesce(p_entity_table, '')), '') is null
    or char_length(p_entity_table) > 200
    or char_length(coalesce(p_entity_id, '')) > 300
    or char_length(coalesce(effective_correlation_id, '')) > 200
    or char_length(coalesce(p_operator_reference, '')) > 200
    or char_length(coalesce(p_reason, '')) > 1000
    or jsonb_typeof(coalesce(p_context, '{}'::jsonb)) <> 'object'
    or p_actor_type not in ('user', 'service', 'system', 'webhook')
  then
    raise exception 'Invalid administrative audit context'
      using errcode = '22023';
  end if;

  insert into private.audit_log (
    actor_user_id,
    actor_type,
    action,
    entity_schema,
    entity_table,
    entity_id,
    before_state,
    after_state,
    request_id,
    correlation_id,
    operator_reference,
    reason,
    context
  )
  values (
    p_actor_user_id,
    p_actor_type,
    btrim(p_action),
    p_entity_schema,
    btrim(p_entity_table),
    p_entity_id,
    p_before_state,
    p_after_state,
    effective_correlation_id,
    effective_correlation_id,
    nullif(btrim(p_operator_reference), ''),
    nullif(btrim(p_reason), ''),
    coalesce(p_context, '{}'::jsonb)
  )
  returning id into audit_id;

  return audit_id;
end
$function$;

-- ---------------------------------------------------------------------------
-- Ownership and recent-MFA authorization.
--
-- Supabase documents `amr` as an array ordered newest-first with a `method`
-- and Unix-seconds `timestamp`. The expression below is fail-closed for a
-- missing or malformed claim and accepts a TOTP verification no older than
-- ten minutes. The exact local-only MFA bypass remains governed by the
-- existing private.admin_security_settings singleton.
-- ---------------------------------------------------------------------------

create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    private.is_admin()
    and exists (
      select 1
      from private.super_admin_assignment as assignment
      where assignment.singleton
        and assignment.user_id = (select auth.uid())
    )
$function$;

create or replace function private.super_admin_recent_mfa_satisfied()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  require_mfa boolean;
  jwt_claims jsonb;
begin
  select settings.require_mfa
  into require_mfa
  from private.admin_security_settings as settings
  where settings.singleton;

  if not coalesce(require_mfa, true) then
    return true;
  end if;

  jwt_claims := coalesce((select auth.jwt()), '{}'::jsonb);

  if coalesce(jwt_claims ->> 'aal', '') <> 'aal2'
    or jsonb_typeof(jwt_claims -> 'amr') is distinct from 'array'
  then
    return false;
  end if;

  return exists (
    select 1
    from jsonb_array_elements(jwt_claims -> 'amr') as auth_method(value)
    where auth_method.value ->> 'method' = 'totp'
      and coalesce(auth_method.value ->> 'timestamp', '')
        ~ '^[0-9]{9,12}(?:\.[0-9]{1,6})?$'
      and (auth_method.value ->> 'timestamp')::numeric
        >= extract(
          epoch from statement_timestamp() - interval '10 minutes'
        )
      and (auth_method.value ->> 'timestamp')::numeric
        <= extract(
          epoch from statement_timestamp() + interval '1 minute'
        )
  );
end
$function$;

create or replace function private.require_super_admin(
  p_require_recent_mfa boolean default true
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if not private.is_super_admin() then
    raise exception 'Super-admin access denied'
      using errcode = '42501';
  end if;

  if coalesce(p_require_recent_mfa, true)
    and not private.super_admin_recent_mfa_satisfied()
  then
    raise exception 'A recent TOTP verification is required'
      using errcode = '42501';
  end if;
end
$function$;

-- ---------------------------------------------------------------------------
-- Owner invariants. These triggers also protect the owner from the older
-- service-only cms_operator_revoke_admin RPC.
-- ---------------------------------------------------------------------------

create or replace function private.validate_super_admin_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  auth_identity jsonb;
begin
  if tg_op = 'DELETE' then
    raise exception 'The super-admin assignment cannot be deleted'
      using errcode = '42501';
  end if;

  perform private.require_service_request();

  if not new.singleton then
    raise exception 'The super-admin singleton key must remain true'
      using errcode = '23514';
  end if;

  select to_jsonb(auth_user)
  into auth_identity
  from auth.users as auth_user
  where auth_user.id = new.user_id;

  if auth_identity is null
    or auth_identity ->> 'email_confirmed_at' is null
    or coalesce((auth_identity ->> 'is_anonymous')::boolean, false)
  then
    raise exception 'Super-admin identity must be confirmed and non-anonymous'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.account_roles as account_role
    where account_role.user_id = new.user_id
      and account_role.role = 'admin'::public.smartmed_role
  ) then
    raise exception 'Super-admin identity must already have the admin role'
      using errcode = '22023';
  end if;

  if tg_op = 'UPDATE'
    and new.user_id is distinct from old.user_id
    and not exists (
      select 1
      from auth.mfa_factors as factor
      where factor.user_id = new.user_id
        and factor.status = 'verified'
    )
  then
    raise exception 'A replacement super-admin must have verified MFA'
      using errcode = '22023';
  end if;

  return new;
end
$function$;

drop trigger if exists validate_super_admin_assignment
  on private.super_admin_assignment;
create trigger validate_super_admin_assignment
before insert or update or delete on private.super_admin_assignment
for each row execute function private.validate_super_admin_assignment();

create or replace function private.protect_super_admin_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if exists (
    select 1
    from private.super_admin_assignment as assignment
    where assignment.singleton
      and assignment.user_id = old.user_id
  ) and (
    tg_op = 'DELETE'
    or new.user_id is distinct from old.user_id
    or new.role is distinct from 'admin'::public.smartmed_role
  ) then
    raise exception 'The super-admin role cannot be removed or reassigned'
      using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end
$function$;

drop trigger if exists protect_super_admin_role on public.account_roles;
create trigger protect_super_admin_role
before update or delete on public.account_roles
for each row execute function private.protect_super_admin_role();

create or replace function private.protect_super_admin_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if exists (
    select 1
    from private.super_admin_assignment as assignment
    where assignment.singleton
      and assignment.user_id = old.id
  ) and (
    tg_op = 'DELETE'
    or new.id is distinct from old.id
  ) then
    raise exception 'The super-admin profile cannot be removed or reassigned'
      using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end
$function$;

drop trigger if exists protect_super_admin_profile on public.profiles;
create trigger protect_super_admin_profile
before update or delete on public.profiles
for each row execute function private.protect_super_admin_profile();

-- ---------------------------------------------------------------------------
-- Invitation lifecycle helpers and Auth confirmation trigger.
-- ---------------------------------------------------------------------------

create or replace function private.expire_admin_invitations()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  invitation_row private.admin_invitations%rowtype;
  expired_count integer := 0;
begin
  for invitation_row in
    select invitation.*
    from private.admin_invitations as invitation
    where invitation.status in ('requested', 'sent')
      and invitation.expires_at <= statement_timestamp()
    order by invitation.created_at, invitation.id
    for update skip locked
  loop
    update private.admin_invitations
    set
      status = 'expired',
      expired_at = statement_timestamp()
    where id = invitation_row.id;

    perform private.write_admin_audit(
      'cms.admin.invitation.expired',
      'private',
      'admin_invitations',
      invitation_row.id::text,
      jsonb_build_object('status', invitation_row.status),
      jsonb_build_object('status', 'expired'),
      invitation_row.correlation_id,
      null,
      null,
      jsonb_build_object('email', invitation_row.normalized_email),
      'system',
      null
    );

    expired_count := expired_count + 1;
  end loop;

  return expired_count;
end
$function$;

create or replace function private.accept_admin_invitation_for_user(
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  auth_identity jsonb;
  normalized_auth_email text;
  invitation_row private.admin_invitations%rowtype;
  previous_role public.smartmed_role;
  role_changed boolean;
begin
  perform private.expire_admin_invitations();

  select to_jsonb(auth_user)
  into auth_identity
  from auth.users as auth_user
  where auth_user.id = p_user_id;

  if auth_identity is null
    or auth_identity ->> 'email_confirmed_at' is null
    or coalesce((auth_identity ->> 'is_anonymous')::boolean, false)
    or nullif(btrim(coalesce(auth_identity ->> 'email', '')), '') is null
  then
    return jsonb_build_object(
      'accepted', false,
      'changed', false
    );
  end if;

  normalized_auth_email := lower(btrim(auth_identity ->> 'email'));

  select invitation.*
  into invitation_row
  from private.admin_invitations as invitation
  where invitation.status = 'sent'
    and invitation.auth_user_id = p_user_id
    and invitation.normalized_email = normalized_auth_email
    and invitation.expires_at > statement_timestamp()
  order by invitation.sent_at desc, invitation.id desc
  limit 1
  for update;

  if not found then
    return jsonb_build_object(
      'accepted', false,
      'changed', false
    );
  end if;

  insert into public.profiles as profile (id, full_name)
  values (
    p_user_id,
    nullif(btrim(coalesce(invitation_row.display_name, '')), '')
  )
  on conflict (id) do update
  set full_name = coalesce(
    nullif(btrim(coalesce(invitation_row.display_name, '')), ''),
    profile.full_name
  );

  select account_role.role
  into previous_role
  from public.account_roles as account_role
  where account_role.user_id = p_user_id
  for update;

  role_changed := previous_role is distinct from
    'admin'::public.smartmed_role;

  insert into public.account_roles (user_id, role)
  values (p_user_id, 'admin'::public.smartmed_role)
  on conflict (user_id) do update
  set role = excluded.role;

  update private.admin_invitations
  set
    status = 'accepted',
    accepted_at = statement_timestamp()
  where id = invitation_row.id;

  perform private.write_admin_audit(
    'cms.admin.invitation.accepted',
    'private',
    'admin_invitations',
    invitation_row.id::text,
    jsonb_build_object('status', 'sent'),
    jsonb_build_object(
      'status', 'accepted',
      'targetUserId', p_user_id
    ),
    invitation_row.correlation_id,
    null,
    invitation_row.reason,
    jsonb_build_object('email', invitation_row.normalized_email),
    'system',
    invitation_row.requested_by_user_id
  );

  if role_changed then
    perform private.write_admin_audit(
      'cms.admin.granted',
      'public',
      'account_roles',
      p_user_id::text,
      jsonb_build_object('role', previous_role),
      jsonb_build_object('role', 'admin'),
      invitation_row.correlation_id,
      null,
      invitation_row.reason,
      jsonb_build_object(
        'source', 'admin_invitation',
        'invitationId', invitation_row.id,
        'email', invitation_row.normalized_email
      ),
      'system',
      invitation_row.requested_by_user_id
    );
  end if;

  return jsonb_build_object(
    'accepted', true,
    'changed', role_changed,
    'invitationId', invitation_row.id,
    'userId', p_user_id,
    'email', invitation_row.normalized_email,
    'role', 'admin'
  );
end
$function$;

create or replace function private.accept_confirmed_admin_invitation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if old.email_confirmed_at is null
    and new.email_confirmed_at is not null
  then
    perform private.accept_admin_invitation_for_user(new.id);
  end if;

  return new;
end
$function$;

drop trigger if exists on_auth_user_confirmed_accept_admin_invitation
  on auth.users;
create trigger on_auth_user_confirmed_accept_admin_invitation
after update of email_confirmed_at on auth.users
for each row
when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
execute function private.accept_confirmed_admin_invitation();

-- ---------------------------------------------------------------------------
-- Browser RPCs.
-- ---------------------------------------------------------------------------

create or replace function public.cms_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select private.is_super_admin()
$function$;

create or replace function public.cms_list_administrators()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  administrators jsonb;
  invitations jsonb;
begin
  perform private.require_super_admin(true);
  perform private.expire_admin_invitations();

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', administrator.id,
        'email', administrator.email,
        'fullName', coalesce(
          nullif(btrim(administrator.full_name), ''),
          administrator.email
        ),
        'createdAt', administrator.created_at,
        'grantedAt', administrator.granted_at,
        'lastSignInAt', administrator.last_sign_in_at,
        'isSuperAdmin', administrator.is_super_admin
      )
      order by administrator.is_super_admin desc,
        administrator.granted_at,
        administrator.id
    ),
    '[]'::jsonb
  )
  into administrators
  from (
    select
      auth_user.id,
      auth_user.email,
      profile.full_name,
      auth_user.created_at,
      account_role.updated_at as granted_at,
      auth_user.last_sign_in_at,
      assignment.user_id is not null as is_super_admin
    from public.account_roles as account_role
    join auth.users as auth_user
      on auth_user.id = account_role.user_id
    left join public.profiles as profile
      on profile.id = auth_user.id
    left join private.super_admin_assignment as assignment
      on assignment.singleton
      and assignment.user_id = auth_user.id
    where account_role.role = 'admin'::public.smartmed_role
      and auth_user.email_confirmed_at is not null
      and coalesce(
        (to_jsonb(auth_user) ->> 'is_anonymous')::boolean,
        false
      ) = false
  ) as administrator;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', invitation.id,
        'email', invitation.normalized_email,
        'displayName', invitation.display_name,
        'status', invitation.status,
        'reason', invitation.reason,
        'createdAt', invitation.created_at,
        'sentAt', invitation.sent_at,
        'expiresAt', invitation.expires_at
      )
      order by invitation.created_at desc, invitation.id desc
    ),
    '[]'::jsonb
  )
  into invitations
  from (
    select listed_invitation.*
    from private.admin_invitations as listed_invitation
    where listed_invitation.status in ('requested', 'sent', 'failed')
    order by listed_invitation.created_at desc, listed_invitation.id desc
    limit 100
  ) as invitation;

  return jsonb_build_object(
    'administrators', administrators,
    'invitations', invitations
  );
end
$function$;

create or replace function public.cms_prepare_admin_invitation(
  p_email text,
  p_display_name text,
  p_reason text,
  p_correlation_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  effective_email text;
  normalized_display_name text;
  auth_identity jsonb;
  auth_user_id uuid;
  previous_role public.smartmed_role;
  active_invitation private.admin_invitations%rowtype;
  created_invitation private.admin_invitations%rowtype;
  recent_request_count integer;
begin
  perform private.require_super_admin(true);
  perform private.expire_admin_invitations();

  effective_email := lower(btrim(coalesce(p_email, '')));
  normalized_display_name := nullif(btrim(coalesce(p_display_name, '')), '');

  if char_length(effective_email) not between 3 and 320
    or effective_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  then
    raise exception 'A valid administrator email is required'
      using errcode = '22023';
  end if;

  if normalized_display_name is not null
    and char_length(normalized_display_name) not between 2 and 100
  then
    raise exception 'Display name must contain 2 to 100 characters'
      using errcode = '22023';
  end if;

  if nullif(btrim(coalesce(p_reason, '')), '') is null
    or char_length(p_reason) > 1000
  then
    raise exception 'A reason is required'
      using errcode = '22023';
  end if;

  if char_length(coalesce(nullif(btrim(p_correlation_id), ''), '')) > 200
  then
    raise exception 'Invalid correlation identifier'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'smartmed.admin.invitation:' || effective_email,
      0
    )
  );

  select to_jsonb(auth_user), auth_user.id
  into auth_identity, auth_user_id
  from auth.users as auth_user
  where lower(btrim(coalesce(auth_user.email, ''))) = effective_email
  order by auth_user.created_at
  limit 1;

  if auth_identity is not null
    and coalesce((auth_identity ->> 'is_anonymous')::boolean, false)
  then
    raise exception 'Anonymous identities cannot become administrators'
      using errcode = '22023';
  end if;

  if auth_identity is not null
    and auth_identity ->> 'email_confirmed_at' is not null
  then
    select account_role.role
    into previous_role
    from public.account_roles as account_role
    where account_role.user_id = auth_user_id
    for update;

    if previous_role = 'admin'::public.smartmed_role then
      return jsonb_build_object(
        'mode', 'already-admin',
        'email', effective_email,
        'invitationId', null
      );
    end if;

    insert into public.profiles as profile (id, full_name)
    values (auth_user_id, normalized_display_name)
    on conflict (id) do update
    set full_name = coalesce(normalized_display_name, profile.full_name);

    insert into public.account_roles (user_id, role)
    values (auth_user_id, 'admin'::public.smartmed_role)
    on conflict (user_id) do update
    set role = excluded.role;

    perform private.write_admin_audit(
      'cms.admin.granted',
      'public',
      'account_roles',
      auth_user_id::text,
      jsonb_build_object('role', previous_role),
      jsonb_build_object('role', 'admin'),
      p_correlation_id,
      null,
      p_reason,
      jsonb_build_object(
        'source', 'existing_account',
        'email', effective_email
      ),
      'user',
      (select auth.uid())
    );

    return jsonb_build_object(
      'mode', 'existing-granted',
      'email', effective_email,
      'invitationId', null
    );
  end if;

  select invitation.*
  into active_invitation
  from private.admin_invitations as invitation
  where invitation.normalized_email = effective_email
    and invitation.status in ('requested', 'sent')
  order by invitation.created_at desc
  limit 1
  for update;

  if found then
    return jsonb_build_object(
      'mode', case
        when active_invitation.status = 'sent' then 'already-pending'
        else 'invitation-required'
      end,
      'email', active_invitation.normalized_email,
      'invitationId', active_invitation.id
    );
  end if;

  select count(*)::integer
  into recent_request_count
  from private.admin_invitations as invitation
  where invitation.requested_by_user_id = (select auth.uid())
    and invitation.created_at
      >= statement_timestamp() - interval '1 hour';

  if recent_request_count >= 10 then
    raise exception 'Administrator invitation rate limit exceeded'
      using errcode = '54000';
  end if;

  insert into private.admin_invitations (
    email,
    display_name,
    status,
    requested_by_user_id,
    auth_user_id,
    reason,
    correlation_id,
    expires_at
  )
  values (
    effective_email,
    normalized_display_name,
    'requested',
    (select auth.uid()),
    auth_user_id,
    btrim(p_reason),
    nullif(btrim(p_correlation_id), ''),
    statement_timestamp() + interval '1 hour'
  )
  returning * into created_invitation;

  perform private.write_admin_audit(
    'cms.admin.invitation.requested',
    'private',
    'admin_invitations',
    created_invitation.id::text,
    null,
    jsonb_build_object(
      'status', created_invitation.status,
      'email', created_invitation.normalized_email,
      'expiresAt', created_invitation.expires_at
    ),
    created_invitation.correlation_id,
    null,
    created_invitation.reason,
    jsonb_build_object(
      'existingUnconfirmedIdentity', auth_user_id is not null
    ),
    'user',
    created_invitation.requested_by_user_id
  );

  return jsonb_build_object(
    'mode', 'invitation-required',
    'email', created_invitation.normalized_email,
    'invitationId', created_invitation.id
  );
end
$function$;

create or replace function public.cms_cancel_admin_invitation(
  p_invitation_id uuid,
  p_reason text,
  p_correlation_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  invitation_row private.admin_invitations%rowtype;
begin
  perform private.require_super_admin(true);
  perform private.expire_admin_invitations();

  if nullif(btrim(coalesce(p_reason, '')), '') is null
    or char_length(p_reason) > 1000
  then
    raise exception 'A cancellation reason is required'
      using errcode = '22023';
  end if;

  select invitation.*
  into invitation_row
  from private.admin_invitations as invitation
  where invitation.id = p_invitation_id
  for update;

  if not found then
    raise exception 'Administrator invitation not found'
      using errcode = 'P0002';
  end if;

  if invitation_row.status = 'cancelled' then
    return jsonb_build_object(
      'changed', false,
      'id', invitation_row.id,
      'email', invitation_row.normalized_email,
      'status', invitation_row.status
    );
  end if;

  if invitation_row.status not in ('requested', 'sent') then
    raise exception 'Only an active administrator invitation can be cancelled'
      using errcode = '22023';
  end if;

  update private.admin_invitations
  set
    status = 'cancelled',
    cancelled_at = statement_timestamp(),
    cancelled_by_user_id = (select auth.uid())
  where id = invitation_row.id;

  perform private.write_admin_audit(
    'cms.admin.invitation.cancelled',
    'private',
    'admin_invitations',
    invitation_row.id::text,
    jsonb_build_object('status', invitation_row.status),
    jsonb_build_object('status', 'cancelled'),
    coalesce(p_correlation_id, invitation_row.correlation_id),
    null,
    p_reason,
    jsonb_build_object('email', invitation_row.normalized_email),
    'user',
    (select auth.uid())
  );

  return jsonb_build_object(
    'changed', true,
    'id', invitation_row.id,
    'email', invitation_row.normalized_email,
    'status', 'cancelled'
  );
end
$function$;

create or replace function public.cms_revoke_admin(
  p_target_user_id uuid,
  p_confirmation_email text,
  p_reason text,
  p_correlation_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  auth_identity jsonb;
  normalized_auth_email text;
  normalized_confirmation_email text;
  previous_role public.smartmed_role;
begin
  perform private.require_super_admin(true);

  if p_target_user_id is null then
    raise exception 'Target administrator is required'
      using errcode = '22023';
  end if;

  if p_target_user_id = (select auth.uid()) then
    raise exception 'A super-admin cannot revoke their own role'
      using errcode = '42501';
  end if;

  if exists (
    select 1
    from private.super_admin_assignment as assignment
    where assignment.singleton
      and assignment.user_id = p_target_user_id
  ) then
    raise exception 'The super-admin role cannot be revoked'
      using errcode = '42501';
  end if;

  if nullif(btrim(coalesce(p_reason, '')), '') is null
    or char_length(p_reason) > 1000
  then
    raise exception 'A revocation reason is required'
      using errcode = '22023';
  end if;

  normalized_confirmation_email := lower(btrim(coalesce(
    p_confirmation_email,
    ''
  )));

  select to_jsonb(auth_user)
  into auth_identity
  from auth.users as auth_user
  where auth_user.id = p_target_user_id;

  if auth_identity is null
    or nullif(btrim(coalesce(auth_identity ->> 'email', '')), '') is null
  then
    raise exception 'Target administrator not found'
      using errcode = 'P0002';
  end if;

  normalized_auth_email := lower(btrim(auth_identity ->> 'email'));

  if normalized_confirmation_email <> normalized_auth_email then
    raise exception 'Confirmation email does not match the target account'
      using errcode = '22023';
  end if;

  select account_role.role
  into previous_role
  from public.account_roles as account_role
  where account_role.user_id = p_target_user_id
  for update;

  if previous_role is distinct from 'admin'::public.smartmed_role then
    return jsonb_build_object(
      'changed', false,
      'id', p_target_user_id,
      'email', normalized_auth_email,
      'role', coalesce(previous_role::text, 'user')
    );
  end if;

  update public.account_roles
  set role = 'user'::public.smartmed_role
  where user_id = p_target_user_id;

  perform private.write_admin_audit(
    'cms.admin.revoked',
    'public',
    'account_roles',
    p_target_user_id::text,
    jsonb_build_object('role', previous_role),
    jsonb_build_object('role', 'user'),
    p_correlation_id,
    null,
    p_reason,
    jsonb_build_object('email', normalized_auth_email),
    'user',
    (select auth.uid())
  );

  return jsonb_build_object(
    'changed', true,
    'id', p_target_user_id,
    'email', normalized_auth_email,
    'role', 'user'
  );
end
$function$;

-- ---------------------------------------------------------------------------
-- Service-only delivery and ownership RPCs.
-- ---------------------------------------------------------------------------

create or replace function public.cms_mark_admin_invitation_delivery(
  p_invitation_id uuid,
  p_target_user_id uuid,
  p_delivered boolean,
  p_error_code text default null,
  p_correlation_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  invitation_row private.admin_invitations%rowtype;
  auth_identity jsonb;
  normalized_auth_email text;
  acceptance_result jsonb;
  resulting_status text;
begin
  perform private.require_service_request();
  perform private.expire_admin_invitations();

  if p_delivered is null then
    raise exception 'Delivery outcome must be explicit'
      using errcode = '22023';
  end if;

  if char_length(coalesce(nullif(btrim(p_correlation_id), ''), '')) > 200
  then
    raise exception 'Invalid correlation identifier'
      using errcode = '22023';
  end if;

  select invitation.*
  into invitation_row
  from private.admin_invitations as invitation
  where invitation.id = p_invitation_id
  for update;

  if not found then
    raise exception 'Administrator invitation not found'
      using errcode = 'P0002';
  end if;

  if p_delivered
    and invitation_row.status in ('sent', 'accepted')
    and invitation_row.auth_user_id = p_target_user_id
  then
    return jsonb_build_object(
      'changed', false,
      'id', invitation_row.id,
      'email', invitation_row.normalized_email,
      'status', invitation_row.status,
      'targetUserId', invitation_row.auth_user_id
    );
  end if;

  if not p_delivered
    and invitation_row.status = 'failed'
  then
    return jsonb_build_object(
      'changed', false,
      'id', invitation_row.id,
      'email', invitation_row.normalized_email,
      'status', invitation_row.status
    );
  end if;

  if invitation_row.status <> 'requested' then
    raise exception 'Only a requested invitation can record delivery'
      using errcode = '22023';
  end if;

  if p_delivered then
    if p_target_user_id is null
      or nullif(btrim(coalesce(p_error_code, '')), '') is not null
    then
      raise exception 'Successful delivery requires only a target user ID'
        using errcode = '22023';
    end if;

    select to_jsonb(auth_user)
    into auth_identity
    from auth.users as auth_user
    where auth_user.id = p_target_user_id;

    if auth_identity is null
      or coalesce((auth_identity ->> 'is_anonymous')::boolean, false)
      or nullif(btrim(coalesce(auth_identity ->> 'email', '')), '') is null
    then
      raise exception 'Invitation target must be a non-anonymous Auth user'
        using errcode = '22023';
    end if;

    normalized_auth_email := lower(btrim(auth_identity ->> 'email'));

    if normalized_auth_email <> invitation_row.normalized_email
      or (
        invitation_row.auth_user_id is not null
        and invitation_row.auth_user_id <> p_target_user_id
      )
    then
      raise exception 'Invitation target does not match the authorized email'
        using errcode = '42501';
    end if;

    update private.admin_invitations
    set
      status = 'sent',
      auth_user_id = p_target_user_id,
      sent_at = statement_timestamp()
    where id = invitation_row.id;

    perform private.write_admin_audit(
      'cms.admin.invitation.delivered',
      'private',
      'admin_invitations',
      invitation_row.id::text,
      jsonb_build_object('status', 'requested'),
      jsonb_build_object(
        'status', 'sent',
        'targetUserId', p_target_user_id
      ),
      coalesce(p_correlation_id, invitation_row.correlation_id),
      null,
      null,
      jsonb_build_object('email', invitation_row.normalized_email),
      'service',
      null
    );

    acceptance_result := private.accept_admin_invitation_for_user(
      p_target_user_id
    );

    select invitation.status
    into resulting_status
    from private.admin_invitations as invitation
    where invitation.id = invitation_row.id;

    return jsonb_build_object(
      'changed', true,
      'id', invitation_row.id,
      'email', invitation_row.normalized_email,
      'status', resulting_status,
      'targetUserId', p_target_user_id,
      'accepted', coalesce(
        (acceptance_result ->> 'accepted')::boolean,
        false
      )
    );
  end if;

  if p_target_user_id is not null
    or nullif(btrim(coalesce(p_error_code, '')), '') is null
    or char_length(p_error_code) > 100
    or p_error_code !~ '^[a-zA-Z0-9_.:-]+$'
  then
    raise exception 'Failed delivery requires only a safe error code'
      using errcode = '22023';
  end if;

  update private.admin_invitations
  set
    status = 'failed',
    failed_at = statement_timestamp(),
    failure_code = p_error_code
  where id = invitation_row.id;

  perform private.write_admin_audit(
    'cms.admin.invitation.failed',
    'private',
    'admin_invitations',
    invitation_row.id::text,
    jsonb_build_object('status', 'requested'),
    jsonb_build_object(
      'status', 'failed',
      'failureCode', p_error_code
    ),
    coalesce(p_correlation_id, invitation_row.correlation_id),
    null,
    null,
    jsonb_build_object('email', invitation_row.normalized_email),
    'service',
    null
  );

  return jsonb_build_object(
    'changed', true,
    'id', invitation_row.id,
    'email', invitation_row.normalized_email,
    'status', 'failed'
  );
end
$function$;

create or replace function public.cms_operator_set_super_admin(
  p_user_id uuid,
  p_operator_reference text,
  p_reason text,
  p_correlation_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  auth_identity jsonb;
  current_owner_user_id uuid;
  previous_role public.smartmed_role;
  role_changed boolean := false;
  assignment_changed boolean := false;
  action_name text;
begin
  perform private.require_service_request();

  if p_user_id is null
    or nullif(btrim(coalesce(p_operator_reference, '')), '') is null
    or char_length(p_operator_reference) > 200
    or nullif(btrim(coalesce(p_reason, '')), '') is null
    or char_length(p_reason) > 1000
    or char_length(coalesce(nullif(btrim(p_correlation_id), ''), '')) > 200
  then
    raise exception 'User, operator reference, and reason are required'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('smartmed.super_admin_assignment', 0)
  );

  select to_jsonb(auth_user)
  into auth_identity
  from auth.users as auth_user
  where auth_user.id = p_user_id;

  if auth_identity is null then
    raise exception 'Auth user not found'
      using errcode = 'P0002';
  end if;

  if auth_identity ->> 'email_confirmed_at' is null
    or coalesce((auth_identity ->> 'is_anonymous')::boolean, false)
  then
    raise exception 'Super-admin identity must be confirmed and non-anonymous'
      using errcode = '22023';
  end if;

  select assignment.user_id
  into current_owner_user_id
  from private.super_admin_assignment as assignment
  where assignment.singleton
  for update;

  select account_role.role
  into previous_role
  from public.account_roles as account_role
  where account_role.user_id = p_user_id
  for update;

  if current_owner_user_id is null then
    insert into public.profiles (id, full_name)
    values (p_user_id, null)
    on conflict (id) do nothing;

    role_changed := previous_role is distinct from
      'admin'::public.smartmed_role;

    insert into public.account_roles (user_id, role)
    values (p_user_id, 'admin'::public.smartmed_role)
    on conflict (user_id) do update
    set role = excluded.role;

    insert into private.super_admin_assignment (
      singleton,
      user_id,
      assigned_at,
      assigned_by_reference,
      reason,
      updated_at
    )
    values (
      true,
      p_user_id,
      statement_timestamp(),
      btrim(p_operator_reference),
      btrim(p_reason),
      statement_timestamp()
    );

    assignment_changed := true;
    action_name := 'cms.super_admin.assigned';
  elsif current_owner_user_id = p_user_id then
    return jsonb_build_object(
      'changed', false,
      'userId', p_user_id,
      'role', 'admin',
      'isSuperAdmin', true
    );
  else
    if previous_role is distinct from 'admin'::public.smartmed_role then
      raise exception 'Replacement super-admin must already be an administrator'
        using errcode = '22023';
    end if;

    if not exists (
      select 1
      from auth.mfa_factors as factor
      where factor.user_id = p_user_id
        and factor.status = 'verified'
    ) then
      raise exception 'Replacement super-admin must have verified MFA'
        using errcode = '22023';
    end if;

    update private.super_admin_assignment
    set
      user_id = p_user_id,
      assigned_at = statement_timestamp(),
      assigned_by_reference = btrim(p_operator_reference),
      reason = btrim(p_reason),
      updated_at = statement_timestamp()
    where singleton;

    assignment_changed := true;
    action_name := 'cms.super_admin.transferred';
  end if;

  if role_changed then
    perform private.write_admin_audit(
      'cms.admin.granted',
      'public',
      'account_roles',
      p_user_id::text,
      jsonb_build_object('role', previous_role),
      jsonb_build_object('role', 'admin'),
      p_correlation_id,
      p_operator_reference,
      p_reason,
      jsonb_build_object('source', 'super_admin_bootstrap'),
      'service',
      null
    );
  end if;

  if assignment_changed then
    perform private.write_admin_audit(
      action_name,
      'private',
      'super_admin_assignment',
      'singleton',
      case
        when current_owner_user_id is null then null
        else jsonb_build_object('userId', current_owner_user_id)
      end,
      jsonb_build_object('userId', p_user_id),
      p_correlation_id,
      p_operator_reference,
      p_reason,
      jsonb_build_object(
        'previousSuperAdminUserId', current_owner_user_id
      ),
      'service',
      null
    );
  end if;

  return jsonb_build_object(
    'changed', assignment_changed,
    'userId', p_user_id,
    'role', 'admin',
    'isSuperAdmin', true,
    'previousSuperAdminUserId', current_owner_user_id
  );
end
$function$;

-- ---------------------------------------------------------------------------
-- Least-privilege function grants.
-- ---------------------------------------------------------------------------

revoke all on function private.write_admin_audit(
  text,
  text,
  text,
  text,
  jsonb,
  jsonb,
  text,
  text,
  text,
  jsonb,
  text,
  uuid
) from public, anon, authenticated, service_role;
revoke all on function private.is_super_admin()
  from public, anon, authenticated, service_role;
revoke all on function private.super_admin_recent_mfa_satisfied()
  from public, anon, authenticated, service_role;
revoke all on function private.require_super_admin(boolean)
  from public, anon, authenticated, service_role;
revoke all on function private.validate_super_admin_assignment()
  from public, anon, authenticated, service_role;
revoke all on function private.protect_super_admin_role()
  from public, anon, authenticated, service_role;
revoke all on function private.protect_super_admin_profile()
  from public, anon, authenticated, service_role;
revoke all on function private.expire_admin_invitations()
  from public, anon, authenticated, service_role;
revoke all on function private.accept_admin_invitation_for_user(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.accept_confirmed_admin_invitation()
  from public, anon, authenticated, service_role;

revoke all on function public.cms_is_super_admin()
  from public, anon, authenticated, service_role;
revoke all on function public.cms_list_administrators()
  from public, anon, authenticated, service_role;
revoke all on function public.cms_prepare_admin_invitation(
  text,
  text,
  text,
  text
) from public, anon, authenticated, service_role;
revoke all on function public.cms_mark_admin_invitation_delivery(
  uuid,
  uuid,
  boolean,
  text,
  text
) from public, anon, authenticated, service_role;
revoke all on function public.cms_cancel_admin_invitation(
  uuid,
  text,
  text
) from public, anon, authenticated, service_role;
revoke all on function public.cms_revoke_admin(
  uuid,
  text,
  text,
  text
) from public, anon, authenticated, service_role;
revoke all on function public.cms_operator_set_super_admin(
  uuid,
  text,
  text,
  text
) from public, anon, authenticated, service_role;

grant execute on function public.cms_is_super_admin()
  to authenticated;
grant execute on function public.cms_list_administrators()
  to authenticated;
grant execute on function public.cms_prepare_admin_invitation(
  text,
  text,
  text,
  text
) to authenticated;
grant execute on function public.cms_cancel_admin_invitation(
  uuid,
  text,
  text
) to authenticated;
grant execute on function public.cms_revoke_admin(
  uuid,
  text,
  text,
  text
) to authenticated;

grant execute on function public.cms_mark_admin_invitation_delivery(
  uuid,
  uuid,
  boolean,
  text,
  text
) to service_role;
grant execute on function public.cms_operator_set_super_admin(
  uuid,
  text,
  text,
  text
) to service_role;

comment on table private.super_admin_assignment is
  'Single immutable SmartMed owner assignment; transfer is service-only.';
comment on table private.admin_invitations is
  'Private, auditable administrator invitation lifecycle without invite tokens.';
comment on function public.cms_operator_set_super_admin(
  uuid,
  text,
  text,
  text
) is
  'Service-only idempotent bootstrap or break-glass transfer of the sole super-admin.';

commit;
