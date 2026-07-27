-- SmartMed platform foundation.
--
-- Boundaries:
--   * public: application data intentionally reachable through the Data API,
--     always protected by RLS and explicit grants.
--   * private: provider payloads, payment references, audit data, and trusted
--     helper functions. This schema must never be exposed by PostgREST.
--   * auth: Supabase Auth remains the source of truth for identities.
--   * storage: object bytes; public.media_assets stores application metadata.
--
-- The legacy smartmed_role value "premium" is retained for compatibility only.
-- Paid/content access is granted through public.entitlements, never by assigning
-- an operational account role.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------------
-- Existing identity foundation: preserve the current application contract and
-- harden trigger functions against search_path substitution.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists locale text not null default 'ro-RO',
  add column if not exists timezone text not null default 'Europe/Bucharest';

do $migration$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_full_name_length'
  ) then
    alter table public.profiles
      add constraint profiles_full_name_length
      check (
        full_name is null
        or char_length(btrim(full_name)) between 2 and 100
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_phone_length'
  ) then
    alter table public.profiles
      add constraint profiles_phone_length
      check (phone is null or char_length(btrim(phone)) between 7 and 32)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_city_length'
  ) then
    alter table public.profiles
      add constraint profiles_city_length
      check (city is null or char_length(btrim(city)) between 2 and 80)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_school_length'
  ) then
    alter table public.profiles
      add constraint profiles_school_length
      check (school is null or char_length(btrim(school)) between 2 and 160)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_locale_format'
  ) then
    alter table public.profiles
      add constraint profiles_locale_format
      check (locale ~ '^[a-z]{2}(?:-[A-Z]{2})?$') not valid;
  end if;
end
$migration$;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.updated_at := statement_timestamp();
  return new;
end
$function$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.updated_at := statement_timestamp();
  return new;
end
$function$;

create or replace function private.handle_new_smartmed_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    case
      when char_length(
        btrim(coalesce(new.raw_user_meta_data ->> 'full_name', ''))
      ) between 2 and 100
      then btrim(coalesce(new.raw_user_meta_data ->> 'full_name', ''))
      else null
    end
  )
  on conflict (id) do nothing;

  insert into public.account_roles (user_id, role)
  values (new.id, 'user'::public.smartmed_role)
  on conflict (user_id) do nothing;

  return new;
end
$function$;

-- Keep the old function name callable by existing database metadata, while the
-- actual Auth trigger below uses the private implementation.
create or replace function public.handle_new_smartmed_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    case
      when char_length(
        btrim(coalesce(new.raw_user_meta_data ->> 'full_name', ''))
      ) between 2 and 100
      then btrim(coalesce(new.raw_user_meta_data ->> 'full_name', ''))
      else null
    end
  )
  on conflict (id) do nothing;

  insert into public.account_roles (user_id, role)
  values (new.id, 'user'::public.smartmed_role)
  on conflict (user_id) do nothing;

  return new;
end
$function$;

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.handle_new_smartmed_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_smartmed_user() from public, anon, authenticated;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

drop trigger if exists set_account_roles_updated_at on public.account_roles;
create trigger set_account_roles_updated_at
before update on public.account_roles
for each row execute function private.set_updated_at();

drop trigger if exists on_auth_user_created_create_smartmed_profile on auth.users;
create trigger on_auth_user_created_create_smartmed_profile
after insert on auth.users
for each row execute function private.handle_new_smartmed_user();

-- Covers identities created before the original profile trigger was installed.
insert into public.profiles (id, full_name)
select
  users.id,
  case
    when char_length(
      btrim(coalesce(users.raw_user_meta_data ->> 'full_name', ''))
    ) between 2 and 100
    then btrim(coalesce(users.raw_user_meta_data ->> 'full_name', ''))
    else null
  end
from auth.users as users
on conflict (id) do nothing;

insert into public.account_roles (user_id, role)
select users.id, 'user'::public.smartmed_role
from auth.users as users
on conflict (user_id) do nothing;

-- Normalize pre-existing profile values before validating the constraints that
-- the earlier migration introduced as NOT VALID.
update public.profiles
set full_name = case
  when char_length(btrim(full_name)) between 2 and 100 then btrim(full_name)
  else null
end
where full_name is not null
  and (
    full_name <> btrim(full_name)
    or char_length(btrim(full_name)) not between 2 and 100
  );

update public.profiles
set phone = case
  when char_length(btrim(phone)) between 7 and 32 then btrim(phone)
  else null
end
where phone is not null
  and (
    phone <> btrim(phone)
    or char_length(btrim(phone)) not between 7 and 32
  );

update public.profiles
set city = case
  when char_length(btrim(city)) between 2 and 80 then btrim(city)
  else null
end
where city is not null
  and (
    city <> btrim(city)
    or char_length(btrim(city)) not between 2 and 80
  );

update public.profiles
set school = case
  when char_length(btrim(school)) between 2 and 160 then btrim(school)
  else null
end
where school is not null
  and (
    school <> btrim(school)
    or char_length(btrim(school)) not between 2 and 160
  );

update public.profiles
set locale = case
  when btrim(locale) ~ '^[a-z]{2}(?:-[A-Z]{2})?$' then btrim(locale)
  else 'ro-RO'
end
where locale <> btrim(locale)
   or locale !~ '^[a-z]{2}(?:-[A-Z]{2})?$';

alter table public.profiles validate constraint profiles_full_name_length;
alter table public.profiles validate constraint profiles_phone_length;
alter table public.profiles validate constraint profiles_city_length;
alter table public.profiles validate constraint profiles_school_length;
alter table public.profiles validate constraint profiles_locale_format;

-- ---------------------------------------------------------------------------
-- Media and modular CMS.
-- ---------------------------------------------------------------------------

create table if not exists public.media_assets (
  id bigint generated always as identity primary key,
  storage_bucket text not null,
  storage_path text not null,
  owner_user_id uuid references auth.users(id) on delete set null,
  uploaded_by uuid references auth.users(id) on delete set null,
  kind text not null default 'image'
    check (kind in ('image', 'video', 'audio', 'document', 'archive', 'other')),
  access_level text not null default 'public'
    check (access_level in ('public', 'authenticated', 'entitled', 'private')),
  status text not null default 'active'
    check (status in ('processing', 'active', 'failed', 'archived')),
  title text,
  default_alt_text text,
  caption text,
  mime_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  duration_seconds numeric(12, 3)
    check (duration_seconds is null or duration_seconds >= 0),
  checksum_sha256 text
    check (checksum_sha256 is null or checksum_sha256 ~ '^[a-f0-9]{64}$'),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, storage_path),
  check (storage_path <> '' and storage_path !~ '(^|/)\.\.(/|$)'),
  constraint media_assets_public_bucket_invariant check (
    storage_bucket <> 'public-media'
    or (status = 'active' and access_level = 'public')
  )
);

do $migration$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.media_assets'::regclass
      and conname = 'media_assets_public_bucket_invariant'
  ) then
    alter table public.media_assets
      add constraint media_assets_public_bucket_invariant
      check (
        storage_bucket <> 'public-media'
        or (status = 'active' and access_level = 'public')
      ) not valid;
  end if;

  alter table public.media_assets
    validate constraint media_assets_public_bucket_invariant;
end
$migration$;

create table if not exists public.content_authors (
  id bigint generated always as identity primary key,
  user_id uuid unique references auth.users(id) on delete set null,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 100),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  bio text,
  avatar_media_id bigint references public.media_assets(id) on delete set null,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_categories (
  id bigint generated always as identity primary key,
  parent_id bigint references public.content_categories(id) on delete set null,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_id is null or parent_id <> id)
);

create table if not exists public.content_tags (
  id bigint generated always as identity primary key,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_entries (
  id bigint generated always as identity primary key,
  kind text not null default 'article'
    check (kind in ('article', 'page', 'news', 'announcement', 'faq', 'legal')),
  slug text not null unique
    constraint content_entries_slug_format check (
      slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*(?:/[a-z0-9]+(?:-[a-z0-9]+)*)*$'
    ),
  title text not null check (char_length(btrim(title)) between 1 and 220),
  excerpt text,
  status text not null default 'draft'
    check (status in ('draft', 'review', 'scheduled', 'published', 'archived')),
  visibility text not null default 'public'
    check (visibility in ('public', 'authenticated', 'entitled', 'private')),
  author_id bigint references public.content_authors(id) on delete set null,
  cover_media_id bigint references public.media_assets(id) on delete set null,
  published_revision_id bigint,
  scheduled_at timestamptz,
  published_at timestamptz,
  seo_title text check (seo_title is null or char_length(seo_title) <= 70),
  seo_description text
    check (seo_description is null or char_length(seo_description) <= 180),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_entries_published_complete check (
    status <> 'published'
    or (published_at is not null and published_revision_id is not null)
  )
);

create table if not exists public.content_revisions (
  id bigint generated always as identity primary key,
  content_entry_id bigint not null
    references public.content_entries(id) on delete cascade,
  revision_no integer not null check (revision_no > 0),
  body jsonb not null default '[]'::jsonb
    check (jsonb_typeof(body) = 'array'),
  change_summary text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (content_entry_id, revision_no)
);

do $migration$
begin
  alter table public.content_entries
    drop constraint if exists content_entries_slug_check;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.content_entries'::regclass
      and conname = 'content_entries_slug_format'
  ) then
    alter table public.content_entries
      add constraint content_entries_slug_format
      check (
        slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*(?:/[a-z0-9]+(?:-[a-z0-9]+)*)*$'
      ) not valid;
  end if;

  alter table public.content_entries
    validate constraint content_entries_slug_format;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.content_entries'::regclass
      and conname = 'content_entries_published_revision_fk'
  ) then
    alter table public.content_entries
      add constraint content_entries_published_revision_fk
      foreign key (published_revision_id)
      references public.content_revisions(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.content_entries'::regclass
      and conname = 'content_entries_published_complete'
  ) then
    alter table public.content_entries
      add constraint content_entries_published_complete
      check (
        status <> 'published'
        or (published_at is not null and published_revision_id is not null)
      ) not valid;
  end if;

  alter table public.content_entries
    validate constraint content_entries_published_complete;
end
$migration$;

create table if not exists public.content_entry_categories (
  content_entry_id bigint not null
    references public.content_entries(id) on delete cascade,
  category_id bigint not null
    references public.content_categories(id) on delete cascade,
  is_primary boolean not null default false,
  primary key (content_entry_id, category_id)
);

create unique index if not exists content_entry_one_primary_category_idx
  on public.content_entry_categories (content_entry_id)
  where is_primary;

create table if not exists public.content_entry_tags (
  content_entry_id bigint not null
    references public.content_entries(id) on delete cascade,
  tag_id bigint not null references public.content_tags(id) on delete cascade,
  primary key (content_entry_id, tag_id)
);

create table if not exists public.content_relations (
  content_entry_id bigint not null
    references public.content_entries(id) on delete cascade,
  related_content_entry_id bigint not null
    references public.content_entries(id) on delete cascade,
  relation_type text not null default 'related'
    check (relation_type in ('related', 'previous', 'next', 'recommended')),
  sort_order integer not null default 0,
  primary key (content_entry_id, related_content_entry_id, relation_type),
  check (content_entry_id <> related_content_entry_id)
);

