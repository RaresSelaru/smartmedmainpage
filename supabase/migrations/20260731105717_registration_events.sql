-- SmartMed registration events and participant management.
--
-- Public visitors can read published event metadata, but participant PII is
-- never directly exposed. Registrations go through one deliberately public,
-- narrowly scoped RPC which serializes capacity decisions on the event row.

begin;

create table public.registration_events (
  id bigint generated always as identity primary key,
  slug text not null unique
    constraint registration_events_slug_format
      check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null
    constraint registration_events_title_length
      check (char_length(btrim(title)) between 4 and 160),
  summary text not null
    constraint registration_events_summary_length
      check (char_length(btrim(summary)) between 20 and 360),
  description text not null
    constraint registration_events_description_length
      check (char_length(btrim(description)) between 20 and 6000),
  event_type text not null default 'other'
    constraint registration_events_type_check
      check (
        event_type in (
          'simulation',
          'test',
          'webinar',
          'workshop',
          'open_day',
          'course',
          'other'
        )
      ),
  delivery_mode text not null default 'online'
    constraint registration_events_delivery_mode_check
      check (delivery_mode in ('online', 'in_person', 'hybrid')),
  status text not null default 'draft'
    constraint registration_events_status_check
      check (
        status in ('draft', 'published', 'cancelled', 'completed', 'archived')
      ),
  cover_media_id bigint
    references public.media_assets(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  registration_opens_at timestamptz not null,
  registration_closes_at timestamptz not null,
  capacity integer,
  allow_waitlist boolean not null default true,
  confirmed_count integer not null default 0,
  waitlist_count integer not null default 0,
  location_name text,
  location_address text,
  price_label text,
  contact_email text,
  featured boolean not null default false,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint registration_events_time_order check (ends_at > starts_at),
  constraint registration_events_registration_window check (
    registration_closes_at > registration_opens_at
    and registration_closes_at <= starts_at
  ),
  constraint registration_events_capacity_check check (
    capacity is null or capacity > 0
  ),
  constraint registration_events_counts_check check (
    confirmed_count >= 0
    and waitlist_count >= 0
    and (capacity is null or confirmed_count <= capacity)
  ),
  constraint registration_events_waitlist_check check (
    capacity is not null or not allow_waitlist
  ),
  constraint registration_events_location_name_length check (
    location_name is null
    or char_length(btrim(location_name)) between 2 and 160
  ),
  constraint registration_events_location_address_length check (
    location_address is null
    or char_length(btrim(location_address)) between 2 and 500
  ),
  constraint registration_events_price_label_length check (
    price_label is null
    or char_length(btrim(price_label)) between 1 and 80
  ),
  constraint registration_events_contact_email_format check (
    contact_email is null
    or (
      char_length(btrim(contact_email)) between 5 and 320
      and btrim(contact_email) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    )
  ),
  constraint registration_events_physical_location_check check (
    delivery_mode = 'online'
    or char_length(btrim(coalesce(location_name, ''))) >= 2
  ),
  constraint registration_events_publication_check check (
    status not in ('published', 'cancelled', 'completed')
    or (published_at is not null and cover_media_id is not null)
  )
);

create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id bigint not null
    references public.registration_events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null
    constraint event_registrations_name_length
      check (char_length(btrim(full_name)) between 2 and 120),
  email text not null
    constraint event_registrations_email_format
      check (
        char_length(btrim(email)) between 5 and 320
        and btrim(email) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      ),
  normalized_email text generated always as (lower(btrim(email))) stored,
  phone text
    constraint event_registrations_phone_length
      check (phone is null or char_length(btrim(phone)) between 7 and 32),
  status text not null default 'confirmed'
    constraint event_registrations_status_check
      check (
        status in ('confirmed', 'waitlist', 'cancelled', 'attended', 'no_show')
      ),
  privacy_policy_version text not null,
  privacy_accepted_at timestamptz not null,
  marketing_opt_in boolean not null default false,
  source text not null default 'website'
    constraint event_registrations_source_check
      check (source in ('website', 'admin', 'migration')),
  registered_at timestamptz not null default statement_timestamp(),
  cancelled_at timestamptz,
  attended_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint event_registrations_unique_email
    unique (event_id, normalized_email),
  constraint event_registrations_cancelled_at_check check (
    (status = 'cancelled' and cancelled_at is not null)
    or (status <> 'cancelled' and cancelled_at is null)
  ),
  constraint event_registrations_attended_at_check check (
    (status = 'attended' and attended_at is not null)
    or (status <> 'attended' and attended_at is null)
  )
);

create index registration_events_public_catalog_idx
  on public.registration_events (status, featured desc, starts_at, id);

