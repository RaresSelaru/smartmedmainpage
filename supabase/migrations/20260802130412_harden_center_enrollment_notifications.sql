-- Keep notification payloads and provider completion state on the server.
-- The first centre-enrolment migration used the public follow-up capability
-- for notification dispatch. Replace that surface before application code can
-- consume it: only the service role may claim or complete outbox messages.

begin;

drop function if exists public.claim_center_enrollment_notifications(uuid);

create function public.claim_center_enrollment_notifications(
  p_public_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  enrollment public.center_enrollments%rowtype;
  outbox private.center_enrollment_notification_outbox%rowtype;
  claim_id uuid;
  claimed jsonb := '[]'::jsonb;
begin
  select candidate.*
  into enrollment
  from public.center_enrollments as candidate
  where candidate.public_id = p_public_id;

  if not found then
    raise exception 'ENROLLMENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  for outbox in
    select queued.*
    from private.center_enrollment_notification_outbox as queued
    where queued.enrollment_id = enrollment.id
      and queued.attempt_count < 5
      and (
        (
          queued.state in ('pending', 'failed', 'pending_configuration')
          and queued.next_attempt_at <= statement_timestamp()
        )
        or (
          queued.state = 'sending'
          and queued.claimed_at < statement_timestamp() - interval '15 minutes'
        )
      )
    order by queued.created_at, queued.id
    for update skip locked
  loop
    claim_id := gen_random_uuid();

    update private.center_enrollment_notification_outbox
    set
      state = 'sending',
      attempt_count = attempt_count + 1,
      claim_token = claim_id,
      claimed_at = statement_timestamp(),
      last_error_code = null
    where id = outbox.id
    returning * into outbox;

    claimed := claimed || jsonb_build_array(
      jsonb_build_object(
        'claimToken', outbox.claim_token,
        'idempotencyKey', outbox.idempotency_key,
        'notificationId', outbox.id,
        'notificationType', outbox.notification_type,
        'payload', outbox.payload,
        'recipientEmail', outbox.recipient_email,
        'recipientKind', outbox.recipient_kind
      )
    );
  end loop;

  return jsonb_build_object('claimed', claimed);
end
$function$;

drop function if exists public.complete_center_enrollment_notification(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text
);

create or replace function public.complete_center_enrollment_notification(
  p_notification_id uuid,
  p_claim_token uuid,
  p_outcome text,
  p_provider_message_id text default null,
  p_error_code text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  outbox private.center_enrollment_notification_outbox%rowtype;
begin
  if p_outcome not in ('sent', 'failed', 'pending_configuration') then
    raise exception 'INVALID_NOTIFICATION_OUTCOME' using errcode = '22023';
  end if;

  select queued.*
  into outbox
  from private.center_enrollment_notification_outbox as queued
  where queued.id = p_notification_id
    and queued.claim_token = p_claim_token
    and queued.state = 'sending'
  for update;

  if not found then
    return false;
  end if;

  if p_outcome = 'sent'
    and nullif(btrim(coalesce(p_provider_message_id, '')), '') is null
  then
    raise exception 'PROVIDER_MESSAGE_ID_REQUIRED' using errcode = '22023';
  end if;

  update private.center_enrollment_notification_outbox
  set
    state = p_outcome,
    claim_token = null,
    claimed_at = null,
    provider_message_id = case
      when p_outcome = 'sent' then left(btrim(p_provider_message_id), 200)
      else null
    end,
    last_error_code = case
      when p_outcome = 'sent' then null
      else left(coalesce(nullif(btrim(p_error_code), ''), 'unknown'), 160)
    end,
    sent_at = case when p_outcome = 'sent' then statement_timestamp() else null end,
    next_attempt_at = case
      when p_outcome = 'sent' then next_attempt_at
      else statement_timestamp() + interval '15 minutes'
    end
  where id = outbox.id;

  update public.center_enrollments
  set
    confirmation_email_sent_at = case
      when p_outcome = 'sent'
        and outbox.notification_type = 'center_enrollment_confirmation'
      then statement_timestamp()
      else confirmation_email_sent_at
    end,
    staff_email_sent_at = case
      when p_outcome = 'sent'
        and outbox.notification_type = 'center_enrollment_staff_alert'
      then statement_timestamp()
      else staff_email_sent_at
    end,
    email_last_error = case
      when p_outcome = 'sent' then email_last_error
      else left(coalesce(nullif(btrim(p_error_code), ''), 'unknown'), 160)
    end
  where id = outbox.enrollment_id;

  return true;
end
$function$;

create or replace function private.link_center_enrollment_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  link_key_text text := btrim(
    coalesce(new.raw_user_meta_data ->> 'center_enrollment_link_key', '')
  );
begin
  if new.raw_user_meta_data ->> 'signup_source' <> 'center_enrollment'
    or link_key_text !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
    or new.email is null
  then
    return new;
  end if;

  update public.center_enrollments
  set
    user_id = new.id,
    account_creation_requested = true,
    account_creation_requested_at = coalesce(
      account_creation_requested_at,
      statement_timestamp()
    ),
    account_created_at = statement_timestamp()
  where account_link_key = link_key_text::uuid
    and normalized_email = lower(btrim(new.email))
    and account_creation_requested
    and follow_up_expires_at > statement_timestamp();

  return new;
end
$function$;

revoke all on function public.claim_center_enrollment_notifications(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.claim_center_enrollment_notifications(uuid)
  to service_role;

revoke all on function public.complete_center_enrollment_notification(
  uuid,
  uuid,
  text,
  text,
  text
) from public, anon, authenticated, service_role;
grant execute on function public.complete_center_enrollment_notification(
  uuid,
  uuid,
  text,
  text,
  text
) to service_role;

revoke all on function private.link_center_enrollment_account()
  from public, anon, authenticated, service_role;

commit;