create table if not exists public.content_collections (
  id bigint generated always as identity primary key,
  collection_key text not null unique
    check (collection_key ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  name text not null,
  description text,
  status text not null default 'active'
    check (status in ('draft', 'active', 'archived')),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_collection_items (
  collection_id bigint not null
    references public.content_collections(id) on delete cascade,
  content_entry_id bigint not null
    references public.content_entries(id) on delete cascade,
  sort_order integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  primary key (collection_id, content_entry_id),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

-- ---------------------------------------------------------------------------
-- Shared locations, staff, learning catalog, delivery, and learner state.
-- ---------------------------------------------------------------------------

create table if not exists public.locations (
  id bigint generated always as identity primary key,
  name text not null,
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  kind text not null default 'center'
    check (kind in ('center', 'room', 'online', 'external')),
  parent_id bigint references public.locations(id) on delete set null,
  timezone text not null default 'Europe/Bucharest',
  address_line_1 text,
  address_line_2 text,
  city text,
  region text,
  postal_code text,
  country_code text not null default 'RO'
    check (country_code ~ '^[A-Z]{2}$'),
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_id is null or parent_id <> id),
  check (latitude is null or latitude between -90 and 90),
  check (longitude is null or longitude between -180 and 180)
);

create table if not exists public.staff_members (
  id bigint generated always as identity primary key,
  user_id uuid unique references auth.users(id) on delete set null,
  display_name text not null,
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text,
  bio text,
  avatar_media_id bigint references public.media_assets(id) on delete set null,
  timezone text not null default 'Europe/Bucharest',
  is_bookable boolean not null default false,
  is_public boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id bigint generated always as identity primary key,
  parent_id bigint references public.subjects(id) on delete set null,
  name text not null,
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_id is null or parent_id <> id)
);

create table if not exists public.courses (
  id bigint generated always as identity primary key,
  subject_id bigint references public.subjects(id) on delete set null,
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  short_description text,
  description text,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'retired', 'archived')),
  visibility text not null default 'public'
    check (visibility in ('public', 'authenticated', 'entitled', 'private')),
  delivery_mode text not null default 'hybrid'
    check (delivery_mode in ('self_paced', 'live_online', 'in_person', 'hybrid')),
  cover_media_id bigint references public.media_assets(id) on delete set null,
  estimated_minutes integer
    check (estimated_minutes is null or estimated_minutes >= 0),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_staff (
  course_id bigint not null references public.courses(id) on delete cascade,
  staff_member_id bigint not null
    references public.staff_members(id) on delete cascade,
  role text not null default 'instructor'
    check (role in ('instructor', 'author', 'mentor', 'coordinator')),
  sort_order integer not null default 0,
  primary key (course_id, staff_member_id, role)
);

create table if not exists public.course_modules (
  id bigint generated always as identity primary key,
  course_id bigint not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  position integer not null check (position >= 0),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  available_from timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, position)
);

create table if not exists public.lessons (
  id bigint generated always as identity primary key,
  module_id bigint not null
    references public.course_modules(id) on delete cascade,
  slug text not null
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  summary text,
  lesson_type text not null default 'content'
    check (lesson_type in ('content', 'video', 'quiz', 'live', 'assignment')),
  position integer not null check (position >= 0),
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  is_preview boolean not null default false,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  body jsonb not null default '[]'::jsonb
    check (jsonb_typeof(body) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, slug),
  unique (module_id, position)
);

create table if not exists public.lesson_resources (
  id bigint generated always as identity primary key,
  lesson_id bigint not null references public.lessons(id) on delete cascade,
  media_asset_id bigint references public.media_assets(id) on delete set null,
  kind text not null default 'attachment'
    check (kind in ('primary', 'attachment', 'worksheet', 'transcript', 'link')),
  title text not null,
  external_url text,
  position integer not null default 0 check (position >= 0),
  is_downloadable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (media_asset_id is not null or external_url is not null)
);

create table if not exists public.course_offerings (
  id bigint generated always as identity primary key,
  course_id bigint not null references public.courses(id) on delete restrict,
  location_id bigint references public.locations(id) on delete set null,
  code text not null unique,
  cohort_label text,
  modality text not null default 'hybrid'
    check (modality in ('online', 'in_person', 'hybrid')),
  timezone text not null default 'Europe/Bucharest',
  status text not null default 'draft'
    check (status in ('draft', 'open', 'full', 'in_progress', 'completed', 'cancelled')),
  enrollment_opens_at timestamptz,
  enrollment_closes_at timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  capacity integer check (capacity is null or capacity > 0),
  exam_year smallint,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at),
  check (
    enrollment_closes_at is null
    or enrollment_opens_at is null
    or enrollment_closes_at > enrollment_opens_at
  )
);

create table if not exists public.course_sessions (
  id bigint generated always as identity primary key,
  offering_id bigint not null
    references public.course_offerings(id) on delete cascade,
  staff_member_id bigint references public.staff_members(id) on delete set null,
  location_id bigint references public.locations(id) on delete set null,
  title text not null,
  session_kind text not null default 'class'
    check (session_kind in ('class', 'seminar', 'lab', 'exam', 'office_hours')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.enrollments (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  offering_id bigint not null
    references public.course_offerings(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'paused', 'completed', 'cancelled', 'refunded')),
  source text not null default 'manual'
    check (source in ('manual', 'order', 'subscription', 'migration')),
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, offering_id),
  check (status <> 'completed' or completed_at is not null)
);

create table if not exists public.attendance (
  id bigint generated always as identity primary key,
  course_session_id bigint not null
    references public.course_sessions(id) on delete cascade,
  enrollment_id bigint
    references public.enrollments(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'unknown'
    check (status in ('unknown', 'present', 'late', 'excused', 'absent')),
  recorded_by uuid references auth.users(id) on delete set null,
  recorded_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_session_id, user_id)
);

create table if not exists public.lesson_progress (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id bigint not null references public.lessons(id) on delete cascade,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed')),
  progress_percent numeric(5, 2) not null default 0
    check (progress_percent between 0 and 100),
  last_position_seconds numeric(12, 3) not null default 0
    check (last_position_seconds >= 0),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id),
  check (status <> 'completed' or completed_at is not null)
);

-- ---------------------------------------------------------------------------
-- Appointment catalog, availability, and bookings. Rules use local wall-clock
-- time plus an IANA timezone; concrete bookings always use timestamptz.
-- ---------------------------------------------------------------------------

create table if not exists public.appointment_types (
  id bigint generated always as identity primary key,
  name text not null,
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  duration_minutes integer not null check (duration_minutes between 5 and 480),
  buffer_before_minutes integer not null default 0
    check (buffer_before_minutes between 0 and 240),
  buffer_after_minutes integer not null default 0
    check (buffer_after_minutes between 0 and 240),
  booking_notice_minutes integer not null default 120
    check (booking_notice_minutes >= 0),
  booking_horizon_days integer not null default 90
    check (booking_horizon_days between 1 and 730),
  location_mode text not null default 'either'
    check (location_mode in ('online', 'in_person', 'either')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.availability_rules (
  id bigint generated always as identity primary key,
  staff_member_id bigint not null
    references public.staff_members(id) on delete cascade,
  appointment_type_id bigint
    references public.appointment_types(id) on delete cascade,
  location_id bigint references public.locations(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  local_start_time time without time zone not null,
  local_end_time time without time zone not null,
  timezone text not null default 'Europe/Bucharest',
  effective_from date,
  effective_until date,
  slot_interval_minutes integer not null default 30
    check (slot_interval_minutes between 5 and 240),
  is_public boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (local_end_time > local_start_time),
  check (
    effective_until is null
    or effective_from is null
    or effective_until >= effective_from
  )
);

create table if not exists public.availability_exceptions (
  id bigint generated always as identity primary key,
  staff_member_id bigint not null
    references public.staff_members(id) on delete cascade,
  appointment_type_id bigint
    references public.appointment_types(id) on delete cascade,
  location_id bigint references public.locations(id) on delete cascade,
  kind text not null check (kind in ('available', 'unavailable')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  public_label text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.appointments (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  user_id uuid references auth.users(id) on delete set null,
  appointment_type_id bigint not null
    references public.appointment_types(id) on delete restrict,
  staff_member_id bigint
    references public.staff_members(id) on delete restrict,
  location_id bigint references public.locations(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  blocked_starts_at timestamptz,
  blocked_ends_at timestamptz,
  timezone text not null default 'Europe/Bucharest',
  status text not null default 'requested'
    check (
      status in (
        'requested', 'pending', 'confirmed', 'completed',
        'cancelled', 'declined', 'no_show'
      )
    ),
  contact_name text not null
    check (char_length(btrim(contact_name)) between 2 and 100),
  contact_email text not null
    check (char_length(contact_email) <= 320 and position('@' in contact_email) > 1),
  contact_phone text
    check (contact_phone is null or char_length(btrim(contact_phone)) between 7 and 32),
  customer_notes text,
  source text not null default 'website'
    check (source in ('website', 'admin', 'phone', 'migration')),
  created_by uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  constraint appointments_staff_required_for_active check (
    status not in ('requested', 'pending', 'confirmed')
    or staff_member_id is not null
  ),
  check (status <> 'confirmed' or confirmed_at is not null),
  check (status <> 'cancelled' or cancelled_at is not null)
);

create table if not exists public.appointment_status_history (
  id bigint generated always as identity primary key,
  appointment_id bigint not null
    references public.appointments(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references auth.users(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.appointments
  add column if not exists blocked_starts_at timestamptz,
  add column if not exists blocked_ends_at timestamptz;

create or replace function private.set_appointment_blocked_range()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  buffer_before integer;
  buffer_after integer;
begin
  select
    appointment_type.buffer_before_minutes,
    appointment_type.buffer_after_minutes
  into buffer_before, buffer_after
  from public.appointment_types as appointment_type
  where appointment_type.id = new.appointment_type_id;

  if not found then
    raise exception 'Unknown appointment_type_id: %', new.appointment_type_id
      using errcode = '23503';
  end if;

  new.blocked_starts_at :=
    new.starts_at - (buffer_before * interval '1 minute');
  new.blocked_ends_at :=
    new.ends_at + (buffer_after * interval '1 minute');

  return new;
end
$function$;

create or replace function private.refresh_appointment_blocked_ranges()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.buffer_before_minutes is distinct from old.buffer_before_minutes
    or new.buffer_after_minutes is distinct from old.buffer_after_minutes
  then
    update public.appointments
    set starts_at = starts_at
    where appointment_type_id = new.id;
  end if;

  return new;
end
$function$;

revoke all on function private.set_appointment_blocked_range()
  from public, anon, authenticated;
revoke all on function private.refresh_appointment_blocked_ranges()
  from public, anon, authenticated;

drop trigger if exists set_appointment_blocked_range
  on public.appointments;
create trigger set_appointment_blocked_range
before insert or update of appointment_type_id, starts_at, ends_at
on public.appointments
for each row execute function private.set_appointment_blocked_range();

drop trigger if exists refresh_appointment_blocked_ranges
  on public.appointment_types;
create trigger refresh_appointment_blocked_ranges
after update of buffer_before_minutes, buffer_after_minutes
on public.appointment_types
for each row execute function private.refresh_appointment_blocked_ranges();

update public.appointments as appointment
set
  blocked_starts_at =
    appointment.starts_at
    - (appointment_type.buffer_before_minutes * interval '1 minute'),
  blocked_ends_at =
    appointment.ends_at
    + (appointment_type.buffer_after_minutes * interval '1 minute')
from public.appointment_types as appointment_type
where appointment_type.id = appointment.appointment_type_id
  and (
    appointment.blocked_starts_at is distinct from (
      appointment.starts_at
      - (appointment_type.buffer_before_minutes * interval '1 minute')
    )
    or appointment.blocked_ends_at is distinct from (
      appointment.ends_at
      + (appointment_type.buffer_after_minutes * interval '1 minute')
    )
  );

alter table public.appointments
  alter column blocked_starts_at set not null,
  alter column blocked_ends_at set not null;

-- Exclusion constraints close race conditions that an application-level
-- availability query cannot close. Requested slots are holds, require a staff
-- member, and reserve the configured before/after buffers.
do $migration$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.appointments'::regclass
      and conname = 'appointments_staff_required_for_active'
      and position(
        'requested' in pg_get_constraintdef(oid)
      ) = 0
  ) then
    alter table public.appointments
      drop constraint appointments_staff_required_for_active;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.appointments'::regclass
      and conname = 'appointments_staff_required_for_active'
  ) then
    alter table public.appointments
      add constraint appointments_staff_required_for_active
      check (
        status not in ('requested', 'pending', 'confirmed')
        or staff_member_id is not null
      ) not valid;
  end if;

  alter table public.appointments
    validate constraint appointments_staff_required_for_active;

  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.appointments'::regclass
      and conname = 'appointments_staff_no_overlap'
      and position(
        'blocked_starts_at' in pg_get_constraintdef(oid)
      ) = 0
  ) then
    alter table public.appointments
      drop constraint appointments_staff_no_overlap;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.appointments'::regclass
      and conname = 'appointments_staff_no_overlap'
  ) then
    alter table public.appointments
      add constraint appointments_staff_no_overlap
      exclude using gist (
        staff_member_id with =,
        tstzrange(blocked_starts_at, blocked_ends_at, '[)') with &&
      )
      where (
        staff_member_id is not null
        and status in ('requested', 'pending', 'confirmed')
      );
  end if;

  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.appointments'::regclass
      and conname = 'appointments_user_no_overlap'
      and position(
        'blocked_starts_at' in pg_get_constraintdef(oid)
      ) = 0
  ) then
    alter table public.appointments
      drop constraint appointments_user_no_overlap;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.appointments'::regclass
      and conname = 'appointments_user_no_overlap'
  ) then
    alter table public.appointments
      add constraint appointments_user_no_overlap
      exclude using gist (
        user_id with =,
        tstzrange(blocked_starts_at, blocked_ends_at, '[)') with &&
      )
      where (
        user_id is not null
        and status in ('requested', 'pending', 'confirmed')
      );
  end if;
end
$migration$;

-- ---------------------------------------------------------------------------
-- Plans and commerce. Prices and immutable order snapshots use minor currency
-- units (for example bani), never floating point or provider card data.
-- ---------------------------------------------------------------------------

create table if not exists public.access_plans (
  id bigint generated always as identity primary key,
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  description text,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'retired', 'archived')),
  cover_media_id bigint references public.media_assets(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_entitlements (
  id bigint generated always as identity primary key,
  access_plan_id bigint not null
    references public.access_plans(id) on delete cascade,
  resource_type text not null
    check (resource_type in ('platform', 'course', 'content', 'media', 'product')),
  resource_id bigint,
  access_level text not null default 'view'
    check (access_level in ('view', 'download', 'participate', 'full')),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (access_plan_id, resource_type, resource_id, access_level),
  check (
    (resource_type = 'platform' and resource_id is null)
    or (resource_type <> 'platform' and resource_id is not null)
  ),
  check (resource_id is null or resource_id > 0)
);

create unique index if not exists plan_entitlements_dedupe_idx
  on public.plan_entitlements (
    access_plan_id,
    resource_type,
    coalesce(resource_id, 0),
    access_level
  );

create table if not exists public.product_categories (
  id bigint generated always as identity primary key,
  parent_id bigint references public.product_categories(id) on delete set null,
  name text not null,
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_id is null or parent_id <> id)
);

create table if not exists public.products (
  id bigint generated always as identity primary key,
  category_id bigint references public.product_categories(id) on delete set null,
  course_id bigint references public.courses(id) on delete set null,
  access_plan_id bigint references public.access_plans(id) on delete set null,
  cover_media_id bigint references public.media_assets(id) on delete set null,
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  short_description text,
  description text,
  product_type text not null default 'physical'
    check (product_type in ('physical', 'digital', 'course', 'subscription', 'bundle')),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'out_of_stock', 'retired', 'archived')),
  requires_shipping boolean not null default false,
  tracks_inventory boolean not null default false,
  tax_code text,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (product_type <> 'course' or course_id is not null),
  check (product_type <> 'subscription' or access_plan_id is not null)
);

