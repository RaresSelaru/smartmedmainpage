-- Transactional notifications and real newsletter subscriptions for public
-- event registrations. Registration remains durable when Resend is missing or
-- temporarily unavailable; delivery state is tracked in a private outbox.

begin;

alter table public.event_registrations
  add column notification_batch_id uuid not null default gen_random_uuid(),
  add column confirmation_email_sent_at timestamptz,
  add column staff_email_sent_at timestamptz,
  add column email_last_error text
    constraint event_registrations_email_last_error_length
      check (email_last_error is null or char_length(email_last_error) <= 160);

create table private.event_registration_notification_outbox (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null
    references public.event_registrations(id) on delete cascade,
  batch_id uuid not null,
  notification_type text not null
    constraint event_registration_outbox_type_check
      check (
        notification_type in (
          'event_registration_confirmation',
          'event_registration_staff_alert'
        )
      ),
  recipient_kind text not null
    constraint event_registration_outbox_recipient_kind_check
      check (recipient_kind in ('participant', 'staff')),
  recipient_email text,
  payload jsonb not null
    constraint event_registration_outbox_payload_object check (
      jsonb_typeof(payload) = 'object' and pg_column_size(payload) <= 32768
    ),
  idempotency_key text not null unique,
  state text not null default 'pending'
    constraint event_registration_outbox_state_check
      check (
        state in (
          'pending',
          'sending',
          'sent',
          'failed',
          'pending_configuration'
        )
      ),
  attempt_count smallint not null default 0
    constraint event_registration_outbox_attempts_check
      check (attempt_count between 0 and 10),
  next_attempt_at timestamptz not null default statement_timestamp(),
  claim_token uuid,
  claimed_at timestamptz,
  provider_message_id text,
  last_error_code text,
  sent_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint event_registration_outbox_recipient_consistent check (
    (
      recipient_kind = 'participant'
      and recipient_email is not null
      and char_length(btrim(recipient_email)) between 5 and 320
    )
    or (recipient_kind = 'staff' and recipient_email is null)
  ),
  constraint event_registration_outbox_claim_consistent check (
    (state = 'sending' and claim_token is not null and claimed_at is not null)
    or (state <> 'sending' and claim_token is null and claimed_at is null)
  ),
  constraint event_registration_outbox_sent_consistent check (
    (state = 'sent' and sent_at is not null and provider_message_id is not null)
    or (state <> 'sent' and sent_at is null)
  ),
  unique (registration_id, batch_id, notification_type)
);

create index event_registration_outbox_dispatch_idx
  on private.event_registration_notification_outbox (
    state,
    next_attempt_at,
    created_at,
    id
  )
  where state in ('pending', 'failed', 'pending_configuration');

create index event_registration_outbox_registration_idx
  on private.event_registration_notification_outbox (
    registration_id,
    batch_id,
    created_at,
    id
  );

create trigger set_event_registration_notification_outbox_updated_at
before update on private.event_registration_notification_outbox
for each row execute function private.set_updated_at();

