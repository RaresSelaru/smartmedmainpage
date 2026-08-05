-- Harden the public registration response and make waitlist promotion fair.
-- This migration upgrades databases that already applied the initial events
-- migration; the initial definition is also kept correct for fresh installs.

begin;

create or replace function private.promote_event_waitlist(
  p_event_id bigint
)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  event_capacity integer;
  event_confirmed_count integer;
  next_registration_id uuid;
  promoted_count integer := 0;
begin
  loop
    select event.capacity, event.confirmed_count
    into event_capacity, event_confirmed_count
    from public.registration_events as event
    where event.id = p_event_id
    for update;

    if not found then
      return promoted_count;
    end if;

    exit when event_capacity is not null
      and event_confirmed_count >= event_capacity;

    select registration.id
    into next_registration_id
    from public.event_registrations as registration
    where registration.event_id = p_event_id
      and registration.status = 'waitlist'
    order by registration.registered_at, registration.id
    for update
    limit 1;

    exit when not found;

    update public.event_registrations
    set
      status = 'confirmed',
      cancelled_at = null,
      attended_at = null
    where id = next_registration_id;

    promoted_count := promoted_count + 1;
  end loop;

  return promoted_count;
end
$function$;

create or replace function private.update_registration_event_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  old_confirmed_delta integer := 0;
  old_waitlist_delta integer := 0;
  new_confirmed_delta integer := 0;
  new_waitlist_delta integer := 0;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    old_confirmed_delta := case
      when old.status in ('confirmed', 'attended', 'no_show') then 1
      else 0
    end;
    old_waitlist_delta := case when old.status = 'waitlist' then 1 else 0 end;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    new_confirmed_delta := case
      when new.status in ('confirmed', 'attended', 'no_show') then 1
      else 0
    end;
    new_waitlist_delta := case when new.status = 'waitlist' then 1 else 0 end;
  end if;

  if tg_op = 'UPDATE' and old.event_id <> new.event_id then
    update public.registration_events
    set
      confirmed_count = greatest(0, confirmed_count - old_confirmed_delta),
      waitlist_count = greatest(0, waitlist_count - old_waitlist_delta)
    where id = old.event_id;

    update public.registration_events
    set
      confirmed_count = confirmed_count + new_confirmed_delta,
      waitlist_count = waitlist_count + new_waitlist_delta
    where id = new.event_id;
  else
    update public.registration_events
    set
      confirmed_count = greatest(
        0,
        confirmed_count - old_confirmed_delta + new_confirmed_delta
      ),
      waitlist_count = greatest(
        0,
        waitlist_count - old_waitlist_delta + new_waitlist_delta
      )
    where id = case when tg_op = 'DELETE' then old.event_id else new.event_id end;
  end if;

  if tg_op = 'UPDATE'
    and old.event_id = new.event_id
    and old.status = 'confirmed'
    and new.status = 'cancelled'
  then
    perform private.promote_event_waitlist(new.event_id);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end
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
begin
  if p_event_id is null or p_event_id < 1 then
    raise exception 'INVALID_EVENT'
      using errcode = '22023';
  end if;

  if char_length(normalized_name) not between 2 and 120 then
    raise exception 'INVALID_NAME'
      using errcode = '22023';
  end if;

  if char_length(normalized_email_value) not between 5 and 320
    or normalized_email_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  then
    raise exception 'INVALID_EMAIL'
      using errcode = '22023';
  end if;

  if normalized_phone is not null
    and char_length(normalized_phone) not between 7 and 32
  then
    raise exception 'INVALID_PHONE'
      using errcode = '22023';
  end if;

  if p_privacy_accepted is not true then
    raise exception 'PRIVACY_REQUIRED'
      using errcode = '22023';
  end if;

  select event.*
  into event_record
  from public.registration_events as event
  where event.id = p_event_id
  for update;

  if not found then
    raise exception 'EVENT_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  if event_record.status <> 'published' then
    raise exception 'EVENT_NOT_OPEN'
      using errcode = 'P0001';
  end if;

  if event_record.starts_at <= statement_timestamp() then
    raise exception 'EVENT_STARTED'
      using errcode = 'P0001';
  end if;

  if event_record.registration_opens_at > statement_timestamp() then
    raise exception 'REGISTRATION_NOT_STARTED'
      using errcode = 'P0001';
  end if;

  if event_record.registration_closes_at <= statement_timestamp() then
    raise exception 'REGISTRATION_CLOSED'
      using errcode = 'P0001';
  end if;

  perform private.promote_event_waitlist(event_record.id);

  select event.*
  into event_record
  from public.registration_events as event
  where event.id = p_event_id;

  select registration.*
  into registration_record
  from public.event_registrations as registration
  where registration.event_id = event_record.id
    and registration.normalized_email = normalized_email_value
  for update;

  if found and registration_record.status <> 'cancelled' then
    return jsonb_build_object(
      'accepted', true,
      'outcome', 'received'
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
    raise exception 'EVENT_FULL'
      using errcode = 'P0001';
  end if;

  if registration_record.id is not null then
    update public.event_registrations
    set
      user_id = coalesce(auth.uid(), registration_record.user_id),
      full_name = normalized_name,
      email = normalized_email_value,
      phone = normalized_phone,
      status = chosen_status,
      privacy_policy_version = '2026-07-31',
      privacy_accepted_at = statement_timestamp(),
      marketing_opt_in = p_marketing_opt_in,
      source = 'website',
      registered_at = statement_timestamp(),
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
      '2026-07-31',
      statement_timestamp(),
      p_marketing_opt_in,
      'website'
    )
    returning * into registration_record;
  end if;

  return jsonb_build_object(
    'accepted', true,
    'outcome', registration_record.status
  );
end
$function$;

revoke all on function private.promote_event_waitlist(bigint)
  from public, anon, authenticated;

revoke all on function public.register_for_event(
  bigint,
  text,
  text,
  text,
  boolean,
  boolean
) from public, anon, authenticated;

grant execute on function public.register_for_event(
  bigint,
  text,
  text,
  text,
  boolean,
  boolean
) to anon, authenticated, service_role;

commit;