create table if not exists public.product_variants (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  course_offering_id bigint
    references public.course_offerings(id) on delete set null,
  sku text not null unique,
  title text not null,
  status text not null default 'active'
    check (status in ('active', 'out_of_stock', 'retired')),
  attributes jsonb not null default '{}'::jsonb
    check (jsonb_typeof(attributes) = 'object'),
  weight_grams integer check (weight_grams is null or weight_grams >= 0),
  inventory_policy text not null default 'deny'
    check (inventory_policy in ('deny', 'continue')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_media (
  product_id bigint not null references public.products(id) on delete cascade,
  media_asset_id bigint not null
    references public.media_assets(id) on delete cascade,
  role text not null default 'gallery'
    check (role in ('cover', 'gallery', 'manual', 'preview')),
  sort_order integer not null default 0,
  primary key (product_id, media_asset_id, role)
);

create table if not exists public.product_prices (
  id bigint generated always as identity primary key,
  product_variant_id bigint not null
    references public.product_variants(id) on delete cascade,
  currency text not null default 'RON'
    check (currency ~ '^[A-Z]{3}$'),
  amount_minor bigint not null check (amount_minor >= 0),
  compare_at_amount_minor bigint
    check (compare_at_amount_minor is null or compare_at_amount_minor >= amount_minor),
  billing_interval text not null default 'one_time'
    check (billing_interval in ('one_time', 'month', 'year')),
  is_active boolean not null default true,
  valid_from timestamptz,
  valid_until timestamptz,
  external_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_until is null or valid_from is null or valid_until > valid_from)
);

create unique index if not exists product_prices_current_unique_idx
  on public.product_prices (product_variant_id, currency, billing_interval)
  where is_active and valid_until is null;

do $migration$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.product_prices'::regclass
      and conname = 'product_prices_active_no_overlap'
  ) then
    alter table public.product_prices
      add constraint product_prices_active_no_overlap
      exclude using gist (
        product_variant_id with =,
        currency with =,
        billing_interval with =,
        tstzrange(valid_from, valid_until, '[)') with &&
      )
      where (is_active);
  end if;
end
$migration$;

create table if not exists public.inventory_items (
  id bigint generated always as identity primary key,
  product_variant_id bigint not null unique
    references public.product_variants(id) on delete cascade,
  quantity_on_hand bigint not null default 0 check (quantity_on_hand >= 0),
  quantity_reserved bigint not null default 0 check (quantity_reserved >= 0),
  low_stock_threshold bigint not null default 0 check (low_stock_threshold >= 0),
  allow_backorder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (allow_backorder or quantity_reserved <= quantity_on_hand)
);

create table if not exists public.customer_addresses (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text,
  recipient_name text not null,
  phone text,
  address_line_1 text not null,
  address_line_2 text,
  city text not null,
  region text,
  postal_code text,
  country_code text not null default 'RO'
    check (country_code ~ '^[A-Z]{2}$'),
  is_default_billing boolean not null default false,
  is_default_shipping boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists customer_one_default_billing_idx
  on public.customer_addresses (user_id)
  where is_default_billing;

create unique index if not exists customer_one_default_shipping_idx
  on public.customer_addresses (user_id)
  where is_default_shipping;

create table if not exists public.carts (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'converted', 'abandoned', 'expired')),
  currency text not null default 'RON'
    check (currency ~ '^[A-Z]{3}$'),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists carts_one_active_per_user_idx
  on public.carts (user_id)
  where status = 'active';

create table if not exists public.cart_items (
  id bigint generated always as identity primary key,
  cart_id bigint not null references public.carts(id) on delete cascade,
  product_variant_id bigint not null
    references public.product_variants(id) on delete restrict,
  quantity integer not null default 1 check (quantity between 1 and 999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, product_variant_id)
);

create table if not exists public.orders (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  order_number text unique,
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending_payment'
    check (
      status in (
        'draft', 'pending_payment', 'paid', 'processing', 'shipped',
        'completed', 'cancelled', 'refunded'
      )
    ),
  payment_status text not null default 'unpaid'
    check (
      payment_status in (
        'unpaid', 'pending', 'paid', 'partially_refunded',
        'refunded', 'failed'
      )
    ),
  fulfillment_status text not null default 'unfulfilled'
    check (
      fulfillment_status in (
        'unfulfilled', 'partial', 'fulfilled', 'returned', 'not_required'
      )
    ),
  currency text not null default 'RON'
    check (currency ~ '^[A-Z]{3}$'),
  subtotal_minor bigint not null default 0 check (subtotal_minor >= 0),
  discount_minor bigint not null default 0 check (discount_minor >= 0),
  shipping_minor bigint not null default 0 check (shipping_minor >= 0),
  tax_minor bigint not null default 0 check (tax_minor >= 0),
  total_minor bigint not null default 0 check (total_minor >= 0),
  customer_name text not null,
  customer_email text not null
    check (char_length(customer_email) <= 320 and position('@' in customer_email) > 1),
  customer_phone text,
  billing_address jsonb
    check (billing_address is null or jsonb_typeof(billing_address) = 'object'),
  shipping_address jsonb
    check (shipping_address is null or jsonb_typeof(shipping_address) = 'object'),
  customer_notes text,
  placed_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    total_minor = subtotal_minor - discount_minor + shipping_minor + tax_minor
  ),
  check (status <> 'paid' or paid_at is not null),
  check (status <> 'cancelled' or cancelled_at is not null)
);

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  product_id bigint references public.products(id) on delete set null,
  product_variant_id bigint
    references public.product_variants(id) on delete set null,
  title_snapshot text not null,
  sku_snapshot text,
  product_type_snapshot text not null,
  quantity integer not null check (quantity between 1 and 999),
  unit_amount_minor bigint not null check (unit_amount_minor >= 0),
  discount_minor bigint not null default 0 check (discount_minor >= 0),
  tax_minor bigint not null default 0 check (tax_minor >= 0),
  total_minor bigint not null check (total_minor >= 0),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  check (
    total_minor = (unit_amount_minor * quantity) - discount_minor + tax_minor
  )
);

create table if not exists public.inventory_movements (
  id bigint generated always as identity primary key,
  product_variant_id bigint not null
    references public.product_variants(id) on delete restrict,
  order_item_id bigint references public.order_items(id) on delete set null,
  quantity_delta bigint not null check (quantity_delta <> 0),
  reason text not null
    check (
      reason in (
        'purchase', 'reservation', 'reservation_release', 'sale',
        'return', 'adjustment', 'damage', 'migration'
      )
    ),
  reference text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  access_plan_id bigint not null
    references public.access_plans(id) on delete restrict,
  status text not null default 'pending'
    check (
      status in (
        'pending', 'trialing', 'active', 'past_due',
        'paused', 'cancelled', 'expired'
      )
    ),
  current_period_starts_at timestamptz,
  current_period_ends_at timestamptz,
  trial_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    current_period_ends_at is null
    or current_period_starts_at is null
    or current_period_ends_at > current_period_starts_at
  ),
  check (status <> 'cancelled' or cancelled_at is not null)
);

create unique index if not exists subscriptions_one_live_plan_idx
  on public.subscriptions (user_id, access_plan_id)
  where status in ('pending', 'trialing', 'active', 'past_due', 'paused');

create table if not exists public.entitlements (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_type text not null
    check (resource_type in ('platform', 'course', 'content', 'media', 'product')),
  resource_id bigint,
  access_level text not null default 'view'
    check (access_level in ('view', 'download', 'participate', 'full')),
  source_type text not null
    check (source_type in ('manual', 'order', 'subscription', 'promotion', 'migration')),
  source_id bigint,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_until is null or valid_until > valid_from),
  check (
    (resource_type = 'platform' and resource_id is null)
    or (resource_type <> 'platform' and resource_id is not null)
  ),
  check (resource_id is null or resource_id > 0),
  check (source_id is null or source_id > 0)
);

