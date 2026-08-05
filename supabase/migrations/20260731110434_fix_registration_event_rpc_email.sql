-- Correct an identifier collision in the first local iteration of the public
-- registration RPC without resetting local CMS or onboarding data. Fresh
-- installations already receive the corrected definition from the preceding
-- migration, so this block becomes a no-op there.

begin;

do $migration$
declare
  function_definition text;
begin
  select pg_get_functiondef(procedure.oid)
  into function_definition
  from pg_proc as procedure
  join pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname = 'register_for_event'
    and pg_get_function_identity_arguments(procedure.oid) =
      'p_event_id bigint, p_full_name text, p_email text, p_phone text, p_privacy_accepted boolean, p_marketing_opt_in boolean';

  if function_definition is null then
    raise exception 'register_for_event function was not found'
      using errcode = '42883';
  end if;

  if position('normalized_email text := lower' in function_definition) > 0 then
    function_definition := replace(
      function_definition,
      'normalized_email text := lower',
      'normalized_email_value text := lower'
    );
    function_definition := replace(
      function_definition,
      'char_length(normalized_email)',
      'char_length(normalized_email_value)'
    );
    function_definition := replace(
      function_definition,
      'normalized_email !~',
      'normalized_email_value !~'
    );
    function_definition := replace(
      function_definition,
      'registration.normalized_email = normalized_email',
      'registration.normalized_email = normalized_email_value'
    );
    function_definition := replace(
      function_definition,
      'email = normalized_email,',
      'email = normalized_email_value,'
    );
    function_definition := replace(
      function_definition,
      E'      normalized_email,\n      normalized_phone,',
      E'      normalized_email_value,\n      normalized_phone,'
    );

    execute function_definition;
  end if;
end
$migration$;

commit;