create or replace function private.record_registration_newsletter_consent(
  p_user_id uuid,
  p_email text,
  p_metadata jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.newsletter_subscribers (
    user_id,
    email,
    status,
    source,
    confirmed_at,
    unsubscribed_at
  )
  values (
    p_user_id,
    lower(btrim(p_email)),
    'active',
    'event_registration',
    statement_timestamp(),
    null
  )
  on conflict (normalized_email) do update
  set
    user_id = coalesce(
      public.newsletter_subscribers.user_id,
      excluded.user_id
    ),
    status = case
      when public.newsletter_subscribers.status in ('bounced', 'complained')
        then public.newsletter_subscribers.status
      else 'active'
    end,
    confirmed_at = case
      when public.newsletter_subscribers.status in ('bounced', 'complained')
        then public.newsletter_subscribers.confirmed_at
      else coalesce(
        public.newsletter_subscribers.confirmed_at,
        statement_timestamp()
      )
    end,
    unsubscribed_at = case
      when public.newsletter_subscribers.status in ('bounced', 'complained')
        then public.newsletter_subscribers.unsubscribed_at
      else null
    end,
    updated_at = statement_timestamp();

  insert into public.consent_events (
    user_id,
    subject_email,
    purpose,
    action,
    policy_version,
    source,
    occurred_at,
    metadata
  )
  values (
    p_user_id,
    lower(btrim(p_email)),
    'newsletter',
    'granted',
    '2026-08-02',
    'event_registration',
    statement_timestamp(),
    coalesce(p_metadata, '{}'::jsonb)
  );
end
$function$;

create or replace function private.event_registration_payload(
  registration public.event_registrations,
  event public.registration_events
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  select jsonb_build_object(
    'contactEmail', event.contact_email,
    'deliveryMode', event.delivery_mode,
    'endsAt', event.ends_at,
    'eventId', event.id,
    'eventSlug', event.slug,
    'eventTitle', event.title,
    'fullName', registration.full_name,
    'locationAddress', event.location_address,
    'locationName', event.location_name,
    'outcome', registration.status,
    'participantEmail', registration.normalized_email,
    'phone', registration.phone,
    'priceLabel', event.price_label,
    'registeredAt', registration.registered_at,
    'registrationId', registration.id,
    'startsAt', event.starts_at
  )
$function$;

create or replace function public.register_for_event(
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
  event_record public.registration_events%rowtype;
  registration_record public.event_registrations%rowtype;
  normalized_name text := btrim(coalesce(p_full_name, ''));
  normalized_email_value text := lower(btrim(coalesce(p_email, '')));
  normalized_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  chosen_status text;
  marketing_was_enabled boolean := false;
begin
  if p_event_id is null or p_event_id < 1 then
    raise exception 'INVALID_EVENT' using errcode = '22023';
  end if;
  if char_length(normalized_name) not between 2 and 120 then
    raise exception 'INVALID_NAME' using errcode = '22023';
  end if;
  if char_length(normalized_email_value) not between 5 and 320
    or normalized_email_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  then
    raise exception 'INVALID_EMAIL' using errcode = '22023';
  end if;
  if normalized_phone is not null
    and char_length(normalized_phone) not between 7 and 32
  then
    raise exception 'INVALID_PHONE' using errcode = '22023';
  end if;
  if p_privacy_accepted is not true then
    raise exception 'PRIVACY_REQUIRED' using errcode = '22023';
  end if;

  select candidate.*
  into event_record
  from public.registration_events as candidate
  where candidate.id = p_event_id
  for update;

  if not found then
    raise exception 'EVENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if event_record.status <> 'published' then
    raise exception 'EVENT_NOT_OPEN' using errcode = 'P0001';
  end if;
  if event_record.starts_at <= statement_timestamp() then
    raise exception 'EVENT_STARTED' using errcode = 'P0001';
  end if;
  if event_record.registration_opens_at > statement_timestamp() then
    raise exception 'REGISTRATION_NOT_STARTED' using errcode = 'P0001';
  end if;
  if event_record.registration_closes_at <= statement_timestamp() then
    raise exception 'REGISTRATION_CLOSED' using errcode = 'P0001';
  end if;

  perform private.promote_event_waitlist(event_record.id);
  select candidate.*
  into event_record
  from public.registration_events as candidate
  where candidate.id = p_event_id;

  select candidate.*
  into registration_record
  from public.event_registrations as candidate
  where candidate.event_id = event_record.id
    and candidate.normalized_email = normalized_email_value
  for update;

  if found and registration_record.status <> 'cancelled' then
    if p_marketing_opt_in and not registration_record.marketing_opt_in then
      update public.event_registrations
      set
        user_id = coalesce(auth.uid(), user_id),
        marketing_opt_in = true
      where id = registration_record.id;

      perform private.record_registration_newsletter_consent(
        auth.uid(),
        normalized_email_value,
        jsonb_build_object(
          'eventId', event_record.id,
          'eventSlug', event_record.slug,
          'registrationId', registration_record.id
        )
      );
    end if;

    return jsonb_build_object(
      'accepted', true,
      'outcome', 'received',
      'registrationId', registration_record.id
    );
  end if;

  chosen_status := case
    when event_record.capacity is null
      or event_record.confirmed_count < event_record.capacity
      then 'confirmed'
    when event_record.allow_waitlist then 'waitlist'
    else null
  end;
  if chosen_status is null then
    raise exception 'EVENT_FULL' using errcode = 'P0001';
  end if;

  marketing_was_enabled := coalesce(registration_record.marketing_opt_in, false);
  if registration_record.id is not null then
    update public.event_registrations
    set
      user_id = coalesce(auth.uid(), registration_record.user_id),
      full_name = normalized_name,
      email = normalized_email_value,
      phone = normalized_phone,
      status = chosen_status,
      privacy_policy_version = '2026-08-02',
      privacy_accepted_at = statement_timestamp(),
      marketing_opt_in = p_marketing_opt_in,
      source = 'website',
      registered_at = statement_timestamp(),
      notification_batch_id = gen_random_uuid(),
      confirmation_email_sent_at = null,
      staff_email_sent_at = null,
      email_last_error = null,
      cancelled_at = null,
      attended_at = null
    where id = registration_record.id
    returning * into registration_record;
  else
    insert into public.event_registrations (
      event_id,
      user_id,
      full_name,
      email,
      phone,
      status,
      privacy_policy_version,
      privacy_accepted_at,
      marketing_opt_in,
      source
    )
    values (
      event_record.id,
      auth.uid(),
      normalized_name,
      normalized_email_value,
      normalized_phone,
      chosen_status,
      '2026-08-02',
      statement_timestamp(),
      p_marketing_opt_in,
      'website'
    )
    returning * into registration_record;
  end if;

  if p_marketing_opt_in and not marketing_was_enabled then
    perform private.record_registration_newsletter_consent(
      auth.uid(),
      normalized_email_value,
      jsonb_build_object(
        'eventId', event_record.id,
        'eventSlug', event_record.slug,
        'registrationId', registration_record.id
      )
    );
  end if;

  insert into private.event_registration_notification_outbox (
    registration_id,
    batch_id,
    notification_type,
    recipient_kind,
    recipient_email,
    payload,
    idempotency_key
  )
  values
    (
      registration_record.id,
      registration_record.notification_batch_id,
      'event_registration_confirmation',
      'participant',
      registration_record.normalized_email,
      private.event_registration_payload(registration_record, event_record),
      format(
        'event-registration:%s:%s:confirmation',
        registration_record.id,
        registration_record.notification_batch_id
      )
    ),
    (
      registration_record.id,
      registration_record.notification_batch_id,
      'event_registration_staff_alert',
      'staff',
      null,
      private.event_registration_payload(registration_record, event_record),
      format(
        'event-registration:%s:%s:staff',
        registration_record.id,
        registration_record.notification_batch_id
      )
    );

  return jsonb_build_object(
    'accepted', true,
    'outcome', registration_record.status,
    'registrationId', registration_record.id
  );
end
$function$;

create function public.claim_event_registration_notifications(
  p_registration_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  registration public.event_registrations%rowtype;
  outbox private.event_registration_notification_outbox%rowtype;
  claim_id uuid;
  claimed jsonb := '[]'::jsonb;
begin
  select candidate.*
  into registration
  from public.event_registrations as candidate
  where candidate.id = p_registration_id;

  if not found then
    raise exception 'REGISTRATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  for outbox in
    select queued.*
    from private.event_registration_notification_outbox as queued
    where queued.registration_id = registration.id
      and queued.batch_id = registration.notification_batch_id
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
    update private.event_registration_notification_outbox
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

create function public.complete_event_registration_notification(
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
  outbox private.event_registration_notification_outbox%rowtype;
begin
  if p_outcome not in ('sent', 'failed', 'pending_configuration') then
    raise exception 'INVALID_NOTIFICATION_OUTCOME' using errcode = '22023';
  end if;

  select queued.*
  into outbox
  from private.event_registration_notification_outbox as queued
  where queued.id = p_notification_id
    and queued.claim_token = p_claim_token
    and queued.state = 'sending'
  for update;

  if not found then return false; end if;
  if p_outcome = 'sent'
    and nullif(btrim(coalesce(p_provider_message_id, '')), '') is null
  then
    raise exception 'PROVIDER_MESSAGE_ID_REQUIRED' using errcode = '22023';
  end if;

  update private.event_registration_notification_outbox
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

  update public.event_registrations
  set
    confirmation_email_sent_at = case
      when p_outcome = 'sent'
        and outbox.notification_type = 'event_registration_confirmation'
      then statement_timestamp()
      else confirmation_email_sent_at
    end,
    staff_email_sent_at = case
      when p_outcome = 'sent'
        and outbox.notification_type = 'event_registration_staff_alert'
      then statement_timestamp()
      else staff_email_sent_at
    end,
    email_last_error = case
      when p_outcome = 'sent' then email_last_error
      else left(coalesce(nullif(btrim(p_error_code), ''), 'unknown'), 160)
    end
  where id = outbox.registration_id;

  return true;
end
$function$;

revoke all on table private.event_registration_notification_outbox
  from public, anon, authenticated, service_role;
revoke all on function private.record_registration_newsletter_consent(
  uuid,
  text,
  jsonb
) from public, anon, authenticated, service_role;
revoke all on function private.event_registration_payload(
  public.event_registrations,
  public.registration_events
) from public, anon, authenticated, service_role;

revoke all on function public.claim_event_registration_notifications(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.claim_event_registration_notifications(uuid)
  to service_role;
revoke all on function public.complete_event_registration_notification(
  uuid,
  uuid,
  text,
  text,
  text
) from public, anon, authenticated, service_role;
grant execute on function public.complete_event_registration_notification(
  uuid,
  uuid,
  text,
  text,
  text
) to service_role;

comment on table private.event_registration_notification_outbox is
  'Transactional participant and staff notifications for public event registrations.';

commit;