create unique index if not exists entitlements_active_source_dedupe_idx
  on public.entitlements (
    user_id,
    resource_type,
    coalesce(resource_id, 0),
    access_level,
    source_type,
    coalesce(source_id, 0)
  )
  where revoked_at is null;

create table if not exists public.digital_deliveries (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_item_id bigint not null
    references public.order_items(id) on delete cascade,
  media_asset_id bigint not null
    references public.media_assets(id) on delete restrict,
  available_from timestamptz not null default now(),
  expires_at timestamptz,
  max_downloads integer check (max_downloads is null or max_downloads > 0),
  download_count integer not null default 0 check (download_count >= 0),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, order_item_id, media_asset_id),
  check (expires_at is null or expires_at > available_from),
  check (max_downloads is null or download_count <= max_downloads)
);

-- ---------------------------------------------------------------------------
-- Contact, newsletter, and auditable consent. Anonymous form endpoints are
-- intentionally server-mediated; raw Data API inserts are not granted to anon.
-- ---------------------------------------------------------------------------

create table if not exists public.contact_requests (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  user_id uuid references auth.users(id) on delete set null,
  appointment_id bigint references public.appointments(id) on delete set null,
  order_id bigint references public.orders(id) on delete set null,
  offering_id bigint references public.course_offerings(id) on delete set null,
  assigned_to_staff_id bigint
    references public.staff_members(id) on delete set null,
  name text not null check (char_length(btrim(name)) between 2 and 100),
  email text not null
    check (char_length(email) <= 320 and position('@' in email) > 1),
  phone text
    check (phone is null or char_length(btrim(phone)) between 7 and 32),
  topic text not null default 'general',
  message text not null check (char_length(btrim(message)) between 10 and 10000),
  preferred_channel text not null default 'email'
    check (preferred_channel in ('email', 'phone', 'whatsapp')),
  status text not null default 'new'
    check (status in ('new', 'in_progress', 'waiting', 'resolved', 'closed', 'spam')),
  consent_to_contact boolean not null default true,
  source text not null default 'website',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  email text not null check (char_length(email) <= 320 and position('@' in email) > 1),
  normalized_email text generated always as (lower(btrim(email))) stored,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'unsubscribed', 'bounced', 'complained')),
  source text not null default 'website',
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (normalized_email),
  check (status <> 'active' or confirmed_at is not null),
  check (status <> 'unsubscribed' or unsubscribed_at is not null)
);

create table if not exists public.newsletter_topics (
  id bigint generated always as identity primary key,
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscriber_topics (
  subscriber_id bigint not null
    references public.newsletter_subscribers(id) on delete cascade,
  topic_id bigint not null
    references public.newsletter_topics(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (subscriber_id, topic_id)
);

create table if not exists public.consent_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  subject_email text,
  purpose text not null
    check (purpose in ('contact', 'newsletter', 'marketing', 'terms', 'privacy')),
  action text not null check (action in ('granted', 'withdrawn')),
  policy_version text not null,
  source text not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  check (user_id is not null or subject_email is not null)
);

-- ---------------------------------------------------------------------------
-- Internal provider state and append-only audit data.
-- ---------------------------------------------------------------------------

create table if not exists private.webhook_events (
  id bigint generated always as identity primary key,
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'received'
    check (status in ('received', 'processing', 'processed', 'failed', 'ignored')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  next_attempt_at timestamptz,
  last_error text,
  unique (provider, provider_event_id)
);

create table if not exists private.payment_records (
  id bigint generated always as identity primary key,
  order_id bigint references public.orders(id) on delete set null,
  subscription_id bigint references public.subscriptions(id) on delete set null,
  provider text not null,
  provider_payment_reference text not null,
  kind text not null default 'payment'
    check (kind in ('authorization', 'payment', 'refund', 'chargeback')),
  status text not null,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  amount_minor bigint not null check (amount_minor >= 0),
  provider_created_at timestamptz,
  processed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_reference, kind),
  check (order_id is not null or subscription_id is not null)
);

create table if not exists private.subscription_provider_links (
  id bigint generated always as identity primary key,
  subscription_id bigint not null unique
    references public.subscriptions(id) on delete cascade,
  provider text not null,
  provider_customer_reference text,
  provider_subscription_reference text not null,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_subscription_reference)
);