create index registration_events_cover_media_idx
  on public.registration_events (cover_media_id)
  where cover_media_id is not null;

create index registration_events_registration_window_idx
  on public.registration_events (
    status,
    registration_opens_at,
    registration_closes_at
  );

create index event_registrations_event_status_idx
  on public.event_registrations (event_id, status, registered_at, id);

create index event_registrations_user_idx
  on public.event_registrations (user_id, registered_at desc)
  where user_id is not null;

create or replace function private.validate_registration_event_cover()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.cover_media_id is not null
    and not exists (
      select 1
      from public.media_assets as media
      where media.id = new.cover_media_id
        and media.storage_bucket = 'cms-media'
        and media.kind = 'image'
        and media.status = 'active'
    )
  then
    raise exception 'INVALID_EVENT_COVER'
      using errcode = '22023';
  end if;

  return new;
end
$function$;

create or replace function private.enforce_event_registration_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  event_capacity integer;
  event_confirmed_count integer;
  old_consumes_capacity boolean := false;
  new_consumes_capacity boolean;
begin
  new_consumes_capacity := new.status in ('confirmed', 'attended', 'no_show');

  if tg_op = 'UPDATE' then
    old_consumes_capacity := old.status in ('confirmed', 'attended', 'no_show')
      and old.event_id = new.event_id;
  end if;

  if new_consumes_capacity and not old_consumes_capacity then
    select event.capacity, event.confirmed_count
    into event_capacity, event_confirmed_count
    from public.registration_events as event
    where event.id = new.event_id
    for update;

    if not found then
      raise exception 'EVENT_NOT_FOUND'
        using errcode = 'P0002';
    end if;

    if event_capacity is not null
      and event_confirmed_count >= event_capacity
    then
      raise exception 'EVENT_FULL'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end
$function$;

-- Move people from the waitlist into newly available places in registration
-- order. Every caller locks the event row first, so capacity decisions remain
-- serialized even when an administrator and a public registration arrive at
-- the same time.
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

drop trigger if exists validate_registration_event_cover
  on public.registration_events;
create trigger validate_registration_event_cover
before insert or update of cover_media_id, status
on public.registration_events
for each row execute function private.validate_registration_event_cover();

drop trigger if exists set_registration_events_updated_at
  on public.registration_events;
create trigger set_registration_events_updated_at
before update on public.registration_events
for each row execute function private.set_updated_at();

drop trigger if exists enforce_event_registration_capacity
  on public.event_registrations;
create trigger enforce_event_registration_capacity
before insert or update of event_id, status
on public.event_registrations
for each row execute function private.enforce_event_registration_capacity();

drop trigger if exists set_event_registrations_updated_at
  on public.event_registrations;
create trigger set_event_registrations_updated_at
before update on public.event_registrations
for each row execute function private.set_updated_at();

drop trigger if exists update_registration_event_counts
  on public.event_registrations;
create trigger update_registration_event_counts
after insert or update of event_id, status or delete
on public.event_registrations
for each row execute function private.update_registration_event_counts();

