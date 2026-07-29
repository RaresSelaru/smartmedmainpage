-- SmartMed local seed hook.
--
-- Initial editorial content is migration-owned so it is deterministic on every
-- environment. Administrative identities and the local-only MFA exception are
-- intentionally provisioned by the guarded operator CLI, never by seed data.
-- This file must remain free of credentials and hosted-project mutations.

do $seed$
begin
  if not exists (
    select 1
    from private.content_channels
    where content_kind = 'article'
      and public_enabled
      and public_path = '/blog'
  ) then
    raise exception 'SmartMed Blog channel configuration is missing';
  end if;

  if not exists (
    select 1
    from private.content_channels
    where content_kind = 'news'
      and not public_enabled
      and public_path is null
  ) then
    raise exception 'SmartMed News channel must remain private';
  end if;
end
$seed$;