create table if not exists private.contact_request_notes (
  id bigint generated always as identity primary key,
  contact_request_id bigint not null
    references public.contact_requests(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists private.appointment_notes (
  id bigint generated always as identity primary key,
  appointment_id bigint not null
    references public.appointments(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists private.audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_type text not null default 'user'
    check (actor_type in ('user', 'service', 'system', 'webhook')),
  action text not null,
  entity_schema text not null,
  entity_table text not null,
  entity_id text,
  before_state jsonb,
  after_state jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Foreign-key, policy, and common access-path indexes. PostgreSQL does not
-- create indexes automatically for the referencing side of foreign keys.
-- ---------------------------------------------------------------------------

create index if not exists media_assets_owner_user_idx
  on public.media_assets (owner_user_id) where owner_user_id is not null;
create index if not exists media_assets_uploaded_by_idx
  on public.media_assets (uploaded_by) where uploaded_by is not null;
create index if not exists media_assets_access_status_idx
  on public.media_assets (access_level, status);

create index if not exists content_authors_avatar_idx
  on public.content_authors (avatar_media_id) where avatar_media_id is not null;
create index if not exists content_categories_parent_idx
  on public.content_categories (parent_id) where parent_id is not null;
create index if not exists content_entries_author_idx
  on public.content_entries (author_id) where author_id is not null;
create index if not exists content_entries_cover_idx
  on public.content_entries (cover_media_id) where cover_media_id is not null;
create index if not exists content_entries_published_revision_idx
  on public.content_entries (published_revision_id)
  where published_revision_id is not null;
create index if not exists content_entries_created_by_idx
  on public.content_entries (created_by) where created_by is not null;
create index if not exists content_entries_updated_by_idx
  on public.content_entries (updated_by) where updated_by is not null;
create index if not exists content_entries_published_idx
  on public.content_entries (published_at desc, id)
  where status = 'published';
create index if not exists content_revisions_created_by_idx
  on public.content_revisions (created_by) where created_by is not null;
create index if not exists content_entry_categories_category_idx
  on public.content_entry_categories (category_id, content_entry_id);
create index if not exists content_entry_tags_tag_idx
  on public.content_entry_tags (tag_id, content_entry_id);
create index if not exists content_relations_related_idx
  on public.content_relations (related_content_entry_id);
create index if not exists content_collection_items_entry_idx
  on public.content_collection_items (content_entry_id);

create index if not exists locations_parent_idx
  on public.locations (parent_id) where parent_id is not null;
create index if not exists staff_members_avatar_idx
  on public.staff_members (avatar_media_id) where avatar_media_id is not null;
create index if not exists staff_members_public_idx
  on public.staff_members (is_active, is_public);
create index if not exists subjects_parent_idx
  on public.subjects (parent_id) where parent_id is not null;
create index if not exists courses_subject_idx
  on public.courses (subject_id) where subject_id is not null;
create index if not exists courses_cover_idx
  on public.courses (cover_media_id) where cover_media_id is not null;
create index if not exists courses_created_by_idx
  on public.courses (created_by) where created_by is not null;
create index if not exists courses_updated_by_idx
  on public.courses (updated_by) where updated_by is not null;
create index if not exists courses_catalog_idx
  on public.courses (status, visibility, id);
create index if not exists course_staff_staff_idx
  on public.course_staff (staff_member_id, course_id);
create index if not exists lesson_resources_lesson_idx
  on public.lesson_resources (lesson_id);
create index if not exists lesson_resources_media_idx
  on public.lesson_resources (media_asset_id) where media_asset_id is not null;
create index if not exists course_offerings_course_idx
  on public.course_offerings (course_id, status);
create index if not exists course_offerings_location_idx
  on public.course_offerings (location_id) where location_id is not null;
create index if not exists course_offerings_schedule_idx
  on public.course_offerings (starts_at, ends_at)
  where status in ('open', 'full', 'in_progress');
create index if not exists course_sessions_offering_time_idx
  on public.course_sessions (offering_id, starts_at);
create index if not exists course_sessions_staff_time_idx
  on public.course_sessions (staff_member_id, starts_at)
  where staff_member_id is not null and status = 'scheduled';
create index if not exists course_sessions_staff_idx
  on public.course_sessions (staff_member_id)
  where staff_member_id is not null;
create index if not exists course_sessions_staff_fk_idx
  on public.course_sessions (staff_member_id);
create index if not exists course_sessions_location_idx
  on public.course_sessions (location_id) where location_id is not null;
create index if not exists enrollments_offering_idx
  on public.enrollments (offering_id, status);
create index if not exists attendance_user_idx
  on public.attendance (user_id, course_session_id);
create index if not exists attendance_enrollment_idx
  on public.attendance (enrollment_id) where enrollment_id is not null;
create index if not exists attendance_recorded_by_idx
  on public.attendance (recorded_by) where recorded_by is not null;
create index if not exists lesson_progress_lesson_idx
  on public.lesson_progress (lesson_id, status);

create index if not exists availability_rules_staff_idx
  on public.availability_rules (staff_member_id, weekday, is_active);
create index if not exists availability_rules_type_idx
  on public.availability_rules (appointment_type_id)
  where appointment_type_id is not null;
create index if not exists availability_rules_location_idx
  on public.availability_rules (location_id) where location_id is not null;
create index if not exists availability_exceptions_staff_time_idx
  on public.availability_exceptions (staff_member_id, starts_at, ends_at);
create index if not exists availability_exceptions_type_idx
  on public.availability_exceptions (appointment_type_id)
  where appointment_type_id is not null;
create index if not exists availability_exceptions_location_idx
  on public.availability_exceptions (location_id) where location_id is not null;
create index if not exists appointments_user_time_idx
  on public.appointments (user_id, starts_at desc) where user_id is not null;
create index if not exists appointments_type_idx
  on public.appointments (appointment_type_id, starts_at);
create index if not exists appointments_staff_time_idx
  on public.appointments (staff_member_id, starts_at)
  where staff_member_id is not null;
create index if not exists appointments_location_idx
  on public.appointments (location_id) where location_id is not null;
create index if not exists appointments_created_by_idx
  on public.appointments (created_by) where created_by is not null;
create index if not exists appointments_status_time_idx
  on public.appointments (status, starts_at);
create index if not exists appointment_history_appointment_idx
  on public.appointment_status_history (appointment_id, created_at);
create index if not exists appointment_history_changed_by_idx
  on public.appointment_status_history (changed_by) where changed_by is not null;

create index if not exists access_plans_cover_idx
  on public.access_plans (cover_media_id) where cover_media_id is not null;
create index if not exists plan_entitlements_resource_idx
  on public.plan_entitlements (resource_type, resource_id)
  where resource_id is not null;
create index if not exists product_categories_parent_idx
  on public.product_categories (parent_id) where parent_id is not null;
create index if not exists products_category_idx
  on public.products (category_id) where category_id is not null;
create index if not exists products_course_idx
  on public.products (course_id) where course_id is not null;
create index if not exists products_access_plan_idx
  on public.products (access_plan_id) where access_plan_id is not null;
create index if not exists products_cover_idx
  on public.products (cover_media_id) where cover_media_id is not null;
create index if not exists products_created_by_idx
  on public.products (created_by) where created_by is not null;
create index if not exists products_updated_by_idx
  on public.products (updated_by) where updated_by is not null;
create index if not exists products_catalog_idx
  on public.products (status, product_type, id);
create index if not exists product_variants_product_idx
  on public.product_variants (product_id, status);
create index if not exists product_variants_offering_idx
  on public.product_variants (course_offering_id)
  where course_offering_id is not null;
create index if not exists product_media_media_idx
  on public.product_media (media_asset_id);
create index if not exists product_prices_variant_idx
  on public.product_prices (product_variant_id, is_active, valid_from, valid_until);
create index if not exists customer_addresses_user_idx
  on public.customer_addresses (user_id);
create index if not exists cart_items_variant_idx
  on public.cart_items (product_variant_id);
create index if not exists carts_user_idx
  on public.carts (user_id);
create index if not exists orders_user_idx
  on public.orders (user_id, created_at desc) where user_id is not null;
create index if not exists orders_status_idx
  on public.orders (status, created_at);
create index if not exists order_items_order_idx
  on public.order_items (order_id);
create index if not exists order_items_product_idx
  on public.order_items (product_id) where product_id is not null;
create index if not exists order_items_variant_idx
  on public.order_items (product_variant_id) where product_variant_id is not null;
create index if not exists inventory_movements_variant_idx
  on public.inventory_movements (product_variant_id, created_at);
create index if not exists inventory_movements_order_item_idx
  on public.inventory_movements (order_item_id) where order_item_id is not null;
create index if not exists inventory_movements_created_by_idx
  on public.inventory_movements (created_by) where created_by is not null;
create index if not exists subscriptions_user_idx
  on public.subscriptions (user_id, status);
create index if not exists subscriptions_plan_idx
  on public.subscriptions (access_plan_id, status);
create index if not exists entitlements_user_active_idx
  on public.entitlements (user_id, resource_type, resource_id, valid_until)
  where revoked_at is null;
create index if not exists entitlements_user_idx
  on public.entitlements (user_id);
create index if not exists entitlements_resource_idx
  on public.entitlements (resource_type, resource_id)
  where revoked_at is null;
create index if not exists digital_deliveries_user_idx
  on public.digital_deliveries (user_id, revoked_at, expires_at);
create index if not exists digital_deliveries_order_item_idx
  on public.digital_deliveries (order_item_id);
create index if not exists digital_deliveries_media_idx
  on public.digital_deliveries (media_asset_id);

create index if not exists contact_requests_user_idx
  on public.contact_requests (user_id, created_at desc) where user_id is not null;
create index if not exists contact_requests_appointment_idx
  on public.contact_requests (appointment_id) where appointment_id is not null;
create index if not exists contact_requests_order_idx
  on public.contact_requests (order_id) where order_id is not null;
create index if not exists contact_requests_offering_idx
  on public.contact_requests (offering_id) where offering_id is not null;
create index if not exists contact_requests_assigned_idx
  on public.contact_requests (assigned_to_staff_id, status)
  where assigned_to_staff_id is not null;
create index if not exists contact_requests_status_idx
  on public.contact_requests (status, created_at);
create index if not exists newsletter_subscribers_user_idx
  on public.newsletter_subscribers (user_id) where user_id is not null;
create index if not exists newsletter_subscribers_status_idx
  on public.newsletter_subscribers (status, created_at);
create index if not exists newsletter_subscriber_topics_topic_idx
  on public.newsletter_subscriber_topics (topic_id, subscriber_id);
create index if not exists consent_events_user_idx
  on public.consent_events (user_id, occurred_at desc) where user_id is not null;
create index if not exists consent_events_email_idx
  on public.consent_events (lower(subject_email), occurred_at desc)
  where subject_email is not null;

create index if not exists webhook_events_work_queue_idx
  on private.webhook_events (status, next_attempt_at, received_at);
create index if not exists payment_records_order_idx
  on private.payment_records (order_id) where order_id is not null;
create index if not exists payment_records_subscription_idx
  on private.payment_records (subscription_id) where subscription_id is not null;
create index if not exists payment_records_status_idx
  on private.payment_records (status, created_at);
create index if not exists contact_request_notes_request_idx
  on private.contact_request_notes (contact_request_id, created_at);
create index if not exists contact_request_notes_author_idx
  on private.contact_request_notes (author_user_id)
  where author_user_id is not null;
create index if not exists appointment_notes_appointment_idx
  on private.appointment_notes (appointment_id, created_at);
create index if not exists appointment_notes_author_idx
  on private.appointment_notes (author_user_id)
  where author_user_id is not null;
create index if not exists audit_log_actor_idx
  on private.audit_log (actor_user_id, created_at desc)
  where actor_user_id is not null;
create index if not exists audit_log_entity_idx
  on private.audit_log (entity_schema, entity_table, entity_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Trusted authorization helpers. These functions are SECURITY DEFINER because
-- policies must inspect protected tables without recursively depending on the
-- caller's row visibility. Every helper rejects a missing Auth identity.
-- ---------------------------------------------------------------------------

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.account_roles as roles
      where roles.user_id = (select auth.uid())
        and roles.role = 'admin'::public.smartmed_role
    )
$function$;

create or replace function private.has_active_entitlement(
  p_resource_type text,
  p_resource_id bigint,
  p_required_access text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.entitlements as entitlement
      where entitlement.user_id = (select auth.uid())
        and entitlement.resource_type = p_resource_type
        and entitlement.resource_id is not distinct from p_resource_id
        and entitlement.revoked_at is null
        and entitlement.valid_from <= statement_timestamp()
        and (
          entitlement.valid_until is null
          or entitlement.valid_until > statement_timestamp()
        )
        and case p_required_access
          when 'view' then entitlement.access_level
            in ('view', 'download', 'participate', 'full')
          when 'download' then entitlement.access_level in ('download', 'full')
          when 'participate' then entitlement.access_level in ('participate', 'full')
          when 'full' then entitlement.access_level = 'full'
          else false
        end
    )
$function$;

create or replace function private.can_access_course(p_course_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    (select auth.uid()) is not null
    and (
      private.is_admin()
      or (
        exists (
          select 1
          from public.courses as course
          where course.id = p_course_id
            and course.status = 'active'
            and course.visibility <> 'private'
        )
        and (
          private.has_active_entitlement('platform', null, 'view')
          or private.has_active_entitlement('course', p_course_id, 'view')
          or exists (
            select 1
            from public.enrollments as enrollment
            join public.course_offerings as offering
              on offering.id = enrollment.offering_id
            where enrollment.user_id = (select auth.uid())
              and enrollment.status in ('active', 'completed')
              and offering.course_id = p_course_id
          )
        )
      )
    )
$function$;

create or replace function private.can_read_content(p_content_entry_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    (select auth.uid()) is not null
    and (
      private.is_admin()
      or exists (
        select 1
        from public.content_entries as entry
        where entry.id = p_content_entry_id
          and entry.status = 'published'
          and entry.published_at <= statement_timestamp()
          and (
            entry.visibility in ('public', 'authenticated')
            or (
              entry.visibility = 'entitled'
              and (
                private.has_active_entitlement('platform', null, 'view')
                or private.has_active_entitlement('content', entry.id, 'view')
              )
            )
          )
      )
    )
$function$;

create or replace function private.can_read_storage_object(
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
    case
      when (select auth.uid()) is null then false
      when p_bucket_id <> 'course-media' then false
      when private.is_admin() then true
      else exists (
        select 1
        from public.media_assets as media
        join public.lesson_resources as resource
          on resource.media_asset_id = media.id
        join public.lessons as lesson
          on lesson.id = resource.lesson_id
        join public.course_modules as module
          on module.id = lesson.module_id
        join public.courses as course
          on course.id = module.course_id
        where media.storage_bucket = p_bucket_id
          and media.storage_path = p_object_name
          and media.status = 'active'
          and media.access_level <> 'private'
          and lesson.status = 'published'
          and module.status = 'published'
          and (
            module.available_from is null
            or module.available_from <= statement_timestamp()
          )
          and course.status = 'active'
          and course.visibility <> 'private'
          and (
            (
              lesson.is_preview
              and media.access_level in ('public', 'authenticated')
            )
            or private.can_access_course(course.id)
            or private.has_active_entitlement('media', media.id, 'view')
          )
      )
    end
$function$;

create or replace function private.owns_appointment(p_appointment_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.appointments as appointment
      where appointment.id = p_appointment_id
        and appointment.user_id = (select auth.uid())
    )
$function$;

create or replace function private.owns_order(p_order_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.orders as customer_order
      where customer_order.id = p_order_id
        and customer_order.user_id = (select auth.uid())
    )
$function$;

create or replace function private.owns_active_cart(p_cart_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.carts as cart
      where cart.id = p_cart_id
        and cart.user_id = (select auth.uid())
        and cart.status = 'active'
    )
$function$;

create or replace function private.can_mutate_cart_item(
  p_cart_id bigint,
  p_product_variant_id bigint
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.carts as cart
      join public.product_variants as variant
        on variant.id = p_product_variant_id
      join public.products as product
        on product.id = variant.product_id
      where cart.id = p_cart_id
        and cart.user_id = (select auth.uid())
        and cart.status = 'active'
        and variant.status = 'active'
        and product.status = 'active'
        and exists (
          select 1
          from public.product_prices as price
          where price.product_variant_id = variant.id
            and price.currency = cart.currency
            and price.is_active
            and (
              price.valid_from is null
              or price.valid_from <= statement_timestamp()
            )
            and (
              price.valid_until is null
              or price.valid_until > statement_timestamp()
            )
        )
    )
$function$;

create or replace function private.owns_newsletter_subscriber(
  p_subscriber_id bigint
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.newsletter_subscribers as subscriber
      where subscriber.id = p_subscriber_id
        and subscriber.user_id = (select auth.uid())
    )
$function$;

create or replace function private.can_reference_contact_context(
  p_appointment_id bigint,
  p_order_id bigint,
  p_offering_id bigint
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    (select auth.uid()) is not null
    and (
      p_appointment_id is null
      or private.owns_appointment(p_appointment_id)
    )
    and (
      p_order_id is null
      or private.owns_order(p_order_id)
    )
    and (
      p_offering_id is null
      or exists (
        select 1
        from public.course_offerings as offering
        join public.courses as course
          on course.id = offering.course_id
        where offering.id = p_offering_id
          and offering.status in ('open', 'full', 'in_progress', 'completed')
          and (
            (
              course.status = 'active'
              and course.visibility in ('public', 'authenticated')
            )
            or private.can_access_course(course.id)
          )
      )
    )
$function$;

revoke all on function private.is_admin() from public, anon, authenticated;
revoke all on function private.has_active_entitlement(text, bigint, text)
  from public, anon, authenticated;
revoke all on function private.can_access_course(bigint)
  from public, anon, authenticated;
revoke all on function private.can_read_content(bigint)
  from public, anon, authenticated;
revoke all on function private.can_read_storage_object(text, text)
  from public, anon, authenticated;
revoke all on function private.owns_appointment(bigint)
  from public, anon, authenticated;
revoke all on function private.owns_order(bigint)
  from public, anon, authenticated;
revoke all on function private.owns_active_cart(bigint)
  from public, anon, authenticated;
revoke all on function private.can_mutate_cart_item(bigint, bigint)
  from public, anon, authenticated;
revoke all on function private.owns_newsletter_subscriber(bigint)
  from public, anon, authenticated;
revoke all on function private.can_reference_contact_context(bigint, bigint, bigint)
  from public, anon, authenticated;

grant usage on schema private to authenticated, service_role;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.has_active_entitlement(text, bigint, text)
  to authenticated;
grant execute on function private.can_access_course(bigint) to authenticated;
grant execute on function private.can_read_content(bigint) to authenticated;
grant execute on function private.can_read_storage_object(text, text)
  to authenticated;
grant execute on function private.owns_appointment(bigint) to authenticated;
grant execute on function private.owns_order(bigint) to authenticated;
grant execute on function private.owns_active_cart(bigint) to authenticated;
grant execute on function private.can_mutate_cart_item(bigint, bigint)
  to authenticated;
grant execute on function private.owns_newsletter_subscriber(bigint)
  to authenticated;
grant execute on function private.can_reference_contact_context(bigint, bigint, bigint)
  to authenticated;

-- Publishing must point at a revision owned by the same entry.
create or replace function private.validate_published_revision()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.published_revision_id is not null
    and not exists (
      select 1
      from public.content_revisions as revision
      where revision.id = new.published_revision_id
        and revision.content_entry_id = new.id
    )
  then
    raise exception 'published_revision_id must belong to the content entry'
      using errcode = '23514';
  end if;

  return new;
end
$function$;

revoke all on function private.validate_published_revision()
  from public, anon, authenticated;

drop trigger if exists validate_content_published_revision
  on public.content_entries;
create trigger validate_content_published_revision
before insert or update of published_revision_id on public.content_entries
for each row execute function private.validate_published_revision();

-- Keep an immutable status trail without asking client code to write it.
create or replace function private.record_appointment_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.status is distinct from old.status then
    if new.status = 'confirmed' and new.confirmed_at is null then
      new.confirmed_at := statement_timestamp();
    end if;

    if new.status = 'cancelled' and new.cancelled_at is null then
      new.cancelled_at := statement_timestamp();
    end if;
  end if;

  return new;
end
$function$;

create or replace function private.append_appointment_status_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.status is distinct from old.status then
    insert into public.appointment_status_history (
      appointment_id,
      from_status,
      to_status,
      changed_by
    )
    values (
      new.id,
      old.status,
      new.status,
      (select auth.uid())
    );
  end if;

  return new;
end
$function$;

revoke all on function private.record_appointment_status_change()
  from public, anon, authenticated;
revoke all on function private.append_appointment_status_history()
  from public, anon, authenticated;

drop trigger if exists set_appointment_status_timestamps
  on public.appointments;
create trigger set_appointment_status_timestamps
before update of status on public.appointments
for each row execute function private.record_appointment_status_change();

drop trigger if exists append_appointment_status_history
  on public.appointments;
create trigger append_appointment_status_history
after update of status on public.appointments
for each row execute function private.append_appointment_status_history();

-- A single trigger function keeps timestamp behavior consistent across modules.
do $migration$
declare
  table_name text;
begin
  foreach table_name in array array[
    'media_assets',
    'content_authors',
    'content_categories',
    'content_tags',
    'content_entries',
    'content_collections',
    'locations',
    'staff_members',
    'subjects',
    'courses',
    'course_modules',
    'lessons',
    'lesson_resources',
    'course_offerings',
    'course_sessions',
    'enrollments',
    'attendance',
    'lesson_progress',
    'appointment_types',
    'availability_rules',
    'availability_exceptions',
    'appointments',
    'access_plans',
    'product_categories',
    'products',
    'product_variants',
    'product_prices',
    'inventory_items',
    'customer_addresses',
    'carts',
    'cart_items',
    'orders',
    'subscriptions',
    'entitlements',
    'digital_deliveries',
    'contact_requests',
    'newsletter_subscribers',
    'newsletter_topics'
  ]
  loop
    execute format(
      'drop trigger if exists set_%I_updated_at on public.%I',
      table_name,
      table_name
    );
    execute format(
      'create trigger set_%I_updated_at before update on public.%I '
      || 'for each row execute function private.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end
$migration$;

drop trigger if exists set_payment_records_updated_at
  on private.payment_records;
create trigger set_payment_records_updated_at
before update on private.payment_records
for each row execute function private.set_updated_at();

drop trigger if exists set_subscription_provider_links_updated_at
  on private.subscription_provider_links;
create trigger set_subscription_provider_links_updated_at
before update on private.subscription_provider_links
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security. New Supabase projects no longer implicitly expose newly
-- created tables, so RLS and grants are both declared in this migration.
-- ---------------------------------------------------------------------------

do $migration$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'account_roles',
    'media_assets',
    'content_authors',
    'content_categories',
    'content_tags',
    'content_entries',
    'content_revisions',
    'content_entry_categories',
    'content_entry_tags',
    'content_relations',
    'content_collections',
    'content_collection_items',
    'locations',
    'staff_members',
    'subjects',
    'courses',
    'course_staff',
    'course_modules',
    'lessons',
    'lesson_resources',
    'course_offerings',
    'course_sessions',
    'enrollments',
    'attendance',
    'lesson_progress',
    'appointment_types',
    'availability_rules',
    'availability_exceptions',
    'appointments',
    'appointment_status_history',
    'access_plans',
    'plan_entitlements',
    'product_categories',
    'products',
    'product_variants',
    'product_media',
    'product_prices',
    'inventory_items',
    'customer_addresses',
    'carts',
    'cart_items',
    'orders',
    'order_items',
    'inventory_movements',
    'subscriptions',
    'entitlements',
    'digital_deliveries',
    'contact_requests',
    'newsletter_subscribers',
    'newsletter_topics',
    'newsletter_subscriber_topics',
    'consent_events'
  ]
  loop
    execute format(
      'alter table public.%I enable row level security',
      table_name
    );
  end loop;
end
$migration$;

alter table private.webhook_events enable row level security;
alter table private.payment_records enable row level security;
alter table private.subscription_provider_links enable row level security;
alter table private.contact_request_notes enable row level security;
alter table private.appointment_notes enable row level security;
alter table private.audit_log enable row level security;

-- Remove the title-cased policies from the legacy Auth migration before
-- installing consistently named, init-plan-friendly policies.
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can read own role" on public.account_roles;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists account_roles_select_own on public.account_roles;
create policy account_roles_select_own
on public.account_roles
for select
to authenticated
using ((select auth.uid()) = user_id);

-- A shared admin policy is safe because table privileges below still decide
-- which operations an authenticated admin may perform.
do $migration$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'account_roles',
    'media_assets',
    'content_authors',
    'content_categories',
    'content_tags',
    'content_entries',
    'content_revisions',
    'content_entry_categories',
    'content_entry_tags',
    'content_relations',
    'content_collections',
    'content_collection_items',
    'locations',
    'staff_members',
    'subjects',
    'courses',
    'course_staff',
    'course_modules',
    'lessons',
    'lesson_resources',
    'course_offerings',
    'course_sessions',
    'enrollments',
    'attendance',
    'lesson_progress',
    'appointment_types',
    'availability_rules',
    'availability_exceptions',
    'appointments',
    'appointment_status_history',
    'access_plans',
    'plan_entitlements',
    'product_categories',
    'products',
    'product_variants',
    'product_media',
    'product_prices',
    'inventory_items',
    'customer_addresses',
    'carts',
    'cart_items',
    'orders',
    'order_items',
    'inventory_movements',
    'subscriptions',
    'entitlements',
    'digital_deliveries',
    'contact_requests',
    'newsletter_subscribers',
    'newsletter_topics',
    'newsletter_subscriber_topics',
    'consent_events'
  ]
  loop
    execute format(
      'drop policy if exists admin_manage on public.%I',
      table_name
    );
    execute format(
      'create policy admin_manage on public.%I for all to authenticated '
      || 'using ((select private.is_admin())) '
      || 'with check ((select private.is_admin()))',
      table_name
    );
  end loop;
end
$migration$;

-- Media metadata follows the same visibility boundary as its object bytes.
drop policy if exists media_assets_select_public on public.media_assets;
create policy media_assets_select_public
on public.media_assets
for select
to anon
using (
  storage_bucket = 'public-media'
  and status = 'active'
  and access_level = 'public'
);

drop policy if exists media_assets_select_authenticated on public.media_assets;
create policy media_assets_select_authenticated
on public.media_assets
for select
to authenticated
using (
  status = 'active'
  and (
    access_level in ('public', 'authenticated')
    or owner_user_id = (select auth.uid())
    or private.has_active_entitlement('platform', null, 'view')
    or private.has_active_entitlement('media', id, 'view')
  )
);

drop policy if exists content_authors_select_public on public.content_authors;
create policy content_authors_select_public
on public.content_authors
for select
to anon, authenticated
using (status = 'active');

drop policy if exists content_categories_select_public
  on public.content_categories;
create policy content_categories_select_public
on public.content_categories
for select
to anon, authenticated
using (is_active);

drop policy if exists content_tags_select_public on public.content_tags;
create policy content_tags_select_public
on public.content_tags
for select
to anon, authenticated
using (true);

drop policy if exists content_entries_select_public on public.content_entries;
create policy content_entries_select_public
on public.content_entries
for select
to anon
using (
  status = 'published'
  and visibility = 'public'
  and published_at <= statement_timestamp()
);

drop policy if exists content_entries_select_authenticated
  on public.content_entries;
create policy content_entries_select_authenticated
on public.content_entries
for select
to authenticated
using (private.can_read_content(id));

drop policy if exists content_revisions_select_public
  on public.content_revisions;
create policy content_revisions_select_public
on public.content_revisions
for select
to anon
using (
  exists (
    select 1
    from public.content_entries as entry
    where entry.id = content_revisions.content_entry_id
      and entry.published_revision_id = content_revisions.id
  )
);

drop policy if exists content_revisions_select_authenticated
  on public.content_revisions;
create policy content_revisions_select_authenticated
on public.content_revisions
for select
to authenticated
using (
  exists (
    select 1
    from public.content_entries as entry
    where entry.id = content_revisions.content_entry_id
      and entry.published_revision_id = content_revisions.id
      and private.can_read_content(entry.id)
  )
);

drop policy if exists content_entry_categories_select_visible
  on public.content_entry_categories;
create policy content_entry_categories_select_visible
on public.content_entry_categories
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.content_entries as entry
    where entry.id = content_entry_categories.content_entry_id
  )
);

drop policy if exists content_entry_tags_select_visible
  on public.content_entry_tags;
create policy content_entry_tags_select_visible
on public.content_entry_tags
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.content_entries as entry
    where entry.id = content_entry_tags.content_entry_id
  )
);

drop policy if exists content_relations_select_visible
  on public.content_relations;
create policy content_relations_select_visible
on public.content_relations
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.content_entries as source_entry
    where source_entry.id = content_relations.content_entry_id
  )
  and exists (
    select 1
    from public.content_entries as related_entry
    where related_entry.id = content_relations.related_content_entry_id
  )
);

drop policy if exists content_collections_select_active
  on public.content_collections;
create policy content_collections_select_active
on public.content_collections
for select
to anon, authenticated
using (status = 'active');

drop policy if exists content_collection_items_select_visible
  on public.content_collection_items;
create policy content_collection_items_select_visible
on public.content_collection_items
for select
to anon, authenticated
using (
  (starts_at is null or starts_at <= statement_timestamp())
  and (ends_at is null or ends_at > statement_timestamp())
  and exists (
    select 1
    from public.content_collections as collection
    where collection.id = content_collection_items.collection_id
  )
  and exists (
    select 1
    from public.content_entries as entry
    where entry.id = content_collection_items.content_entry_id
  )
);

drop policy if exists locations_select_active on public.locations;
create policy locations_select_active
on public.locations
for select
to anon, authenticated
using (is_active);

drop policy if exists staff_members_select_public on public.staff_members;
create policy staff_members_select_public
on public.staff_members
for select
to anon, authenticated
using (is_active and is_public);

drop policy if exists subjects_select_active on public.subjects;
create policy subjects_select_active
on public.subjects
for select
to anon, authenticated
using (is_active);

drop policy if exists courses_select_public on public.courses;
create policy courses_select_public
on public.courses
for select
to anon
using (status = 'active' and visibility = 'public');

drop policy if exists courses_select_authenticated on public.courses;
create policy courses_select_authenticated
on public.courses
for select
to authenticated
using (
  (status = 'active' and visibility in ('public', 'authenticated'))
  or private.can_access_course(id)
);

drop policy if exists course_staff_select_visible on public.course_staff;
create policy course_staff_select_visible
on public.course_staff
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.courses as course
    where course.id = course_staff.course_id
  )
  and exists (
    select 1
    from public.staff_members as staff
    where staff.id = course_staff.staff_member_id
  )
);

