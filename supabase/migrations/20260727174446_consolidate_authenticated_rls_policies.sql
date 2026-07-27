-- Consolidate authenticated RLS policies to one permissive policy per
-- table/command. Supabase's performance advisor reports multiple permissive
-- policies when the former admin_manage FOR ALL policy overlaps a public/own
-- policy for the authenticated role.
--
-- Exact semantics are preserved:
--   * anon keeps the existing anonymous policy expressions;
--   * authenticated gets admin OR the previous authenticated expression;
--   * commands that previously had only admin_manage remain admin-only;
--   * grants remain unchanged and continue to be the outer privilege boundary.

begin;

create temporary table smartmed_policy_snapshot
on commit drop
as
select
  policy.oid as policy_oid,
  policy.polrelid as table_oid,
  namespace.nspname as schema_name,
  relation.relname as table_name,
  policy.polname as policy_name,
  policy.polcmd::text as command_code,
  policy.polpermissive as is_permissive,
  pg_get_expr(policy.polqual, policy.polrelid) as using_expression,
  pg_get_expr(policy.polwithcheck, policy.polrelid) as check_expression,
  (
    0::oid = any(policy.polroles)
    or authenticated_role.oid = any(policy.polroles)
  ) as applies_to_authenticated,
  (
    0::oid = any(policy.polroles)
    or anon_role.oid = any(policy.polroles)
  ) as applies_to_anon,
  0::oid = any(policy.polroles) as targets_public
from pg_policy as policy
join pg_class as relation
  on relation.oid = policy.polrelid
join pg_namespace as namespace
  on namespace.oid = relation.relnamespace
cross join (
  select oid
  from pg_roles
  where rolname = 'authenticated'
) as authenticated_role
cross join (
  select oid
  from pg_roles
  where rolname = 'anon'
) as anon_role
where namespace.nspname = 'public'
  and relation.relkind in ('r', 'p')
  and relation.relrowsecurity;

do $migration$
begin
  if exists (
    select 1
    from smartmed_policy_snapshot
    where applies_to_authenticated
      and not is_permissive
  ) then
    raise exception
      'Refusing to consolidate unexpected restrictive authenticated policies';
  end if;

  if exists (
    select 1
    from smartmed_policy_snapshot
    where applies_to_authenticated
      and targets_public
  ) then
    raise exception
      'Refusing to narrow a PUBLIC policy without an explicit role review';
  end if;
end
$migration$;

do $migration$
declare
  policy_record record;
  table_record record;
  command_record record;
  previous_using text;
  previous_check text;
  effective_using text;
  effective_check text;
  consolidated_policy_name text;
begin
  -- Mixed anon/authenticated policies become anon-only. Authenticated-only
  -- policies, including admin_manage, are replaced below.
  for policy_record in
    select *
    from smartmed_policy_snapshot
    where applies_to_authenticated
    order by schema_name, table_name, policy_name
  loop
    if policy_record.applies_to_anon
      and policy_record.policy_name <> 'admin_manage'
    then
      execute format(
        'alter policy %I on %I.%I to anon',
        policy_record.policy_name,
        policy_record.schema_name,
        policy_record.table_name
      );
    else
      execute format(
        'drop policy %I on %I.%I',
        policy_record.policy_name,
        policy_record.schema_name,
        policy_record.table_name
      );
    end if;
  end loop;

  for table_record in
    select distinct table_oid, schema_name, table_name
    from smartmed_policy_snapshot
    where applies_to_authenticated
    order by schema_name, table_name
  loop
    for command_record in
      select *
      from (
        values
          ('r'::text, 'select'::text),
          ('a'::text, 'insert'::text),
          ('w'::text, 'update'::text),
          ('d'::text, 'delete'::text)
      ) as commands(command_code, command_name)
    loop
      select string_agg(
        '(' || snapshot.using_expression || ')',
        ' or '
        order by snapshot.policy_name
      )
      into previous_using
      from smartmed_policy_snapshot as snapshot
      where snapshot.table_oid = table_record.table_oid
        and snapshot.applies_to_authenticated
        and snapshot.policy_name <> 'admin_manage'
        and snapshot.command_code in ('*', command_record.command_code)
        and snapshot.using_expression is not null;

      select string_agg(
        '(' || coalesce(
          snapshot.check_expression,
          snapshot.using_expression,
          'true'
        ) || ')',
        ' or '
        order by snapshot.policy_name
      )
      into previous_check
      from smartmed_policy_snapshot as snapshot
      where snapshot.table_oid = table_record.table_oid
        and snapshot.applies_to_authenticated
        and snapshot.policy_name <> 'admin_manage'
        and snapshot.command_code in ('*', command_record.command_code)
        and command_record.command_code in ('a', 'w');

      effective_using := '(select private.is_admin())';
      if previous_using is not null then
        effective_using :=
          effective_using || ' or (' || previous_using || ')';
      end if;

      effective_check := '(select private.is_admin())';
      if previous_check is not null then
        effective_check :=
          effective_check || ' or (' || previous_check || ')';
      end if;

      consolidated_policy_name :=
        'authenticated_' || command_record.command_name || '_access';

      execute format(
        'drop policy if exists %I on %I.%I',
        consolidated_policy_name,
        table_record.schema_name,
        table_record.table_name
      );

      case command_record.command_code
        when 'r' then
          execute format(
            'create policy %I on %I.%I as permissive '
            || 'for select to authenticated using (%s)',
            consolidated_policy_name,
            table_record.schema_name,
            table_record.table_name,
            effective_using
          );
        when 'a' then
          execute format(
            'create policy %I on %I.%I as permissive '
            || 'for insert to authenticated with check (%s)',
            consolidated_policy_name,
            table_record.schema_name,
            table_record.table_name,
            effective_check
          );
        when 'w' then
          execute format(
            'create policy %I on %I.%I as permissive '
            || 'for update to authenticated using (%s) with check (%s)',
            consolidated_policy_name,
            table_record.schema_name,
            table_record.table_name,
            effective_using,
            effective_check
          );
        when 'd' then
          execute format(
            'create policy %I on %I.%I as permissive '
            || 'for delete to authenticated using (%s)',
            consolidated_policy_name,
            table_record.schema_name,
            table_record.table_name,
            effective_using
          );
      end case;
    end loop;
  end loop;
end
$migration$;

-- Fail the migration if any public table still has more than one permissive
-- policy for the authenticated role and the same command.
do $migration$
begin
  if exists (
    with expanded_policies as (
      select
        policy.polrelid,
        command.command_code,
        policy.polname
      from pg_policy as policy
      join pg_class as relation
        on relation.oid = policy.polrelid
      join pg_namespace as namespace
        on namespace.oid = relation.relnamespace
      cross join lateral unnest(
        case
          when policy.polcmd = '*'
          then array['r'::text, 'a'::text, 'w'::text, 'd'::text]
          else array[policy.polcmd::text]
        end
      ) as command(command_code)
      where namespace.nspname = 'public'
        and policy.polpermissive
        and (
          0::oid = any(policy.polroles)
          or (
            select oid
            from pg_roles
            where rolname = 'authenticated'
          ) = any(policy.polroles)
        )
    )
    select 1
    from expanded_policies
    group by polrelid, command_code
    having count(*) > 1
  ) then
    raise exception
      'Authenticated multiple-permissive-policy warnings remain after consolidation';
  end if;

  if exists (
    select 1
    from pg_policy as policy
    join pg_class as relation
      on relation.oid = policy.polrelid
    join pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and policy.polname = 'admin_manage'
  ) then
    raise exception 'Legacy admin_manage policies remain after consolidation';
  end if;
end
$migration$;

commit;
