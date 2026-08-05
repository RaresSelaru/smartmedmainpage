-- Keep the outbox routing identifier out of the anonymous Data API receipt.
-- The server resolves the registration by event + normalized email using the
-- service role after the transaction commits.

begin;

alter function public.register_for_event(
  bigint,
  text,
  text,
  text,
  boolean,
  boolean
) rename to register_for_event_internal;

alter function public.register_for_event_internal(
  bigint,
  text,
  text,
  text,
  boolean,
  boolean
) set schema private;

revoke all on function private.register_for_event_internal(
  bigint,
  text,
  text,
  text,
  boolean,
  boolean
) from public, anon, authenticated, service_role;

create function public.register_for_event(
  p_event_id bigint,
  p_full_name text,
  p_email text,
  p_phone text default null,
  p_privacy_accepted boolean default false,
  p_marketing_opt_in boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  internal_result jsonb;
begin
  internal_result := private.register_for_event_internal(
    p_event_id,
    p_full_name,
    p_email,
    p_phone,
    p_privacy_accepted,
    p_marketing_opt_in
  );

  return internal_result - 'registrationId';
end
$function$;

revoke all on function public.register_for_event(
  bigint,
  text,
  text,
  text,
  boolean,
  boolean
) from public, anon, authenticated, service_role;
grant execute on function public.register_for_event(
  bigint,
  text,
  text,
  text,
  boolean,
  boolean
) to anon, authenticated, service_role;

comment on function public.register_for_event(
  bigint,
  text,
  text,
  text,
  boolean,
  boolean
) is
  'Public event registration command. The receipt intentionally excludes participant and registration identifiers.';

commit;