drop policy if exists course_modules_select_public
  on public.course_modules;
create policy course_modules_select_public
on public.course_modules
for select
to anon, authenticated
using (
  status = 'published'
  and (available_from is null or available_from <= statement_timestamp())
  and exists (
    select 1
    from public.courses as course
    where course.id = course_modules.course_id
  )
);

drop policy if exists lessons_select_preview on public.lessons;
create policy lessons_select_preview
on public.lessons
for select
to anon
using (
  status = 'published'
  and is_preview
  and exists (
    select 1
    from public.course_modules as module
    where module.id = lessons.module_id
  )
);

drop policy if exists lessons_select_authenticated on public.lessons;
create policy lessons_select_authenticated
on public.lessons
for select
to authenticated
using (
  status = 'published'
  and exists (
    select 1
    from public.course_modules as module
    where module.id = lessons.module_id
      and (
        lessons.is_preview
        or private.can_access_course(module.course_id)
      )
  )
);

drop policy if exists lesson_resources_select_preview
  on public.lesson_resources;
create policy lesson_resources_select_preview
on public.lesson_resources
for select
to anon
using (
  exists (
    select 1
    from public.lessons as lesson
    where lesson.id = lesson_resources.lesson_id
      and lesson.is_preview
  )
);

drop policy if exists lesson_resources_select_authenticated
  on public.lesson_resources;