-- CMS media can become public through either a published Blog revision or a
-- public registration event. Keeping one access refresher avoids a second,
-- weaker upload pipeline for event covers.
create or replace function private.refresh_cms_media_access(
  p_media_ids bigint[] default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  update public.media_assets as media
  set access_level = case
    when exists (
      select 1
      from public.content_revision_media as revision_media
      join public.content_entries as entry
        on entry.published_revision_id = revision_media.revision_id
      where revision_media.media_asset_id = media.id
        and entry.kind = 'article'
        and entry.status = 'published'
        and entry.visibility = 'public'
        and entry.published_at <= statement_timestamp()
        and private.content_kind_is_public(entry.kind)
    ) or exists (
      select 1
      from public.registration_events as event
      where event.cover_media_id = media.id
        and event.status in ('published', 'cancelled', 'completed')
        and event.published_at <= statement_timestamp()
    ) then 'public'
    else 'private'
  end
  where media.storage_bucket = 'cms-media'
    and media.status = 'active'
    and (
      p_media_ids is null
      or media.id = any (p_media_ids)
    );
end
$function$;

create or replace function private.can_read_public_cms_media_object(
  p_bucket_id text,
  p_object_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    p_bucket_id = 'cms-media'
    and exists (
      select 1
      from public.media_assets as media
      where media.storage_bucket = p_bucket_id
        and media.status = 'active'
        and media.access_level = 'public'
        and (
          media.storage_path = p_object_name
          or exists (
            select 1
            from jsonb_array_elements(
              case
                when jsonb_typeof(media.metadata -> 'variants') = 'array'
                  then media.metadata -> 'variants'
                else '[]'::jsonb
              end
            ) as variant(value)
            where variant.value ->> 'path' = p_object_name
          )
        )
        and (
          exists (
            select 1
            from public.content_revision_media as revision_media
            join public.content_entries as entry
              on entry.published_revision_id = revision_media.revision_id
            where revision_media.media_asset_id = media.id
              and entry.kind = 'article'
              and entry.status = 'published'
              and entry.visibility = 'public'
              and entry.published_at <= statement_timestamp()
              and private.content_kind_is_public(entry.kind)
          )
          or exists (
            select 1
            from public.registration_events as event
            where event.cover_media_id = media.id
              and event.status in ('published', 'cancelled', 'completed')
              and event.published_at <= statement_timestamp()
          )
        )
    )
$function$;

create or replace function private.refresh_registration_event_cover_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  media_ids bigint[];
begin
  media_ids := array_remove(
    array[
      case when tg_op <> 'INSERT' then old.cover_media_id else null end,
      case when tg_op <> 'DELETE' then new.cover_media_id else null end
    ],
    null
  );

  if coalesce(array_length(media_ids, 1), 0) > 0 then
    perform private.refresh_cms_media_access(media_ids);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end
$function$;

create or replace function private.prevent_archiving_event_cover()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.status = 'archived'
    and old.status is distinct from new.status
    and exists (
      select 1
      from public.registration_events as event
      where event.cover_media_id = old.id
    )
  then
    raise exception 'Referenced event media cannot be archived'
      using errcode = '55000';
  end if;

  return new;
end
$function$;

drop trigger if exists refresh_registration_event_cover_access
  on public.registration_events;
create trigger refresh_registration_event_cover_access
after insert or update of cover_media_id, status, published_at or delete
on public.registration_events
for each row execute function private.refresh_registration_event_cover_access();

drop trigger if exists prevent_archiving_event_cover
  on public.media_assets;
create trigger prevent_archiving_event_cover
before update of status on public.media_assets
for each row execute function private.prevent_archiving_event_cover();

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

  -- A capacity increase can leave older waitlisted registrations while a
  -- place is available. Fill those places first so a new visitor can never
  -- overtake the existing FIFO queue.
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

alter table public.registration_events enable row level security;
alter table public.event_registrations enable row level security;

create policy registration_events_select_public
on public.registration_events
for select
to anon, authenticated
using (
  status in ('published', 'cancelled', 'completed')
  and published_at is not null
  and published_at <= statement_timestamp()
);

create policy registration_events_admin_manage
on public.registration_events
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy event_registrations_admin_manage
on public.event_registrations
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

revoke all privileges on table
  public.registration_events,
  public.event_registrations
from public, anon, authenticated;

grant select (
  id,
  slug,
  title,
  summary,
  description,
  event_type,
  delivery_mode,
  status,
  cover_media_id,
  starts_at,
  ends_at,
  registration_opens_at,
  registration_closes_at,
  capacity,
  allow_waitlist,
  confirmed_count,
  waitlist_count,
  location_name,
  location_address,
  price_label,
  contact_email,
  featured,
  published_at,
  created_at,
  updated_at
) on table public.registration_events to anon, authenticated;

grant insert, update, delete on table public.registration_events
  to authenticated;

grant select on table public.event_registrations to authenticated;
grant update (status, cancelled_at, attended_at, updated_at)
  on table public.event_registrations to authenticated;

revoke all privileges on sequence public.registration_events_id_seq
  from public, anon, authenticated;
grant usage, select on sequence public.registration_events_id_seq
  to authenticated;

grant all privileges on table
  public.registration_events,
  public.event_registrations
to service_role;
grant usage, select on sequence public.registration_events_id_seq
  to service_role;

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

revoke all on function private.validate_registration_event_cover()
  from public, anon, authenticated;
revoke all on function private.enforce_event_registration_capacity()
  from public, anon, authenticated;
revoke all on function private.promote_event_waitlist(bigint)
  from public, anon, authenticated;
revoke all on function private.update_registration_event_counts()
  from public, anon, authenticated;
revoke all on function private.refresh_registration_event_cover_access()
  from public, anon, authenticated;
revoke all on function private.prevent_archiving_event_cover()
  from public, anon, authenticated;

comment on table public.registration_events is
  'Public SmartMed simulations, tests, webinars, and other registration events.';
comment on table public.event_registrations is
  'Participant PII; never directly readable by anonymous or regular users.';
comment on function public.register_for_event(
  bigint,
  text,
  text,
  text,
  boolean,
  boolean
) is
  'Intentional public registration endpoint with validation and serialized capacity allocation.';

commit;