create policy lesson_resources_select_authenticated
on public.lesson_resources
for select
to authenticated
using (
  exists (
    select 1
    from public.lessons as lesson
    join public.course_modules as module
      on module.id = lesson.module_id
    where lesson.id = lesson_resources.lesson_id
      and (
        lesson.is_preview
        or private.can_access_course(module.course_id)
      )
  )
);

drop policy if exists course_offerings_select_catalog
  on public.course_offerings;
create policy course_offerings_select_catalog
on public.course_offerings
for select
to anon, authenticated
using (
  status in ('open', 'full', 'in_progress', 'completed')
  and exists (
    select 1
    from public.courses as course
    where course.id = course_offerings.course_id
  )
);

drop policy if exists course_sessions_select_visible
  on public.course_sessions;
create policy course_sessions_select_visible
on public.course_sessions
for select
to anon, authenticated
using (
  status in ('scheduled', 'completed')
  and exists (
    select 1
    from public.course_offerings as offering
    where offering.id = course_sessions.offering_id
  )
);

drop policy if exists enrollments_select_own on public.enrollments;
create policy enrollments_select_own
on public.enrollments
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists attendance_select_own on public.attendance;
create policy attendance_select_own
on public.attendance
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists lesson_progress_select_own on public.lesson_progress;
create policy lesson_progress_select_own
on public.lesson_progress
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists lesson_progress_insert_own on public.lesson_progress;
create policy lesson_progress_insert_own
on public.lesson_progress
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.lessons as lesson
    join public.course_modules as module
      on module.id = lesson.module_id
    where lesson.id = lesson_progress.lesson_id
      and (
        lesson.is_preview
        or private.can_access_course(module.course_id)
      )
  )
);

drop policy if exists lesson_progress_update_own on public.lesson_progress;
create policy lesson_progress_update_own
on public.lesson_progress
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.lessons as lesson
    join public.course_modules as module
      on module.id = lesson.module_id
    where lesson.id = lesson_progress.lesson_id
      and (
        lesson.is_preview
        or private.can_access_course(module.course_id)
      )
  )
);

drop policy if exists appointment_types_select_active
  on public.appointment_types;
create policy appointment_types_select_active
on public.appointment_types
for select
to anon, authenticated
using (is_active);

drop policy if exists availability_rules_select_public
  on public.availability_rules;
create policy availability_rules_select_public
on public.availability_rules
for select
to anon, authenticated
using (is_active and is_public);

drop policy if exists availability_exceptions_select_public
  on public.availability_exceptions;
create policy availability_exceptions_select_public
on public.availability_exceptions
for select
to anon, authenticated
using (is_public);

drop policy if exists appointments_select_own on public.appointments;
create policy appointments_select_own
on public.appointments
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists appointment_history_select_own
  on public.appointment_status_history;
create policy appointment_history_select_own
on public.appointment_status_history
for select
to authenticated
using (
  private.owns_appointment(appointment_id)
);

drop policy if exists access_plans_select_active on public.access_plans;
create policy access_plans_select_active
on public.access_plans
for select
to anon, authenticated
using (status = 'active');

drop policy if exists plan_entitlements_select_active_plan
  on public.plan_entitlements;
create policy plan_entitlements_select_active_plan
on public.plan_entitlements
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.access_plans as plan
    where plan.id = plan_entitlements.access_plan_id
  )
);

drop policy if exists product_categories_select_active
  on public.product_categories;
create policy product_categories_select_active
on public.product_categories
for select
to anon, authenticated
using (is_active);

drop policy if exists products_select_catalog on public.products;
create policy products_select_catalog
on public.products
for select
to anon, authenticated
using (status in ('active', 'out_of_stock'));

drop policy if exists product_variants_select_catalog
  on public.product_variants;
create policy product_variants_select_catalog
on public.product_variants
for select
to anon, authenticated
using (
  status in ('active', 'out_of_stock')
  and exists (
    select 1
    from public.products as product
    where product.id = product_variants.product_id
  )
);

drop policy if exists product_media_select_catalog on public.product_media;
create policy product_media_select_catalog
on public.product_media
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products as product
    where product.id = product_media.product_id
  )
);

drop policy if exists product_prices_select_current
  on public.product_prices;
create policy product_prices_select_current
on public.product_prices
for select
to anon, authenticated
using (
  is_active
  and (valid_from is null or valid_from <= statement_timestamp())
  and (valid_until is null or valid_until > statement_timestamp())
  and exists (
    select 1
    from public.product_variants as variant
    where variant.id = product_prices.product_variant_id
  )
);

drop policy if exists customer_addresses_select_own
  on public.customer_addresses;
create policy customer_addresses_select_own
on public.customer_addresses
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists customer_addresses_insert_own
  on public.customer_addresses;
create policy customer_addresses_insert_own
on public.customer_addresses
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists customer_addresses_update_own
  on public.customer_addresses;
create policy customer_addresses_update_own
on public.customer_addresses
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists customer_addresses_delete_own
  on public.customer_addresses;
create policy customer_addresses_delete_own
on public.customer_addresses
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists carts_select_own on public.carts;
create policy carts_select_own
on public.carts
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists carts_insert_own on public.carts;
create policy carts_insert_own
on public.carts
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and status = 'active'
);

drop policy if exists carts_update_own on public.carts;
create policy carts_update_own
on public.carts
for update
to authenticated
using (
  (select auth.uid()) = user_id
  and status in ('active', 'abandoned')
)
with check (
  (select auth.uid()) = user_id
  and status in ('active', 'abandoned')
);

drop policy if exists carts_delete_own on public.carts;
create policy carts_delete_own
on public.carts
for delete
to authenticated
using ((select auth.uid()) = user_id and status = 'active');

drop policy if exists cart_items_select_own on public.cart_items;
create policy cart_items_select_own
on public.cart_items
for select
to authenticated
using (private.owns_active_cart(cart_id));

drop policy if exists cart_items_insert_own on public.cart_items;
create policy cart_items_insert_own
on public.cart_items
for insert
to authenticated
with check (private.can_mutate_cart_item(cart_id, product_variant_id));

drop policy if exists cart_items_update_own on public.cart_items;
create policy cart_items_update_own
on public.cart_items
for update
to authenticated
using (private.owns_active_cart(cart_id))
with check (private.can_mutate_cart_item(cart_id, product_variant_id));

drop policy if exists cart_items_delete_own on public.cart_items;
create policy cart_items_delete_own
on public.cart_items
for delete
to authenticated
using (private.owns_active_cart(cart_id));

drop policy if exists orders_select_own on public.orders;
create policy orders_select_own
on public.orders
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists order_items_select_own on public.order_items;
create policy order_items_select_own
on public.order_items
for select
to authenticated
using (private.owns_order(order_id));

drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own
on public.subscriptions
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists entitlements_select_own on public.entitlements;
create policy entitlements_select_own
on public.entitlements
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists digital_deliveries_select_own
  on public.digital_deliveries;
create policy digital_deliveries_select_own
on public.digital_deliveries
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and revoked_at is null
  and available_from <= statement_timestamp()
  and (expires_at is null or expires_at > statement_timestamp())
);

drop policy if exists contact_requests_select_own
  on public.contact_requests;
create policy contact_requests_select_own
on public.contact_requests
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists contact_requests_insert_own
  on public.contact_requests;
create policy contact_requests_insert_own
on public.contact_requests
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and status = 'new'
  and assigned_to_staff_id is null
  and private.can_reference_contact_context(
    appointment_id,
    order_id,
    offering_id
  )
);

drop policy if exists newsletter_subscribers_select_own
  on public.newsletter_subscribers;
create policy newsletter_subscribers_select_own
on public.newsletter_subscribers
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists newsletter_topics_select_active
  on public.newsletter_topics;
create policy newsletter_topics_select_active
on public.newsletter_topics
for select
to anon, authenticated
using (is_active);

drop policy if exists newsletter_subscriber_topics_select_own
  on public.newsletter_subscriber_topics;
create policy newsletter_subscriber_topics_select_own
on public.newsletter_subscriber_topics
for select
to authenticated
using (private.owns_newsletter_subscriber(subscriber_id));

drop policy if exists consent_events_select_own on public.consent_events;
create policy consent_events_select_own
on public.consent_events
for select
to authenticated
using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Explicit Data API privileges (required for deterministic 2026+ behavior).
-- RLS is not a substitute for table privileges, and table privileges are not a
-- substitute for RLS; both layers are deliberately present.
-- ---------------------------------------------------------------------------

do $migration$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'account_roles',
    'media_assets',
    'content_authors',
    'content_categories',
    'content_tags',
    'content_entries',
    'content_revisions',
    'content_entry_categories',
    'content_entry_tags',
    'content_relations',
    'content_collections',
    'content_collection_items',
    'locations',
    'staff_members',
    'subjects',
    'courses',
    'course_staff',
    'course_modules',
    'lessons',
    'lesson_resources',
    'course_offerings',
    'course_sessions',
    'enrollments',
    'attendance',
    'lesson_progress',
    'appointment_types',
    'availability_rules',
    'availability_exceptions',
    'appointments',
    'appointment_status_history',
    'access_plans',
    'plan_entitlements',
    'product_categories',
    'products',
    'product_variants',
    'product_media',
    'product_prices',
    'inventory_items',
    'customer_addresses',
    'carts',
    'cart_items',
    'orders',
    'order_items',
    'inventory_movements',
    'subscriptions',
    'entitlements',
    'digital_deliveries',
    'contact_requests',
    'newsletter_subscribers',
    'newsletter_topics',
    'newsletter_subscriber_topics',
    'consent_events'
  ]
  loop
    execute format(
      'revoke all privileges on table public.%I from anon, authenticated',
      table_name
    );
    execute format(
      'grant all privileges on table public.%I to service_role',
      table_name
    );
  end loop;
end
$migration$;

grant usage on schema public to anon, authenticated, service_role;

grant select on table
  public.content_categories,
  public.content_tags,
  public.content_entry_categories,
  public.content_entry_tags,
  public.content_relations,
  public.content_collections,
  public.content_collection_items,
  public.locations,
  public.subjects,
  public.course_staff,
  public.course_modules,
  public.lessons,
  public.lesson_resources,
  public.course_offerings,
  public.course_sessions,
  public.appointment_types,
  public.availability_rules,
  public.availability_exceptions,
  public.access_plans,
  public.plan_entitlements,
  public.product_categories,
  public.product_variants,
  public.product_media,
  public.newsletter_topics
to anon;

-- Catalog columns intentionally omit identity UUIDs, authoring UUIDs,
-- provider references, checksums, and draft change summaries.
grant select (
  id, storage_bucket, storage_path, kind, access_level, status, title,
  default_alt_text, caption, mime_type, byte_size, width, height,
  duration_seconds, metadata, created_at, updated_at
) on table public.media_assets to anon, authenticated;

grant select (
  id, display_name, slug, bio, avatar_media_id, status, created_at, updated_at
) on table public.content_authors to anon, authenticated;

grant select (
  id, kind, slug, title, excerpt, status, visibility, author_id,
  cover_media_id, published_revision_id, scheduled_at, published_at,
  seo_title, seo_description, metadata, created_at, updated_at
) on table public.content_entries to anon, authenticated;

grant select (
  id, content_entry_id, revision_no, body, created_at
) on table public.content_revisions to anon, authenticated;

grant select (
  id, display_name, slug, title, bio, avatar_media_id, timezone,
  is_bookable, is_public, is_active, created_at, updated_at
) on table public.staff_members to anon, authenticated;

grant select (
  id, subject_id, slug, title, short_description, description, status,
  visibility, delivery_mode, cover_media_id, estimated_minutes, metadata,
  created_at, updated_at
) on table public.courses to anon, authenticated;

grant select (
  id, category_id, course_id, access_plan_id, cover_media_id, slug, title,
  short_description, description, product_type, status, requires_shipping,
  tracks_inventory, tax_code, metadata, created_at, updated_at
) on table public.products to anon, authenticated;

grant select (
  id, product_variant_id, currency, amount_minor, compare_at_amount_minor,
  billing_interval, is_active, valid_from, valid_until, created_at, updated_at
) on table public.product_prices to anon, authenticated;

grant select on table
  public.profiles,
  public.account_roles,
  public.content_categories,
  public.content_tags,
  public.content_entry_categories,
  public.content_entry_tags,
  public.content_relations,
  public.content_collections,
  public.content_collection_items,
  public.locations,
  public.subjects,
  public.course_staff,
  public.course_modules,
  public.lessons,
  public.lesson_resources,
  public.course_offerings,
  public.course_sessions,
  public.appointment_types,
  public.availability_rules,
  public.availability_exceptions,
  public.access_plans,
  public.plan_entitlements,
  public.product_categories,
  public.product_variants,
  public.product_media,
  public.inventory_items,
  public.cart_items,
  public.order_items,
  public.newsletter_topics,
  public.newsletter_subscriber_topics
to authenticated;

grant select (
  id, offering_id, status, source, enrolled_at, completed_at,
  created_at, updated_at
) on table public.enrollments to authenticated;

grant select (
  id, course_session_id, enrollment_id, status, recorded_at, notes,
  created_at, updated_at
) on table public.attendance to authenticated;

grant select (
  id, lesson_id, status, progress_percent, last_position_seconds,
  started_at, completed_at, created_at, updated_at
) on table public.lesson_progress to authenticated;

grant select (
  id, public_id, appointment_type_id, staff_member_id, location_id,
  starts_at, ends_at, timezone, status, contact_name, contact_email,
  contact_phone, customer_notes, source, confirmed_at, cancelled_at,
  created_at, updated_at
) on table public.appointments to authenticated;

grant select (
  id, appointment_id, from_status, to_status, reason, created_at
) on table public.appointment_status_history to authenticated;

grant select (
  id, label, recipient_name, phone, address_line_1, address_line_2, city,
  region, postal_code, country_code, is_default_billing,
  is_default_shipping, created_at, updated_at
) on table public.customer_addresses to authenticated;

grant select (
  id, public_id, status, currency, expires_at, created_at, updated_at
) on table public.carts to authenticated;

grant select (
  id, public_id, order_number, status, payment_status, fulfillment_status,
  currency, subtotal_minor, discount_minor, shipping_minor, tax_minor,
  total_minor, customer_name, customer_email, customer_phone,
  billing_address, shipping_address, customer_notes, placed_at, paid_at,
  cancelled_at, created_at, updated_at
) on table public.orders to authenticated;

grant select (
  id, product_variant_id, order_item_id, quantity_delta, reason,
  reference, created_at
) on table public.inventory_movements to authenticated;

grant select (
  id, public_id, access_plan_id, status, current_period_starts_at,
  current_period_ends_at, trial_ends_at, cancel_at_period_end,
  cancelled_at, ended_at, created_at, updated_at
) on table public.subscriptions to authenticated;

grant select (
  id, resource_type, resource_id, access_level, source_type, source_id,
  valid_from, valid_until, revoked_at, metadata, created_at, updated_at
) on table public.entitlements to authenticated;

grant select (
  id, order_item_id, media_asset_id, available_from, expires_at,
  max_downloads, download_count, revoked_at, created_at, updated_at
) on table public.digital_deliveries to authenticated;

grant select (
  id, public_id, appointment_id, order_id, offering_id, assigned_to_staff_id,
  name, email, phone, topic, message, preferred_channel, status,
  consent_to_contact, source, created_at, updated_at
) on table public.contact_requests to authenticated;

grant select (
  id, email, normalized_email, status, source, confirmed_at,
  unsubscribed_at, created_at, updated_at
) on table public.newsletter_subscribers to authenticated;

grant select (
  id, subject_email, purpose, action, policy_version, source,
  occurred_at, metadata, created_at
) on table public.consent_events to authenticated;

-- Existing account pages depend on profile upsert.
grant insert, update on table public.profiles to authenticated;

-- Safe end-user mutations.
grant insert, update on table public.lesson_progress to authenticated;
grant insert, update, delete on table public.customer_addresses to authenticated;
grant insert, delete on table public.carts, public.cart_items to authenticated;
grant update (status, expires_at) on table public.carts to authenticated;
grant update (quantity) on table public.cart_items to authenticated;
grant insert on table public.contact_requests to authenticated;

-- Admin-authenticated catalog/editorial operations. Transactional commerce,
-- entitlements, subscriptions, consent, and orders remain server-only writes.
grant insert, update, delete on table
  public.media_assets,
  public.content_authors,
  public.content_categories,
  public.content_tags,
  public.content_entries,
  public.content_entry_categories,
  public.content_entry_tags,
  public.content_relations,
  public.content_collections,
  public.content_collection_items,
  public.locations,
  public.staff_members,
  public.subjects,
  public.courses,
  public.course_staff,
  public.course_modules,
  public.lessons,
  public.lesson_resources,
  public.course_offerings,
  public.course_sessions,
  public.enrollments,
  public.attendance,
  public.appointment_types,
  public.availability_rules,
  public.availability_exceptions,
  public.appointments,
  public.access_plans,
  public.plan_entitlements,
  public.product_categories,
  public.products,
  public.product_variants,
  public.product_media,
  public.product_prices,
  public.inventory_items,
  public.newsletter_topics,
  public.newsletter_subscriber_topics
to authenticated;

-- Append-only operational records: admins may create them but cannot rewrite
-- history through the authenticated Data API.
grant insert on table
  public.content_revisions,
  public.inventory_movements
to authenticated;

grant update on table
  public.contact_requests,
  public.newsletter_subscribers
to authenticated;
grant insert on table public.newsletter_subscribers to authenticated;

-- Identity sequences are usable only where a table grant and RLS also permit
-- the insert. Anonymous forms are routed through trusted server endpoints.
revoke all on all sequences in schema public from anon, authenticated;
grant usage, select on sequence
  public.media_assets_id_seq,
  public.content_authors_id_seq,
  public.content_categories_id_seq,
  public.content_tags_id_seq,
  public.content_entries_id_seq,
  public.content_revisions_id_seq,
  public.content_collections_id_seq,
  public.locations_id_seq,
  public.staff_members_id_seq,
  public.subjects_id_seq,
  public.courses_id_seq,
  public.course_modules_id_seq,
  public.lessons_id_seq,
  public.lesson_resources_id_seq,
  public.course_offerings_id_seq,
  public.course_sessions_id_seq,
  public.enrollments_id_seq,
  public.attendance_id_seq,
  public.lesson_progress_id_seq,
  public.appointment_types_id_seq,
  public.availability_rules_id_seq,
  public.availability_exceptions_id_seq,
  public.appointments_id_seq,
  public.access_plans_id_seq,
  public.plan_entitlements_id_seq,
  public.product_categories_id_seq,
  public.products_id_seq,
  public.product_variants_id_seq,
  public.product_prices_id_seq,
  public.inventory_items_id_seq,
  public.customer_addresses_id_seq,
  public.carts_id_seq,
  public.cart_items_id_seq,
  public.inventory_movements_id_seq,
  public.contact_requests_id_seq,
  public.newsletter_subscribers_id_seq,
  public.newsletter_topics_id_seq
to authenticated;
grant usage, select on all sequences in schema public to service_role;

revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all sequences in schema private from public, anon, authenticated;
grant all privileges on all tables in schema private to service_role;
grant usage, select on all sequences in schema private to service_role;

-- ---------------------------------------------------------------------------
-- Storage. Public marketing assets may be downloaded by anyone. Course and
-- purchased files remain private and are authorized against application data.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('public-media', 'public-media', true),
  ('course-media', 'course-media', false),
  ('digital-deliveries', 'digital-deliveries', false)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public;

drop policy if exists smartmed_public_media_read on storage.objects;

drop policy if exists smartmed_admin_public_media_read on storage.objects;
create policy smartmed_admin_public_media_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'public-media'
  and (select private.is_admin())
);

drop policy if exists smartmed_private_media_read on storage.objects;
create policy smartmed_private_media_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'course-media'
  and private.can_read_storage_object(bucket_id, name)
);

drop policy if exists smartmed_admin_media_insert on storage.objects;
create policy smartmed_admin_media_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('public-media', 'course-media')
  and (select private.is_admin())
);

drop policy if exists smartmed_admin_media_update on storage.objects;
create policy smartmed_admin_media_update
on storage.objects
for update
to authenticated
using (
  bucket_id in ('public-media', 'course-media')
  and (select private.is_admin())
)
with check (
  bucket_id in ('public-media', 'course-media')
  and (select private.is_admin())
);

drop policy if exists smartmed_admin_media_delete on storage.objects;
create policy smartmed_admin_media_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('public-media', 'course-media')
  and (select private.is_admin())
);

revoke select on table storage.objects from anon;
grant select on table storage.objects to authenticated;
grant insert, update, delete on table storage.objects to authenticated;

comment on schema private is
  'Internal SmartMed data and policy helpers; never expose through the Data API.';
comment on table public.account_roles is
  'Operational authorization only. Paid access belongs in entitlements.';
comment on column public.account_roles.role is
  'Legacy premium value is compatibility-only; admin is the only elevated operational role.';
comment on table public.content_revisions is
  'Immutable CMS revisions; only the published_revision_id is publicly readable.';
comment on table public.entitlements is
  'Time-bounded access grants derived from orders, subscriptions, promotions, or manual actions.';
comment on table public.appointments is
  'Concrete booking instants. Anonymous creation is server-mediated for validation and abuse controls.';
comment on table public.orders is
  'Customer and address snapshots are retained for order history; payment-provider data is private.';
comment on table private.payment_records is
  'Provider-neutral payment references and amounts only; never store cardholder or raw card data.';
comment on table private.webhook_events is
  'Idempotent webhook inbox keyed by provider event identifier.';
comment on table private.audit_log is
  'Append-only application audit trail for trusted server and administrative actions.';

-- Remove the pre-capability helper if this migration is replayed over an
-- earlier development application of the same file.
drop function if exists private.has_active_entitlement(text, bigint);

commit;
