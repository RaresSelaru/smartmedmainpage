-- SmartMed secure administrative control plane and editorial CMS.
--
-- This migration is deliberately additive. Existing migration history and
-- imported CMS rows are preserved. Browser callers receive read-only table
-- grants and use narrowly scoped RPCs for every CMS mutation.

begin;

-- A disabled News channel must not already be live when the durable channel
-- gate is introduced.
do $migration$
begin
  if exists (
    select 1
    from public.content_entries
    where kind = 'news'
      and status = 'published'
  ) then
    raise exception
      'Cannot install the CMS channel gate while published News entries exist'
      using errcode = '23514';
  end if;
end
$migration$;

-- ---------------------------------------------------------------------------
-- Private policy/configuration state.
-- ---------------------------------------------------------------------------

create table private.content_channels (
  content_kind text primary key,
  public_enabled boolean not null default false,
  public_path text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint content_channels_kind_check
    check (content_kind in ('article', 'news')),
  constraint content_channels_path_check
    check (
      (public_enabled and public_path ~ '^/[a-z0-9]+(?:-[a-z0-9]+)*(?:/[a-z0-9]+(?:-[a-z0-9]+)*)*$')
      or (not public_enabled and public_path is null)
    )
);

insert into private.content_channels (
  content_kind,
  public_enabled,
  public_path
)
values
  ('article', true, '/blog'),
  ('news', false, null)
on conflict (content_kind) do update
set
  public_enabled = excluded.public_enabled,
  public_path = excluded.public_path,
  updated_at = statement_timestamp();

create table private.admin_security_settings (
  singleton boolean primary key default true
    constraint admin_security_settings_singleton_check check (singleton),
  require_mfa boolean not null default true,
  updated_at timestamptz not null default statement_timestamp(),
  updated_by_reference text
);

insert into private.admin_security_settings (singleton, require_mfa)
values (true, true)
on conflict (singleton) do nothing;

create table private.content_slug_claims (
  slug text primary key
    constraint content_slug_claims_slug_format check (
      slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*(?:/[a-z0-9]+(?:-[a-z0-9]+)*)*$'
    ),
  content_entry_id bigint not null
    references public.content_entries(id) on delete cascade,
  is_live boolean not null default false,
  is_working boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint content_slug_claims_has_purpose
    check (is_live or is_working)
);

create unique index content_slug_claims_one_live_per_entry_idx
  on private.content_slug_claims (content_entry_id)
  where is_live;

create unique index content_slug_claims_one_working_per_entry_idx
  on private.content_slug_claims (content_entry_id)
  where is_working;

alter table private.content_channels enable row level security;
alter table private.admin_security_settings enable row level security;
alter table private.content_slug_claims enable row level security;

revoke all on table
  private.content_channels,
  private.admin_security_settings,
  private.content_slug_claims
from public, anon, authenticated;

grant all privileges on table
  private.content_channels,
  private.admin_security_settings,
  private.content_slug_claims
to service_role;

-- ---------------------------------------------------------------------------
-- Versioned revisions, immutable editorial snapshots, and media references.
-- ---------------------------------------------------------------------------

alter table public.content_revisions
  add column schema_version smallint;

update public.content_revisions
set schema_version = 0
where schema_version is null;

alter table public.content_revisions
  alter column schema_version set default 1,
  alter column schema_version set not null;

alter table public.content_revisions
  add column editorial_snapshot jsonb;

update public.content_revisions as revision
set editorial_snapshot = jsonb_build_object(
  'version', 1,
  'title', entry.title,
  'slug', entry.slug,
  'excerpt', entry.excerpt,
  'authorId', entry.author_id,
  'coverMediaId', entry.cover_media_id,
  'categoryIds', coalesce(
    (
      select jsonb_agg(link.category_id order by link.category_id)
      from public.content_entry_categories as link
      where link.content_entry_id = entry.id
    ),
    '[]'::jsonb
  ),
  'tagIds', coalesce(
    (
      select jsonb_agg(link.tag_id order by link.tag_id)
      from public.content_entry_tags as link
      where link.content_entry_id = entry.id
    ),
    '[]'::jsonb
  ),
  'seoTitle', entry.seo_title,
  'seoDescription', entry.seo_description,
  'publishedAt', entry.published_at,
  'reviewer', entry.metadata ->> 'reviewer',
  'reviewDate', entry.metadata ->> 'reviewDate',
  'disclaimer', entry.metadata ->> 'disclaimer',
  'correctionNote', entry.metadata ->> 'correctionNote',
  'relatedEntryIds', coalesce(
    (
      select jsonb_agg(
        relation.related_content_entry_id
        order by relation.sort_order, relation.related_content_entry_id
      )
      from public.content_relations as relation
      where relation.content_entry_id = entry.id
        and relation.relation_type = 'related'
    ),
    '[]'::jsonb
  )
)
from public.content_entries as entry
where entry.id = revision.content_entry_id
  and revision.editorial_snapshot is null;

alter table public.content_revisions
  alter column editorial_snapshot set default
    '{"version":1,"categoryIds":[],"tagIds":[],"relatedEntryIds":[]}'::jsonb,
  alter column editorial_snapshot set not null;

alter table public.content_revisions
  drop constraint if exists content_revisions_body_check;

alter table public.content_revisions
  add constraint content_revisions_schema_version_check
    check (schema_version in (0, 1)),
  add constraint content_revisions_body_shape_check
    check (
      (
        schema_version = 0
        and jsonb_typeof(body) = 'array'
      )
      or (
        schema_version = 1
        and jsonb_typeof(body) = 'object'
        and body ->> 'version' = '1'
        and jsonb_typeof(body -> 'blocks') = 'array'
      )
    ),
  add constraint content_revisions_snapshot_shape_check
    check (
      jsonb_typeof(editorial_snapshot) = 'object'
      and editorial_snapshot ->> 'version' = '1'
    );

alter table public.content_entries
  add column working_revision_id bigint;

update public.content_entries as entry
set working_revision_id = (
  select revision.id
  from public.content_revisions as revision
  where revision.content_entry_id = entry.id
  order by revision.revision_no desc, revision.id desc
  limit 1
)
where entry.working_revision_id is null;

alter table public.content_entries
  add constraint content_entries_working_revision_fk
  foreign key (working_revision_id)
  references public.content_revisions(id)
  on delete set null;

create index content_entries_working_revision_idx
  on public.content_entries (working_revision_id)
  where working_revision_id is not null;

create index content_revisions_entry_created_idx
  on public.content_revisions (content_entry_id, revision_no desc, id desc);

create table public.content_revision_media (
  revision_id bigint not null
    references public.content_revisions(id) on delete cascade,
  media_asset_id bigint not null
    references public.media_assets(id) on delete restrict,
  usage text not null default 'inline'
    constraint content_revision_media_usage_check
      check (usage in ('cover', 'inline')),
  sort_order integer not null default 0
    constraint content_revision_media_sort_order_check check (sort_order >= 0),
  created_at timestamptz not null default statement_timestamp(),
  primary key (revision_id, media_asset_id, usage)
);

create index content_revision_media_asset_idx
  on public.content_revision_media (media_asset_id, revision_id);

alter table public.content_revision_media enable row level security;

-- Backfill cover references where the original projection already used a
-- database-managed media asset. Legacy filesystem cover paths remain in
-- metadata and are intentionally not fabricated as media rows.
insert into public.content_revision_media (
  revision_id,
  media_asset_id,
  usage,
  sort_order
)
select
  revision.id,
  entry.cover_media_id,
  'cover',
  0
from public.content_revisions as revision
join public.content_entries as entry
  on entry.id = revision.content_entry_id
where entry.cover_media_id is not null
on conflict do nothing;

-- Every current slug is reserved. Published projections are live claims;
-- working pointers reserve their pending slug as well.
insert into private.content_slug_claims (
  slug,
  content_entry_id,
  is_live,
  is_working
)
select
  entry.slug,
  entry.id,
  entry.published_at is not null,
  entry.working_revision_id is not null or entry.published_at is null
from public.content_entries as entry
on conflict (slug) do update
set
  content_entry_id = excluded.content_entry_id,
  is_live = excluded.is_live,
  is_working = excluded.is_working,
  updated_at = statement_timestamp();

-- ---------------------------------------------------------------------------
-- Audit context. Bodies, credentials, MFA secrets, and signed URLs are never
-- written into these columns.
-- ---------------------------------------------------------------------------

alter table private.audit_log
  add column correlation_id text,
  add column operator_reference text,
  add column reason text,
  add column context jsonb not null default '{}'::jsonb;

alter table private.audit_log
  add constraint audit_log_context_object_check
    check (jsonb_typeof(context) = 'object');

create index audit_log_correlation_idx
  on private.audit_log (correlation_id, created_at desc)
  where correlation_id is not null;

-- ---------------------------------------------------------------------------
-- Authorization and channel helpers.
-- ---------------------------------------------------------------------------

create or replace function private.has_confirmed_admin_identity()
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
      from auth.users as auth_user
      join public.profiles as profile
        on profile.id = auth_user.id
      join public.account_roles as account_role
        on account_role.user_id = auth_user.id
      where auth_user.id = (select auth.uid())
        and auth_user.email_confirmed_at is not null
        and coalesce(
          (to_jsonb(auth_user) ->> 'is_anonymous')::boolean,
          false
        ) = false
        and account_role.role = 'admin'::public.smartmed_role
    )
$function$;

create or replace function private.admin_mfa_satisfied()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    not coalesce(
      (
        select settings.require_mfa
        from private.admin_security_settings as settings
        where settings.singleton
      ),
      true
    )
    or coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
$function$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    private.has_confirmed_admin_identity()
    and private.admin_mfa_satisfied()
$function$;

create or replace function private.has_cms_capability(p_capability text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    p_capability = any (
      array[
        'admin.access',
        'content.read',
        'content.create',
        'content.update',
        'content.preview',
        'content.publish',
        'content.unpublish',
        'content.archive',
        'content.media.manage'
      ]::text[]
    )
    and private.is_admin()
$function$;

create or replace function private.require_cms_capability(p_capability text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if not private.has_cms_capability(p_capability) then
    raise exception 'CMS access denied'
      using errcode = '42501';
  end if;
end
$function$;

create or replace function private.is_service_request()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce((select auth.jwt() ->> 'role'), '') = 'service_role'
$function$;

create or replace function private.require_service_request()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if not private.is_service_request() then
    raise exception 'Service-role request required'
      using errcode = '42501';
  end if;
end
$function$;

create or replace function private.content_kind_is_public(p_kind text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select case
    when p_kind in ('article', 'news') then coalesce(
      (
        select channel.public_enabled
        from private.content_channels as channel
        where channel.content_kind = p_kind
      ),
      false
    )
    else true
  end
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
          and entry.published_revision_id is not null
          and entry.published_at <= statement_timestamp()
          and private.content_kind_is_public(entry.kind)
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

revoke all on function private.has_confirmed_admin_identity()
  from public, anon, authenticated;
revoke all on function private.admin_mfa_satisfied()
  from public, anon, authenticated;
revoke all on function private.has_cms_capability(text)
  from public, anon, authenticated;
revoke all on function private.require_cms_capability(text)
  from public, anon, authenticated;
revoke all on function private.is_service_request()
  from public, anon, authenticated;
revoke all on function private.require_service_request()
  from public, anon, authenticated;
revoke all on function private.content_kind_is_public(text)
  from public, anon, authenticated;

-- Existing policies call these two helpers directly.
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated, service_role;
revoke all on function private.can_read_content(bigint) from public, anon;
grant execute on function private.can_read_content(bigint)
  to authenticated, service_role;

-- Publishing and both revision pointers must reference the owning entry. Kind
-- is immutable after first publication, and the disabled News channel is
-- independently enforced even for privileged direct SQL.
create or replace function private.validate_content_revision_pointers()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if tg_op = 'UPDATE'
    and old.published_at is not null
    and new.kind is distinct from old.kind
  then
    raise exception 'Content kind is immutable after first publication'
      using errcode = '23514';
  end if;

  if new.published_revision_id is not null
    and not exists (
      select 1
      from public.content_revisions as revision
      where revision.id = new.published_revision_id
        and revision.content_entry_id = new.id
    )
  then
    raise exception
      'published_revision_id must belong to the content entry'
      using errcode = '23514';
  end if;

  if new.working_revision_id is not null
    and not exists (
      select 1
      from public.content_revisions as revision
      where revision.id = new.working_revision_id
        and revision.content_entry_id = new.id
    )
  then
    raise exception
      'working_revision_id must belong to the content entry'
      using errcode = '23514';
  end if;

  if new.status = 'published'
    and not private.content_kind_is_public(new.kind)
  then
    raise exception 'Publication is disabled for this content channel'
      using errcode = '23514';
  end if;

  return new;
end
$function$;

revoke all on function private.validate_content_revision_pointers()
  from public, anon, authenticated;

drop trigger if exists validate_content_published_revision
  on public.content_entries;
drop trigger if exists validate_content_revision_pointers
  on public.content_entries;
create trigger validate_content_revision_pointers
before insert or update of
  kind,
  status,
  published_revision_id,
  working_revision_id
on public.content_entries
for each row execute function private.validate_content_revision_pointers();

-- ---------------------------------------------------------------------------
-- CMS input, slug, media, and audit helpers. These are private implementation
-- details; public RPCs below are the only callable mutation surface.
-- ---------------------------------------------------------------------------

create or replace function private.validate_cms_snapshot(p_snapshot jsonb)
returns void
language plpgsql
immutable
set search_path = ''
as $function$
declare
  array_key text;
  annotation_key text;
begin
  if p_snapshot is null
    or jsonb_typeof(p_snapshot) <> 'object'
    or p_snapshot ->> 'version' <> '1'
    or not (
      p_snapshot ?& array[
        'version',
        'title',
        'slug',
        'excerpt',
        'authorId',
        'coverMediaId',
        'categoryIds',
        'tagIds',
        'seoTitle',
        'seoDescription',
        'publishedAt',
        'reviewer',
        'reviewDate',
        'disclaimer',
        'correctionNote',
        'relatedEntryIds'
      ]
    )
    or p_snapshot - array[
      'version',
      'title',
      'slug',
      'excerpt',
      'authorId',
      'coverMediaId',
      'categoryIds',
      'tagIds',
      'seoTitle',
      'seoDescription',
      'publishedAt',
      'reviewer',
      'reviewDate',
      'disclaimer',
      'correctionNote',
      'relatedEntryIds'
    ] <> '{}'::jsonb
  then
    raise exception 'A version 1 editorial snapshot is required'
      using errcode = '22023';
  end if;

  if jsonb_typeof(p_snapshot -> 'title') <> 'string'
    or nullif(btrim(p_snapshot ->> 'title'), '') is null
    or char_length(btrim(p_snapshot ->> 'title')) > 160
  then
    raise exception 'Snapshot title must contain 1 to 160 characters'
      using errcode = '22023';
  end if;

  if jsonb_typeof(p_snapshot -> 'slug') <> 'string'
    or nullif(btrim(p_snapshot ->> 'slug'), '') is null
    or char_length(p_snapshot ->> 'slug') > 160
    or (p_snapshot ->> 'slug')
      !~ '^[a-z0-9]+(?:-[a-z0-9]+)*(?:/[a-z0-9]+(?:-[a-z0-9]+)*)*$'
  then
    raise exception 'Snapshot slug is invalid'
      using errcode = '22023';
  end if;

  if jsonb_typeof(p_snapshot -> 'excerpt') <> 'string'
    or char_length(btrim(p_snapshot ->> 'excerpt')) not between 1 and 320
  then
    raise exception 'Snapshot excerpt must contain 1 to 320 characters'
      using errcode = '22023';
  end if;

  if p_snapshot -> 'seoTitle' <> 'null'::jsonb
    and (
      jsonb_typeof(p_snapshot -> 'seoTitle') <> 'string'
      or char_length(btrim(p_snapshot ->> 'seoTitle')) not between 1 and 70
    )
  then
    raise exception 'SEO title exceeds 70 characters'
      using errcode = '22023';
  end if;

  if p_snapshot -> 'seoDescription' <> 'null'::jsonb
    and (
      jsonb_typeof(p_snapshot -> 'seoDescription') <> 'string'
      or char_length(btrim(p_snapshot ->> 'seoDescription'))
        not between 1 and 180
    )
  then
    raise exception 'SEO description exceeds 180 characters'
      using errcode = '22023';
  end if;

  foreach annotation_key in array array[
    'reviewer',
    'reviewDate',
    'disclaimer',
    'correctionNote'
  ]
  loop
    if p_snapshot -> annotation_key <> 'null'::jsonb
      and (
        jsonb_typeof(p_snapshot -> annotation_key) <> 'string'
        or char_length(btrim(p_snapshot ->> annotation_key))
          not between 1 and 500
      )
    then
      raise exception 'Editorial annotation % exceeds 500 characters',
        annotation_key
        using errcode = '22023';
    end if;
  end loop;

  foreach array_key in array array[
    'categoryIds',
    'tagIds',
    'relatedEntryIds'
  ]
  loop
    if jsonb_typeof(coalesce(p_snapshot -> array_key, '[]'::jsonb))
      <> 'array'
    then
      raise exception 'Snapshot field % must be an array', array_key
        using errcode = '22023';
    end if;

    if jsonb_array_length(coalesce(p_snapshot -> array_key, '[]'::jsonb))
      > 100
    then
      raise exception 'Snapshot field % exceeds 100 items', array_key
        using errcode = '22023';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(
        coalesce(p_snapshot -> array_key, '[]'::jsonb)
      ) as item(value)
      where jsonb_typeof(item.value) <> 'number'
        or item.value::text !~ '^[1-9][0-9]*$'
    ) then
      raise exception 'Snapshot field % contains an invalid identifier',
        array_key
        using errcode = '22023';
    end if;

    if jsonb_array_length(p_snapshot -> array_key) <> (
      select count(distinct item.value)
      from jsonb_array_elements(p_snapshot -> array_key) as item(value)
    ) then
      raise exception 'Snapshot field % contains duplicate identifiers',
        array_key
        using errcode = '22023';
    end if;
  end loop;

  if p_snapshot ? 'authorId'
    and p_snapshot -> 'authorId' <> 'null'::jsonb
    and (
      jsonb_typeof(p_snapshot -> 'authorId') <> 'number'
      or (p_snapshot -> 'authorId')::text !~ '^[1-9][0-9]*$'
    )
  then
    raise exception 'Snapshot authorId is invalid'
      using errcode = '22023';
  end if;

  if p_snapshot ? 'coverMediaId'
    and p_snapshot -> 'coverMediaId' <> 'null'::jsonb
    and (
      jsonb_typeof(p_snapshot -> 'coverMediaId') <> 'number'
      or (p_snapshot -> 'coverMediaId')::text !~ '^[1-9][0-9]*$'
    )
  then
    raise exception 'Snapshot coverMediaId is invalid'
      using errcode = '22023';
  end if;

  begin
    if p_snapshot -> 'publishedAt' <> 'null'::jsonb then
      if jsonb_typeof(p_snapshot -> 'publishedAt') <> 'string'
        or char_length(p_snapshot ->> 'publishedAt') > 64
      then
        raise exception 'Snapshot publishedAt is invalid'
          using errcode = '22023';
      end if;
      perform (p_snapshot ->> 'publishedAt')::timestamptz;
    end if;

    if p_snapshot -> 'reviewDate' <> 'null'::jsonb then
      if jsonb_typeof(p_snapshot -> 'reviewDate') <> 'string'
        or char_length(p_snapshot ->> 'reviewDate') > 64
      then
        raise exception 'Snapshot reviewDate is invalid'
          using errcode = '22023';
      end if;
      perform (p_snapshot ->> 'reviewDate')::timestamptz;
    end if;
  exception
    when invalid_datetime_format or datetime_field_overflow then
      raise exception 'Snapshot date is invalid'
        using errcode = '22023';
  end;
end
$function$;

create or replace function private.cms_href_is_safe(
  p_href text,
  p_allow_internal boolean default true
)
returns boolean
language sql
immutable
set search_path = ''
as $function$
  select
    p_href is not null
    and char_length(p_href) between 1 and 2048
    and p_href !~ '[[:space:][:cntrl:]]'
    and position(E'\\' in p_href) = 0
    and (
      (
        p_allow_internal
        and left(p_href, 1) = '/'
        and left(p_href, 2) <> '//'
      )
      or (
        p_href ~
          '^https://[^/?#@:[:space:]]+(?::[0-9]{1,5})?(?:[/?#][^[:space:][:cntrl:]]*)?$'
        and case
          when substring(
            p_href
            from '^https://[^/?#@:[:space:]]+:([0-9]{1,5})(?:[/?#]|$)'
          ) is null
            then true
          else substring(
            p_href
            from '^https://[^/?#@:[:space:]]+:([0-9]{1,5})(?:[/?#]|$)'
          )::integer between 0 and 65535
        end
      )
    )
$function$;

create or replace function private.validate_cms_inline(
  p_content jsonb,
  p_maximum_characters integer
)
returns integer
language plpgsql
immutable
set search_path = ''
as $function$
declare
  run jsonb;
  text_length integer := 0;
  href text;
begin
  if jsonb_typeof(p_content) <> 'array'
    or jsonb_array_length(p_content) < 1
    or jsonb_array_length(p_content) > p_maximum_characters
  then
    raise exception 'Inline content has an invalid shape'
      using errcode = '22023';
  end if;

  for run in
    select item.value
    from jsonb_array_elements(p_content) as item(value)
  loop
    if jsonb_typeof(run) <> 'object'
      or coalesce(run ->> 'type', '') not in ('text', 'link')
      or nullif(run ->> 'text', '') is null
      or char_length(run ->> 'text') > p_maximum_characters
      or (run ? 'bold' and run -> 'bold' <> 'true'::jsonb)
      or (run ? 'italic' and run -> 'italic' <> 'true'::jsonb)
    then
      raise exception 'Inline content contains an invalid text run'
        using errcode = '22023';
    end if;

    if run ->> 'type' = 'text'
      and run - array['type', 'text', 'bold', 'italic'] <> '{}'::jsonb
    then
      raise exception 'Text run contains unsupported properties'
        using errcode = '22023';
    end if;

    if run ->> 'type' = 'link' then
      if run - array['type', 'href', 'text', 'bold', 'italic']
        <> '{}'::jsonb
      then
        raise exception 'Link run contains unsupported properties'
          using errcode = '22023';
      end if;

      href := run ->> 'href';
      if not private.cms_href_is_safe(href, true)
      then
        raise exception 'Link run contains an unsafe href'
          using errcode = '22023';
      end if;
    end if;

    text_length := text_length + char_length(run ->> 'text');
  end loop;

  if text_length > p_maximum_characters then
    raise exception 'Inline content exceeds its text limit'
      using errcode = '22023';
  end if;

  return text_length;
end
$function$;

create or replace function private.validate_cms_document(p_body jsonb)
returns void
language plpgsql
immutable
set search_path = ''
as $function$
declare
  block jsonb;
  item jsonb;
  block_id text;
  item_id text;
  annotation_key text;
  seen_ids text[] := array[]::text[];
  total_text_length integer := 0;
  href text;
begin
  if p_body is null
    or jsonb_typeof(p_body) <> 'object'
    or p_body ->> 'version' <> '1'
    or jsonb_typeof(p_body -> 'blocks') <> 'array'
    or p_body - array['version', 'blocks'] <> '{}'::jsonb
  then
    raise exception 'A version 1 content document is required'
      using errcode = '22023';
  end if;

  if octet_length(p_body::text) > 524288 then
    raise exception 'Content document exceeds 512 KiB'
      using errcode = '22023';
  end if;

  if jsonb_array_length(p_body -> 'blocks') > 300 then
    raise exception 'Content document exceeds 300 blocks'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_body -> 'blocks') as block(value)
    where jsonb_typeof(block.value) <> 'object'
      or coalesce(block.value ->> 'id', '')
        !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or coalesce(block.value ->> 'type', '') not in (
        'paragraph',
        'heading',
        'list',
        'blockquote',
        'image',
        'youtube',
        'callout',
        'references'
      )
  ) then
    raise exception 'Content document contains an invalid block'
      using errcode = '22023';
  end if;

  for block in
    select source.value
    from jsonb_array_elements(p_body -> 'blocks') as source(value)
  loop
    block_id := block ->> 'id';
    if block_id = any (seen_ids) then
      raise exception 'Content identifiers must be unique'
        using errcode = '22023';
    end if;
    seen_ids := array_append(seen_ids, block_id);

    case block ->> 'type'
      when 'paragraph' then
        if block - array['id', 'type', 'content'] <> '{}'::jsonb then
          raise exception 'Paragraph contains unsupported properties'
            using errcode = '22023';
        end if;
        total_text_length := total_text_length
          + private.validate_cms_inline(block -> 'content', 5000);

      when 'heading' then
        if block - array['id', 'type', 'level', 'content'] <> '{}'::jsonb
          or jsonb_typeof(block -> 'level') is distinct from 'number'
          or (block ->> 'level') not in ('2', '3')
        then
          raise exception 'Heading contains invalid properties'
            using errcode = '22023';
        end if;
        total_text_length := total_text_length
          + private.validate_cms_inline(block -> 'content', 200);

      when 'list' then
        if block - array['id', 'type', 'style', 'items'] <> '{}'::jsonb
          or coalesce(block ->> 'style', '')
            not in ('ordered', 'unordered')
          or jsonb_typeof(block -> 'items') is distinct from 'array'
          or jsonb_array_length(block -> 'items') not between 1 and 100
        then
          raise exception 'List block contains invalid properties'
            using errcode = '22023';
        end if;

        for item in
          select source.value
          from jsonb_array_elements(block -> 'items') as source(value)
        loop
          item_id := item ->> 'id';
          if jsonb_typeof(item) <> 'object'
            or item - array['id', 'content'] <> '{}'::jsonb
            or coalesce(item_id, '')
              !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
            or item_id = any (seen_ids)
          then
            raise exception 'List item is invalid or duplicated'
              using errcode = '22023';
          end if;
          seen_ids := array_append(seen_ids, item_id);
          total_text_length := total_text_length
            + private.validate_cms_inline(item -> 'content', 1000);
        end loop;

      when 'blockquote' then
        if block - array['id', 'type', 'content'] <> '{}'::jsonb then
          raise exception 'Blockquote contains unsupported properties'
            using errcode = '22023';
        end if;
        total_text_length := total_text_length
          + private.validate_cms_inline(block -> 'content', 5000);

      when 'image' then
        if block - array[
          'id',
          'type',
          'mediaId',
          'decorative',
          'alt',
          'caption',
          'credit',
          'source',
          'rights'
        ] <> '{}'::jsonb
          or jsonb_typeof(block -> 'mediaId') is distinct from 'number'
          or (block -> 'mediaId')::text !~ '^[1-9][0-9]*$'
          or jsonb_typeof(block -> 'decorative') is distinct from 'boolean'
          or jsonb_typeof(block -> 'alt') is distinct from 'string'
          or char_length(block ->> 'alt') > 500
          or (
            (block ->> 'decorative')::boolean
            and block ->> 'alt' <> ''
          )
          or (
            not (block ->> 'decorative')::boolean
            and nullif(btrim(block ->> 'alt'), '') is null
          )
        then
          raise exception 'Image block contains invalid properties'
            using errcode = '22023';
        end if;

        foreach annotation_key in array array[
          'caption',
          'credit',
          'rights'
        ]
        loop
          if block ? annotation_key
            and (
              jsonb_typeof(block -> annotation_key) <> 'string'
              or char_length(block ->> annotation_key) not between 1 and 500
            )
          then
            raise exception 'Image annotation % is invalid',
              annotation_key
              using errcode = '22023';
          end if;
          total_text_length := total_text_length
            + char_length(coalesce(block ->> annotation_key, ''));
        end loop;

        if block ? 'source'
          and (
            jsonb_typeof(block -> 'source') <> 'string'
            or not private.cms_href_is_safe(block ->> 'source', false)
          )
        then
          raise exception 'Image source must be a safe HTTPS URL'
            using errcode = '22023';
        end if;

        total_text_length := total_text_length
          + char_length(block ->> 'alt')
          + char_length(coalesce(block ->> 'source', ''));

      when 'youtube' then
        if block - array[
          'id',
          'type',
          'videoId',
          'title',
          'summary'
        ] <> '{}'::jsonb
          or coalesce(block ->> 'videoId', '')
            !~ '^[A-Za-z0-9_-]{11}$'
          or nullif(btrim(block ->> 'title'), '') is null
          or char_length(block ->> 'title') > 200
          or (
            block ? 'summary'
            and (
              jsonb_typeof(block -> 'summary') <> 'string'
              or char_length(block ->> 'summary') not between 1 and 500
            )
          )
        then
          raise exception 'YouTube block contains invalid properties'
            using errcode = '22023';
        end if;
        total_text_length := total_text_length
          + char_length(block ->> 'title')
          + char_length(coalesce(block ->> 'summary', ''));

      when 'callout' then
        if block - array[
          'id',
          'type',
          'variant',
          'title',
          'content'
        ] <> '{}'::jsonb
          or coalesce(block ->> 'variant', '')
            not in ('important', 'warning', 'medical-note')
          or (
            block ? 'title'
            and (
              jsonb_typeof(block -> 'title') <> 'string'
              or char_length(block ->> 'title') not between 1 and 200
            )
          )
        then
          raise exception 'Callout block contains invalid properties'
            using errcode = '22023';
        end if;
        total_text_length := total_text_length
          + char_length(coalesce(block ->> 'title', ''))
          + private.validate_cms_inline(block -> 'content', 5000);

      when 'references' then
        if block - array['id', 'type', 'title', 'items'] <> '{}'::jsonb
          or (
            block ? 'title'
            and (
              jsonb_typeof(block -> 'title') <> 'string'
              or char_length(block ->> 'title') not between 1 and 200
            )
          )
          or jsonb_typeof(block -> 'items') is distinct from 'array'
          or jsonb_array_length(block -> 'items') not between 1 and 100
        then
          raise exception 'References block contains invalid properties'
            using errcode = '22023';
        end if;

        total_text_length := total_text_length
          + char_length(coalesce(block ->> 'title', ''));

        for item in
          select source.value
          from jsonb_array_elements(block -> 'items') as source(value)
        loop
          item_id := item ->> 'id';
          href := item ->> 'url';
          if jsonb_typeof(item) <> 'object'
            or item - array['id', 'label', 'url', 'note'] <> '{}'::jsonb
            or coalesce(item_id, '')
              !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
            or item_id = any (seen_ids)
            or nullif(btrim(item ->> 'label'), '') is null
            or char_length(item ->> 'label') > 1000
            or (
              item ? 'note'
              and (
                jsonb_typeof(item -> 'note') <> 'string'
                or char_length(item ->> 'note') not between 1 and 500
              )
            )
            or (
              item ? 'url'
              and (
                jsonb_typeof(item -> 'url') <> 'string'
                or not private.cms_href_is_safe(href, true)
              )
            )
          then
            raise exception 'Reference item is invalid or duplicated'
              using errcode = '22023';
          end if;
          seen_ids := array_append(seen_ids, item_id);
          total_text_length := total_text_length
            + char_length(item ->> 'label')
            + char_length(coalesce(href, ''))
            + char_length(coalesce(item ->> 'note', ''));
        end loop;
    end case;
  end loop;

  if total_text_length > 100000 then
    raise exception 'Content document exceeds 100000 text characters'
      using errcode = '22023';
  end if;
end
$function$;

create or replace function private.cms_snapshot_ids(
  p_snapshot jsonb,
  p_key text
)
returns setof bigint
language sql
immutable
set search_path = ''
as $function$
  select distinct item.value::text::bigint
  from jsonb_array_elements(
    coalesce(p_snapshot -> p_key, '[]'::jsonb)
  ) as item(value)
$function$;

create or replace function private.claim_cms_working_slug(
  p_content_entry_id bigint,
  p_slug text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  existing_entry_id bigint;
begin
  select claim.content_entry_id
  into existing_entry_id
  from private.content_slug_claims as claim
  where claim.slug = p_slug
  for update;

  if existing_entry_id is not null
    and existing_entry_id <> p_content_entry_id
  then
    raise unique_violation using
      message = 'Content slug is already reserved',
      constraint = 'content_slug_claims_pkey';
  end if;

  if exists (
    select 1
    from public.content_entries as entry
    where entry.slug = p_slug
      and entry.id <> p_content_entry_id
  ) then
    raise unique_violation using
      message = 'Content slug is already in use',
      constraint = 'content_entries_slug_key';
  end if;

  delete from private.content_slug_claims
  where content_entry_id = p_content_entry_id
    and is_working
    and not is_live
    and slug <> p_slug;

  update private.content_slug_claims
  set
    is_working = false,
    updated_at = statement_timestamp()
  where content_entry_id = p_content_entry_id
    and is_working
    and is_live
    and slug <> p_slug;

  insert into private.content_slug_claims (
    slug,
    content_entry_id,
    is_live,
    is_working
  )
  values (
    p_slug,
    p_content_entry_id,
    false,
    true
  )
  on conflict (slug) do update
  set
    is_working = true,
    updated_at = statement_timestamp()
  where private.content_slug_claims.content_entry_id =
    excluded.content_entry_id;
end
$function$;

create or replace function private.publish_cms_slug(
  p_content_entry_id bigint,
  p_slug text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform private.claim_cms_working_slug(p_content_entry_id, p_slug);

  delete from private.content_slug_claims
  where content_entry_id = p_content_entry_id
    and slug <> p_slug;

  update private.content_slug_claims
  set
    is_live = true,
    is_working = true,
    updated_at = statement_timestamp()
  where content_entry_id = p_content_entry_id
    and slug = p_slug;
end
$function$;

create or replace function private.unpublish_cms_slug(
  p_content_entry_id bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  update private.content_slug_claims
  set
    is_live = false,
    updated_at = statement_timestamp()
  where content_entry_id = p_content_entry_id
    and is_live;

  delete from private.content_slug_claims
  where content_entry_id = p_content_entry_id
    and not is_live
    and not is_working;
end
$function$;

create or replace function private.attach_cms_revision_media(
  p_revision_id bigint,
  p_body jsonb,
  p_snapshot jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if exists (
    with referenced_media as (
      select (p_snapshot ->> 'coverMediaId')::bigint as media_id
      where p_snapshot ? 'coverMediaId'
        and p_snapshot -> 'coverMediaId' <> 'null'::jsonb

      union

      select (block.value ->> 'mediaId')::bigint
      from jsonb_array_elements(p_body -> 'blocks') as block(value)
      where block.value ->> 'type' = 'image'
    )
    select 1
    from referenced_media as reference
    left join public.media_assets as media
      on media.id = reference.media_id
    where media.id is null
      or media.kind <> 'image'
      or media.status <> 'active'
  ) then
    raise exception 'Revision references unavailable media'
      using errcode = '23503';
  end if;

  insert into public.content_revision_media (
    revision_id,
    media_asset_id,
    usage,
    sort_order
  )
  select
    p_revision_id,
    (p_snapshot ->> 'coverMediaId')::bigint,
    'cover',
    0
  where p_snapshot ? 'coverMediaId'
    and p_snapshot -> 'coverMediaId' <> 'null'::jsonb

  union all

  select
    p_revision_id,
    (block.value ->> 'mediaId')::bigint,
    'inline',
    block.ordinality::integer
  from jsonb_array_elements(p_body -> 'blocks')
    with ordinality as block(value, ordinality)
  where block.value ->> 'type' = 'image'
  on conflict do nothing;
end
$function$;

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
      join public.content_revision_media as revision_media
        on revision_media.media_asset_id = media.id
      join public.content_entries as entry
        on entry.published_revision_id = revision_media.revision_id
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
        and entry.kind = 'article'
        and entry.status = 'published'
        and entry.visibility = 'public'
        and entry.published_at <= statement_timestamp()
        and private.content_kind_is_public(entry.kind)
    )
$function$;

create or replace function private.write_cms_audit(
  p_action text,
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

  if char_length(coalesce(effective_correlation_id, '')) > 200
    or char_length(coalesce(p_operator_reference, '')) > 200
    or char_length(coalesce(p_reason, '')) > 1000
    or jsonb_typeof(coalesce(p_context, '{}'::jsonb)) <> 'object'
  then
    raise exception 'Invalid audit context'
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
    p_action,
    'public',
    p_entity_table,
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

revoke all on function private.validate_cms_snapshot(jsonb)
  from public, anon, authenticated;
revoke all on function private.cms_href_is_safe(text, boolean)
  from public, anon, authenticated;
revoke all on function private.validate_cms_inline(jsonb, integer)
  from public, anon, authenticated;
revoke all on function private.validate_cms_document(jsonb)
  from public, anon, authenticated;
revoke all on function private.cms_snapshot_ids(jsonb, text)
  from public, anon, authenticated;
revoke all on function private.claim_cms_working_slug(bigint, text)
  from public, anon, authenticated;
revoke all on function private.publish_cms_slug(bigint, text)
  from public, anon, authenticated;
revoke all on function private.unpublish_cms_slug(bigint)
  from public, anon, authenticated;
revoke all on function private.attach_cms_revision_media(bigint, jsonb, jsonb)
  from public, anon, authenticated;
revoke all on function private.refresh_cms_media_access(bigint[])
  from public, anon, authenticated;
revoke all on function private.can_read_public_cms_media_object(text, text)
  from public, anon, authenticated;
revoke all on function private.write_cms_audit(
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
) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Administrative read RPCs.
-- ---------------------------------------------------------------------------

create or replace function public.cms_list_content(
  p_kind text default null,
  p_status text default null,
  p_category_id bigint default null,
  p_author_id bigint default null,
  p_page integer default 1,
  p_page_size integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  database_kind text;
begin
  perform private.require_cms_capability('content.read');

  if p_page < 1 or p_page_size < 1 or p_page_size > 100 then
    raise exception 'Invalid CMS pagination'
      using errcode = '22023';
  end if;

  if p_kind is not null and p_kind not in ('blog', 'news') then
    raise exception 'Invalid CMS content kind'
      using errcode = '22023';
  end if;

  if p_status is not null
    and p_status not in ('draft', 'review', 'published', 'archived')
  then
    raise exception 'Invalid CMS content status'
      using errcode = '22023';
  end if;

  database_kind := case p_kind
    when 'blog' then 'article'
    when 'news' then 'news'
    else null
  end;

  return (
    with filtered as (
      select
        entry.*,
        working.editorial_snapshot as working_snapshot,
        working.revision_no as working_revision_no
      from public.content_entries as entry
      left join public.content_revisions as working
        on working.id = entry.working_revision_id
      where entry.kind in ('article', 'news')
        and (database_kind is null or entry.kind = database_kind)
        and (p_status is null or entry.status = p_status)
        and (
          p_category_id is null
          or coalesce(
            working.editorial_snapshot -> 'categoryIds',
            '[]'::jsonb
          ) @> jsonb_build_array(p_category_id)
        )
        and (
          p_author_id is null
          or nullif(
            working.editorial_snapshot ->> 'authorId',
            ''
          )::bigint = p_author_id
        )
    ),
    paged as (
      select *
      from filtered
      order by updated_at desc, id desc
      limit p_page_size
      offset (p_page - 1) * p_page_size
    )
    select jsonb_build_object(
      'items',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', item.id,
              'kind', case item.kind
                when 'article' then 'blog'
                else 'news'
              end,
              'status', item.status,
              'visibility', item.visibility,
              'title', coalesce(
                item.working_snapshot ->> 'title',
                item.title
              ),
              'slug', coalesce(
                item.working_snapshot ->> 'slug',
                item.slug
              ),
              'authorId', coalesce(
                nullif(item.working_snapshot ->> 'authorId', '')::bigint,
                item.author_id
              ),
              'workingRevisionId', item.working_revision_id,
              'workingRevisionNo', item.working_revision_no,
              'publishedRevisionId', item.published_revision_id,
              'hasUnpublishedChanges',
                item.working_revision_id is distinct from
                  item.published_revision_id,
              'publishedAt', item.published_at,
              'updatedAt', item.updated_at,
              'channelPublic',
                private.content_kind_is_public(item.kind)
            )
            order by item.updated_at desc, item.id desc
          )
          from paged as item
        ),
        '[]'::jsonb
      ),
      'total', (select count(*) from filtered),
      'page', p_page,
      'pageSize', p_page_size
    )
  );
end
$function$;

create or replace function public.cms_get_content(p_entry_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  result jsonb;
begin
  perform private.require_cms_capability('content.read');

  select jsonb_build_object(
    'entry',
    jsonb_build_object(
      'id', entry.id,
      'kind', case entry.kind
        when 'article' then 'blog'
        when 'news' then 'news'
      end,
      'status', entry.status,
      'visibility', entry.visibility,
      'workingRevisionId', entry.working_revision_id,
      'publishedRevisionId', entry.published_revision_id,
      'publishedAt', entry.published_at,
      'createdAt', entry.created_at,
      'updatedAt', entry.updated_at,
      'channelPublic', private.content_kind_is_public(entry.kind)
    ),
    'workingRevision',
    case
      when working.id is null then null
      else jsonb_build_object(
        'id', working.id,
        'revisionNo', working.revision_no,
        'schemaVersion', working.schema_version,
        'snapshot', working.editorial_snapshot,
        'body', working.body,
        'changeSummary', working.change_summary,
        'createdBy', working.created_by,
        'createdAt', working.created_at
      )
    end,
    'publishedRevision',
    case
      when published.id is null then null
      else jsonb_build_object(
        'id', published.id,
        'revisionNo', published.revision_no,
        'schemaVersion', published.schema_version,
        'snapshot', published.editorial_snapshot,
        'body', published.body,
        'changeSummary', published.change_summary,
        'createdBy', published.created_by,
        'createdAt', published.created_at
      )
    end,
    'history',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', history.id,
            'revisionNo', history.revision_no,
            'schemaVersion', history.schema_version,
            'changeSummary', history.change_summary,
            'createdBy', history.created_by,
            'createdAt', history.created_at,
            'isWorking', history.id = entry.working_revision_id,
            'isPublished', history.id = entry.published_revision_id
          )
          order by history.revision_no desc, history.id desc
        )
        from public.content_revisions as history
        where history.content_entry_id = entry.id
      ),
      '[]'::jsonb
    )
  )
  into result
  from public.content_entries as entry
  left join public.content_revisions as working
    on working.id = entry.working_revision_id
  left join public.content_revisions as published
    on published.id = entry.published_revision_id
  where entry.id = p_entry_id
    and entry.kind in ('article', 'news');

  if result is null then
    raise exception 'CMS content entry not found'
      using errcode = 'P0002';
  end if;

  return result;
end
$function$;

create or replace function public.cms_get_revision(
  p_entry_id bigint,
  p_revision_id bigint
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  result jsonb;
begin
  perform private.require_cms_capability('content.preview');

  select jsonb_build_object(
    'entryId', entry.id,
    'kind', case entry.kind
      when 'article' then 'blog'
      when 'news' then 'news'
    end,
    'status', entry.status,
    'revision',
    jsonb_build_object(
      'id', revision.id,
      'revisionNo', revision.revision_no,
      'schemaVersion', revision.schema_version,
      'snapshot', revision.editorial_snapshot,
      'body', revision.body,
      'changeSummary', revision.change_summary,
      'createdBy', revision.created_by,
      'createdAt', revision.created_at,
      'isWorking', revision.id = entry.working_revision_id,
      'isPublished', revision.id = entry.published_revision_id
    )
  )
  into result
  from public.content_entries as entry
  join public.content_revisions as revision
    on revision.content_entry_id = entry.id
  where entry.id = p_entry_id
    and revision.id = p_revision_id
    and entry.kind in ('article', 'news');

  if result is null then
    raise exception 'CMS revision not found'
      using errcode = 'P0002';
  end if;

  return result;
end
$function$;

-- ---------------------------------------------------------------------------
-- Draft creation and optimistic immutable revision saves.
-- ---------------------------------------------------------------------------

create or replace function public.cms_create_content(
  p_kind text,
  p_snapshot jsonb,
  p_body jsonb,
  p_change_summary text default null,
  p_correlation_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  database_kind text;
  entry_id bigint;
  revision_id bigint;
  author_id bigint;
  cover_media_id bigint;
begin
  perform private.require_cms_capability('content.create');
  perform private.validate_cms_snapshot(p_snapshot);
  perform private.validate_cms_document(p_body);

  if p_kind not in ('blog', 'news') then
    raise exception 'Invalid CMS content kind'
      using errcode = '22023';
  end if;

  if char_length(coalesce(p_change_summary, '')) > 500 then
    raise exception 'Change summary exceeds 500 characters'
      using errcode = '22023';
  end if;

  database_kind := case p_kind
    when 'blog' then 'article'
    else 'news'
  end;
  author_id := nullif(p_snapshot ->> 'authorId', '')::bigint;
  cover_media_id := nullif(p_snapshot ->> 'coverMediaId', '')::bigint;

  insert into public.content_entries (
    kind,
    slug,
    title,
    excerpt,
    status,
    visibility,
    author_id,
    cover_media_id,
    seo_title,
    seo_description,
    metadata,
    created_by,
    updated_by
  )
  values (
    database_kind,
    p_snapshot ->> 'slug',
    btrim(p_snapshot ->> 'title'),
    nullif(btrim(coalesce(p_snapshot ->> 'excerpt', '')), ''),
    'draft',
    'public',
    author_id,
    cover_media_id,
    nullif(btrim(coalesce(p_snapshot ->> 'seoTitle', '')), ''),
    nullif(btrim(coalesce(p_snapshot ->> 'seoDescription', '')), ''),
    '{}'::jsonb,
    actor_id,
    actor_id
  )
  returning id into entry_id;

  insert into public.content_revisions (
    content_entry_id,
    revision_no,
    body,
    schema_version,
    editorial_snapshot,
    change_summary,
    created_by
  )
  values (
    entry_id,
    1,
    p_body,
    1,
    p_snapshot,
    nullif(btrim(coalesce(p_change_summary, '')), ''),
    actor_id
  )
  returning id into revision_id;

  perform private.attach_cms_revision_media(
    revision_id,
    p_body,
    p_snapshot
  );
  perform private.claim_cms_working_slug(
    entry_id,
    p_snapshot ->> 'slug'
  );

  update public.content_entries
  set working_revision_id = revision_id
  where id = entry_id;

  perform private.write_cms_audit(
    'cms.content.created',
    'content_entries',
    entry_id::text,
    null,
    jsonb_build_object(
      'kind', database_kind,
      'status', 'draft',
      'workingRevisionId', revision_id,
      'slug', p_snapshot ->> 'slug'
    ),
    p_correlation_id,
    null,
    null,
    jsonb_build_object('contentKind', database_kind)
  );

  return jsonb_build_object(
    'changed', true,
    'entryId', entry_id,
    'workingRevisionId', revision_id,
    'revisionId', revision_id,
    'oldSlug', null,
    'newSlug', p_snapshot ->> 'slug'
  );
end
$function$;

create or replace function public.cms_save_draft(
  p_entry_id bigint,
  p_expected_working_revision_id bigint,
  p_snapshot jsonb,
  p_body jsonb,
  p_change_summary text default null,
  p_correlation_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  entry public.content_entries%rowtype;
  next_revision_no integer;
  new_revision_id bigint;
  old_working_slug text;
  new_slug text := p_snapshot ->> 'slug';
  snapshot_author_id bigint;
  snapshot_cover_media_id bigint;
begin
  perform private.require_cms_capability('content.update');
  perform private.validate_cms_snapshot(p_snapshot);
  perform private.validate_cms_document(p_body);

  if char_length(coalesce(p_change_summary, '')) > 500 then
    raise exception 'Change summary exceeds 500 characters'
      using errcode = '22023';
  end if;

  select content.*
  into entry
  from public.content_entries as content
  where content.id = p_entry_id
    and content.kind in ('article', 'news')
  for update;

  if not found then
    raise exception 'CMS content entry not found'
      using errcode = 'P0002';
  end if;

  if entry.status = 'archived' then
    raise exception 'Archived content is read-only'
      using errcode = '55000';
  end if;

  if entry.working_revision_id is distinct from
    p_expected_working_revision_id
  then
    raise exception 'The working revision changed'
      using errcode = '40001',
        detail = jsonb_build_object(
          'expectedWorkingRevisionId',
          p_expected_working_revision_id,
          'actualWorkingRevisionId',
          entry.working_revision_id
        )::text;
  end if;

  select revision.editorial_snapshot ->> 'slug'
  into old_working_slug
  from public.content_revisions as revision
  where revision.id = entry.working_revision_id;

  perform private.claim_cms_working_slug(p_entry_id, new_slug);

  select coalesce(max(revision.revision_no), 0) + 1
  into next_revision_no
  from public.content_revisions as revision
  where revision.content_entry_id = p_entry_id;

  insert into public.content_revisions (
    content_entry_id,
    revision_no,
    body,
    schema_version,
    editorial_snapshot,
    change_summary,
    created_by
  )
  values (
    p_entry_id,
    next_revision_no,
    p_body,
    1,
    p_snapshot,
    nullif(btrim(coalesce(p_change_summary, '')), ''),
    actor_id
  )
  returning id into new_revision_id;

  perform private.attach_cms_revision_media(
    new_revision_id,
    p_body,
    p_snapshot
  );

  snapshot_author_id := nullif(
    p_snapshot ->> 'authorId',
    ''
  )::bigint;
  snapshot_cover_media_id := nullif(
    p_snapshot ->> 'coverMediaId',
    ''
  )::bigint;

  if entry.published_at is null then
    update public.content_entries
    set
      slug = new_slug,
      title = btrim(p_snapshot ->> 'title'),
      excerpt = nullif(
        btrim(coalesce(p_snapshot ->> 'excerpt', '')),
        ''
      ),
      author_id = snapshot_author_id,
      cover_media_id = snapshot_cover_media_id,
      seo_title = nullif(
        btrim(coalesce(p_snapshot ->> 'seoTitle', '')),
        ''
      ),
      seo_description = nullif(
        btrim(coalesce(p_snapshot ->> 'seoDescription', '')),
        ''
      ),
      working_revision_id = new_revision_id,
      updated_by = actor_id
    where id = p_entry_id;
  else
    update public.content_entries
    set
      working_revision_id = new_revision_id,
      updated_by = actor_id
    where id = p_entry_id;
  end if;

  perform private.write_cms_audit(
    'cms.content.draft_saved',
    'content_entries',
    p_entry_id::text,
    jsonb_build_object(
      'workingRevisionId', entry.working_revision_id,
      'slug', old_working_slug
    ),
    jsonb_build_object(
      'workingRevisionId', new_revision_id,
      'slug', new_slug
    ),
    p_correlation_id,
    null,
    null,
    jsonb_build_object('contentKind', entry.kind)
  );

  return jsonb_build_object(
    'changed', true,
    'entryId', p_entry_id,
    'workingRevisionId', new_revision_id,
    'revisionId', new_revision_id,
    'oldSlug', old_working_slug,
    'newSlug', new_slug
  );
end
$function$;

-- ---------------------------------------------------------------------------
-- Publication lifecycle. Public metadata, taxonomy, relations, and media
-- visibility move together with the immutable published revision pointer.
-- ---------------------------------------------------------------------------

create or replace function public.cms_publish_content(
  p_entry_id bigint,
  p_expected_working_revision_id bigint,
  p_correlation_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  entry public.content_entries%rowtype;
  working public.content_revisions%rowtype;
  snapshot jsonb;
  old_slug text;
  new_slug text;
  effective_published_at timestamptz;
  snapshot_author_id bigint;
  snapshot_cover_media_id bigint;
begin
  perform private.require_cms_capability('content.publish');

  select content.*
  into entry
  from public.content_entries as content
  where content.id = p_entry_id
    and content.kind in ('article', 'news')
  for update;

  if not found then
    raise exception 'CMS content entry not found'
      using errcode = 'P0002';
  end if;

  if entry.kind <> 'article'
    or not private.content_kind_is_public(entry.kind)
  then
    raise exception 'Publication is disabled for this content channel'
      using errcode = '23514';
  end if;

  if entry.status = 'archived' then
    raise exception 'Archived content is read-only'
      using errcode = '55000';
  end if;

  if entry.working_revision_id is distinct from
    p_expected_working_revision_id
  then
    raise exception 'The working revision changed'
      using errcode = '40001',
        detail = jsonb_build_object(
          'expectedWorkingRevisionId',
          p_expected_working_revision_id,
          'actualWorkingRevisionId',
          entry.working_revision_id
        )::text;
  end if;

  select revision.*
  into working
  from public.content_revisions as revision
  where revision.id = entry.working_revision_id
    and revision.content_entry_id = entry.id;

  if not found then
    raise exception 'Working revision not found'
      using errcode = 'P0002';
  end if;

  if working.schema_version <> 1 then
    raise exception 'Legacy content must be saved as version 1 before publishing'
      using errcode = '22023';
  end if;

  snapshot := working.editorial_snapshot;
  perform private.validate_cms_snapshot(snapshot);
  perform private.validate_cms_document(working.body);

  old_slug := entry.slug;
  new_slug := snapshot ->> 'slug';
  snapshot_author_id := nullif(snapshot ->> 'authorId', '')::bigint;
  snapshot_cover_media_id :=
    nullif(snapshot ->> 'coverMediaId', '')::bigint;

  if snapshot_author_id is not null
    and not exists (
      select 1
      from public.content_authors as author
      where author.id = snapshot_author_id
        and author.status = 'active'
    )
  then
    raise exception 'Snapshot author is unavailable'
      using errcode = '23503';
  end if;

  if snapshot_cover_media_id is not null
    and not exists (
      select 1
      from public.media_assets as media
      where media.id = snapshot_cover_media_id
        and media.kind = 'image'
        and media.status = 'active'
    )
  then
    raise exception 'Snapshot cover media is unavailable'
      using errcode = '23503';
  end if;

  if (
    select count(*)
    from private.cms_snapshot_ids(snapshot, 'categoryIds')
  ) <> (
    select count(*)
    from public.content_categories as category
    where category.id in (
      select private.cms_snapshot_ids(snapshot, 'categoryIds')
    )
      and category.is_active
  ) then
    raise exception 'Snapshot contains unavailable categories'
      using errcode = '23503';
  end if;

  if (
    select count(*)
    from private.cms_snapshot_ids(snapshot, 'tagIds')
  ) <> (
    select count(*)
    from public.content_tags as tag
    where tag.id in (
      select private.cms_snapshot_ids(snapshot, 'tagIds')
    )
  ) then
    raise exception 'Snapshot contains unavailable tags'
      using errcode = '23503';
  end if;

  if exists (
    select 1
    from private.cms_snapshot_ids(snapshot, 'relatedEntryIds') as relation(id)
    where relation.id = entry.id
  ) then
    raise exception 'Content cannot relate to itself'
      using errcode = '23514';
  end if;

  if (
    select count(*)
    from private.cms_snapshot_ids(snapshot, 'relatedEntryIds')
  ) <> (
    select count(*)
    from public.content_entries as related
    where related.id in (
      select private.cms_snapshot_ids(snapshot, 'relatedEntryIds')
    )
      and related.kind = 'article'
  ) then
    raise exception 'Snapshot contains unavailable related entries'
      using errcode = '23503';
  end if;

  if exists (
    select 1
    from public.content_revision_media as revision_media
    left join public.media_assets as media
      on media.id = revision_media.media_asset_id
    where revision_media.revision_id = working.id
      and (
        media.id is null
        or media.status <> 'active'
        or media.kind <> 'image'
      )
  ) then
    raise exception 'Working revision contains unavailable media'
      using errcode = '23503';
  end if;

  begin
    effective_published_at := coalesce(
      nullif(snapshot ->> 'publishedAt', '')::timestamptz,
      entry.published_at,
      statement_timestamp()
    );
  exception
    when invalid_datetime_format or datetime_field_overflow then
      raise exception 'Snapshot publication date is invalid'
        using errcode = '22007';
  end;

  if effective_published_at > statement_timestamp() then
    raise exception 'Scheduled publication is not supported'
      using errcode = '22023';
  end if;

  if entry.status = 'published'
    and entry.published_revision_id = working.id
  then
    return jsonb_build_object(
      'changed', false,
      'entryId', entry.id,
      'workingRevisionId', working.id,
      'revisionId', working.id,
      'oldSlug', entry.slug,
      'newSlug', entry.slug
    );
  end if;

  perform private.publish_cms_slug(entry.id, new_slug);

  delete from public.content_entry_categories
  where content_entry_id = entry.id;

  insert into public.content_entry_categories (
    content_entry_id,
    category_id,
    is_primary
  )
  select
    entry.id,
    category.value::text::bigint,
    category.ordinality = 1
  from jsonb_array_elements(
    coalesce(snapshot -> 'categoryIds', '[]'::jsonb)
  ) with ordinality as category(value, ordinality)
  where category.value::text ~ '^[1-9][0-9]*$';

  delete from public.content_entry_tags
  where content_entry_id = entry.id;

  insert into public.content_entry_tags (
    content_entry_id,
    tag_id
  )
  select
    entry.id,
    tag.value::text::bigint
  from jsonb_array_elements(
    coalesce(snapshot -> 'tagIds', '[]'::jsonb)
  ) as tag(value);

  delete from public.content_relations
  where content_entry_id = entry.id
    and relation_type = 'related';

  insert into public.content_relations (
    content_entry_id,
    related_content_entry_id,
    relation_type,
    sort_order
  )
  select
    entry.id,
    relation.value::text::bigint,
    'related',
    relation.ordinality::integer - 1
  from jsonb_array_elements(
    coalesce(snapshot -> 'relatedEntryIds', '[]'::jsonb)
  ) with ordinality as relation(value, ordinality);

  update public.content_entries
  set
    slug = new_slug,
    title = btrim(snapshot ->> 'title'),
    excerpt = nullif(
      btrim(coalesce(snapshot ->> 'excerpt', '')),
      ''
    ),
    status = 'published',
    visibility = 'public',
    author_id = snapshot_author_id,
    cover_media_id = snapshot_cover_media_id,
    published_revision_id = working.id,
    scheduled_at = null,
    published_at = effective_published_at,
    seo_title = nullif(
      btrim(coalesce(snapshot ->> 'seoTitle', '')),
      ''
    ),
    seo_description = nullif(
      btrim(coalesce(snapshot ->> 'seoDescription', '')),
      ''
    ),
    metadata = (
      entry.metadata
      - 'reviewer'
      - 'reviewDate'
      - 'disclaimer'
      - 'correctionNote'
    ) || jsonb_strip_nulls(jsonb_build_object(
      'reviewer', nullif(btrim(coalesce(snapshot ->> 'reviewer', '')), ''),
      'reviewDate',
        nullif(btrim(coalesce(snapshot ->> 'reviewDate', '')), ''),
      'disclaimer',
        nullif(btrim(coalesce(snapshot ->> 'disclaimer', '')), ''),
      'correctionNote',
        nullif(btrim(coalesce(snapshot ->> 'correctionNote', '')), '')
    )),
    updated_by = actor_id
  where id = entry.id;

  perform private.refresh_cms_media_access();

  perform private.write_cms_audit(
    'cms.content.published',
    'content_entries',
    entry.id::text,
    jsonb_build_object(
      'status', entry.status,
      'publishedRevisionId', entry.published_revision_id,
      'slug', old_slug
    ),
    jsonb_build_object(
      'status', 'published',
      'publishedRevisionId', working.id,
      'slug', new_slug,
      'publishedAt', effective_published_at
    ),
    p_correlation_id,
    null,
    null,
    jsonb_build_object('contentKind', entry.kind)
  );

  return jsonb_build_object(
    'changed', true,
    'entryId', entry.id,
    'workingRevisionId', working.id,
    'revisionId', working.id,
    'oldSlug', old_slug,
    'newSlug', new_slug
  );
end
$function$;

create or replace function public.cms_unpublish_content(
  p_entry_id bigint,
  p_correlation_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  entry public.content_entries%rowtype;
begin
  perform private.require_cms_capability('content.unpublish');

  select content.*
  into entry
  from public.content_entries as content
  where content.id = p_entry_id
    and content.kind in ('article', 'news')
  for update;

  if not found then
    raise exception 'CMS content entry not found'
      using errcode = 'P0002';
  end if;

  if entry.status = 'archived' then
    raise exception 'Archived content is read-only'
      using errcode = '55000';
  end if;

  if entry.status <> 'published'
    and entry.published_revision_id is null
  then
    return jsonb_build_object(
      'changed', false,
      'entryId', entry.id,
      'workingRevisionId', entry.working_revision_id,
      'revisionId', null,
      'oldSlug', entry.slug,
      'newSlug', entry.slug
    );
  end if;

  update public.content_entries
  set
    status = 'draft',
    published_revision_id = null,
    scheduled_at = null,
    updated_by = actor_id
  where id = entry.id;

  perform private.unpublish_cms_slug(entry.id);
  perform private.refresh_cms_media_access();

  perform private.write_cms_audit(
    'cms.content.unpublished',
    'content_entries',
    entry.id::text,
    jsonb_build_object(
      'status', entry.status,
      'publishedRevisionId', entry.published_revision_id,
      'slug', entry.slug
    ),
    jsonb_build_object(
      'status', 'draft',
      'publishedRevisionId', null,
      'slug', entry.slug
    ),
    p_correlation_id,
    null,
    null,
    jsonb_build_object('contentKind', entry.kind)
  );

  return jsonb_build_object(
    'changed', true,
    'entryId', entry.id,
    'workingRevisionId', entry.working_revision_id,
    'revisionId', entry.published_revision_id,
    'oldSlug', entry.slug,
    'newSlug', entry.slug
  );
end
$function$;

create or replace function public.cms_archive_content(
  p_entry_id bigint,
  p_correlation_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  entry public.content_entries%rowtype;
begin
  perform private.require_cms_capability('content.archive');

  select content.*
  into entry
  from public.content_entries as content
  where content.id = p_entry_id
    and content.kind in ('article', 'news')
  for update;

  if not found then
    raise exception 'CMS content entry not found'
      using errcode = 'P0002';
  end if;

  if entry.status = 'archived' then
    return jsonb_build_object(
      'changed', false,
      'entryId', entry.id,
      'workingRevisionId', entry.working_revision_id,
      'revisionId', entry.published_revision_id,
      'oldSlug', entry.slug,
      'newSlug', entry.slug
    );
  end if;

  update public.content_entries
  set
    status = 'archived',
    published_revision_id = null,
    scheduled_at = null,
    updated_by = actor_id
  where id = entry.id;

  perform private.unpublish_cms_slug(entry.id);
  perform private.refresh_cms_media_access();

  perform private.write_cms_audit(
    'cms.content.archived',
    'content_entries',
    entry.id::text,
    jsonb_build_object(
      'status', entry.status,
      'publishedRevisionId', entry.published_revision_id,
      'slug', entry.slug
    ),
    jsonb_build_object(
      'status', 'archived',
      'publishedRevisionId', null,
      'slug', entry.slug
    ),
    p_correlation_id,
    null,
    null,
    jsonb_build_object('contentKind', entry.kind)
  );

  return jsonb_build_object(
    'changed', true,
    'entryId', entry.id,
    'workingRevisionId', entry.working_revision_id,
    'revisionId', entry.published_revision_id,
    'oldSlug', entry.slug,
    'newSlug', entry.slug
  );
end
$function$;

-- ---------------------------------------------------------------------------
-- CMS media registration and archival. Object bytes are uploaded first under
-- Storage RLS; registration makes the sanitized metadata available to drafts.
-- Publication alone can promote access_level to public.
-- ---------------------------------------------------------------------------

create or replace function public.cms_register_media(
  p_storage_path text,
  p_title text,
  p_default_alt_text text,
  p_caption text,
  p_mime_type text,
  p_byte_size bigint,
  p_width integer,
  p_height integer,
  p_checksum_sha256 text,
  p_metadata jsonb default '{}'::jsonb,
  p_correlation_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  media_id bigint;
  path_prefix text;
  variant_count integer;
  distinct_key_count integer;
  distinct_path_count integer;
begin
  perform private.require_cms_capability('content.media.manage');

  if p_storage_path is null
    or char_length(p_storage_path) > 1024
    or p_storage_path
      !~ '^cms/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/original\.webp$'
  then
    raise exception 'CMS media storage path is invalid'
      using errcode = '22023';
  end if;

  if p_mime_type is distinct from 'image/webp'
    or p_byte_size is null
    or p_byte_size < 1
    or p_byte_size > 10485760
    or p_width is null
    or p_width < 1
    or p_width > 6000
    or p_height is null
    or p_height < 1
    or p_height > 6000
    or p_checksum_sha256 is null
    or p_checksum_sha256 !~ '^[a-f0-9]{64}$'
  then
    raise exception 'CMS media dimensions or encoding are invalid'
      using errcode = '22023';
  end if;

  if char_length(coalesce(p_title, '')) > 160
    or char_length(coalesce(p_default_alt_text, '')) > 500
    or char_length(coalesce(p_caption, '')) > 500
  then
    raise exception 'CMS media editorial metadata is too long'
      using errcode = '22023';
  end if;

  if p_metadata is null
    or jsonb_typeof(p_metadata) <> 'object'
    or jsonb_typeof(p_metadata -> 'version') is distinct from 'number'
    or p_metadata ->> 'version' <> '1'
    or not (
      p_metadata ?& array[
        'version',
        'credit',
        'decorative',
        'originalFileName',
        'originalFormat',
        'rights',
        'source',
        'variants'
      ]
    )
    or p_metadata - array[
      'version',
      'credit',
      'decorative',
      'originalFileName',
      'originalFormat',
      'rights',
      'source',
      'variants'
    ] <> '{}'::jsonb
    or jsonb_typeof(p_metadata -> 'decorative') is distinct from 'boolean'
    or jsonb_typeof(p_metadata -> 'originalFileName')
      is distinct from 'string'
    or char_length(p_metadata ->> 'originalFileName') not between 1 and 255
    or (p_metadata ->> 'originalFileName') ~ '[[:cntrl:]]'
    or coalesce(p_metadata ->> 'originalFormat', '')
      not in ('jpeg', 'png', 'webp')
    or (
      p_metadata -> 'credit' <> 'null'::jsonb
      and (
        jsonb_typeof(p_metadata -> 'credit') <> 'string'
        or char_length(p_metadata ->> 'credit') > 500
      )
    )
    or (
      p_metadata -> 'rights' <> 'null'::jsonb
      and (
        jsonb_typeof(p_metadata -> 'rights') <> 'string'
        or char_length(p_metadata ->> 'rights') > 500
      )
    )
    or (
      p_metadata -> 'source' <> 'null'::jsonb
      and (
        jsonb_typeof(p_metadata -> 'source') <> 'string'
        or not private.cms_href_is_safe(
          p_metadata ->> 'source',
          false
        )
      )
    )
    or jsonb_typeof(p_metadata -> 'variants') <> 'array'
  then
    raise exception 'CMS media metadata is invalid'
      using errcode = '22023';
  end if;

  variant_count := jsonb_array_length(p_metadata -> 'variants');

  if variant_count < 1 or variant_count > 4 then
    raise exception 'CMS media must contain 1 to 4 variants'
      using errcode = '22023';
  end if;

  path_prefix := left(
    p_storage_path,
    char_length(p_storage_path) - char_length('original.webp')
  );

  if exists (
    select 1
    from jsonb_array_elements(p_metadata -> 'variants') as variant(value)
    where jsonb_typeof(variant.value) <> 'object'
      or variant.value - array[
        'byteSize',
        'checksumSha256',
        'height',
        'key',
        'path',
        'width'
      ] <> '{}'::jsonb
      or coalesce(variant.value ->> 'key', '')
        not in ('640', '1280', '1920', 'original')
      or coalesce(variant.value ->> 'path', '')
        <> path_prefix || coalesce(variant.value ->> 'key', '') || '.webp'
      or coalesce(variant.value ->> 'path', '')
        !~ '^cms/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/(?:640|1280|1920|original)\.webp$'
      or jsonb_typeof(variant.value -> 'width') is distinct from 'number'
      or (variant.value -> 'width')::text !~ '^[1-9][0-9]*$'
      or (variant.value ->> 'width')::integer > 6000
      or jsonb_typeof(variant.value -> 'height') is distinct from 'number'
      or (variant.value -> 'height')::text !~ '^[1-9][0-9]*$'
      or (variant.value ->> 'height')::integer > 6000
      or (variant.value ->> 'height')::integer > p_height
      or jsonb_typeof(variant.value -> 'byteSize') is distinct from 'number'
      or (variant.value -> 'byteSize')::text !~ '^[1-9][0-9]*$'
      or (variant.value ->> 'byteSize')::bigint > 10485760
      or coalesce(variant.value ->> 'checksumSha256', '')
        !~ '^[a-f0-9]{64}$'
  ) then
    raise exception 'CMS media contains an invalid variant'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_metadata -> 'variants') as variant(value)
    where variant.value ->> 'key' <> 'original'
      and (
        (variant.value ->> 'width')::integer
          <> (variant.value ->> 'key')::integer
        or (variant.value ->> 'width')::integer >= p_width
      )
  ) then
    raise exception 'CMS media variants cannot upscale the image'
      using errcode = '22023';
  end if;

  select
    count(distinct variant.value ->> 'key'),
    count(distinct variant.value ->> 'path')
  into distinct_key_count, distinct_path_count
  from jsonb_array_elements(p_metadata -> 'variants') as variant(value);

  if distinct_key_count <> variant_count
    or distinct_path_count <> variant_count
  then
    raise exception 'CMS media variants must be unique'
      using errcode = '22023';
  end if;

  if (p_width > 640 and not (p_metadata -> 'variants') @>
      '[{"key":"640"}]'::jsonb)
    or (p_width > 1280 and not (p_metadata -> 'variants') @>
      '[{"key":"1280"}]'::jsonb)
    or (p_width > 1920 and not (p_metadata -> 'variants') @>
      '[{"key":"1920"}]'::jsonb)
  then
    raise exception 'CMS media is missing a responsive variant'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(p_metadata -> 'variants') as variant(value)
    where variant.value ->> 'key' = 'original'
      and variant.value ->> 'path' = p_storage_path
      and (variant.value ->> 'width')::integer = p_width
      and (variant.value ->> 'height')::integer = p_height
      and (variant.value ->> 'byteSize')::bigint = p_byte_size
      and variant.value ->> 'checksumSha256' = p_checksum_sha256
  ) then
    raise exception 'Original CMS media metadata does not match the asset'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_metadata -> 'variants') as variant(value)
    where not exists (
      select 1
      from storage.objects as object
      where object.bucket_id = 'cms-media'
        and object.name = variant.value ->> 'path'
    )
  ) then
    raise exception 'One or more CMS media objects are missing'
      using errcode = '23503';
  end if;

  insert into public.media_assets (
    storage_bucket,
    storage_path,
    owner_user_id,
    uploaded_by,
    kind,
    access_level,
    status,
    title,
    default_alt_text,
    caption,
    mime_type,
    byte_size,
    width,
    height,
    checksum_sha256,
    metadata
  )
  values (
    'cms-media',
    p_storage_path,
    actor_id,
    actor_id,
    'image',
    'private',
    'active',
    nullif(btrim(coalesce(p_title, '')), ''),
    nullif(btrim(coalesce(p_default_alt_text, '')), ''),
    nullif(btrim(coalesce(p_caption, '')), ''),
    'image/webp',
    p_byte_size,
    p_width,
    p_height,
    p_checksum_sha256,
    p_metadata
  )
  returning id into media_id;

  perform private.write_cms_audit(
    'cms.media.registered',
    'media_assets',
    media_id::text,
    null,
    jsonb_build_object(
      'status', 'active',
      'accessLevel', 'private',
      'storageBucket', 'cms-media'
    ),
    p_correlation_id,
    null,
    null,
    jsonb_build_object(
      'mediaKind', 'image',
      'variantCount', variant_count
    )
  );

  return jsonb_build_object(
    'changed', true,
    'mediaId', media_id,
    'storageBucket', 'cms-media',
    'storagePath', p_storage_path
  );
end
$function$;

create or replace function public.cms_archive_media(
  p_media_id bigint,
  p_correlation_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  media public.media_assets%rowtype;
begin
  perform private.require_cms_capability('content.media.manage');

  select asset.*
  into media
  from public.media_assets as asset
  where asset.id = p_media_id
    and asset.storage_bucket = 'cms-media'
  for update;

  if not found then
    raise exception 'CMS media asset not found'
      using errcode = 'P0002';
  end if;

  if media.status = 'archived' then
    return jsonb_build_object(
      'changed', false,
      'mediaId', media.id
    );
  end if;

  if exists (
    select 1
    from public.content_revision_media as revision_media
    where revision_media.media_asset_id = media.id
  ) then
    raise exception 'Referenced CMS media cannot be archived'
      using errcode = '55000';
  end if;

  update public.media_assets
  set
    status = 'archived',
    access_level = 'private'
  where id = media.id;

  perform private.write_cms_audit(
    'cms.media.archived',
    'media_assets',
    media.id::text,
    jsonb_build_object(
      'status', media.status,
      'accessLevel', media.access_level,
      'storageBucket', media.storage_bucket
    ),
    jsonb_build_object(
      'status', 'archived',
      'accessLevel', 'private',
      'storageBucket', media.storage_bucket
    ),
    p_correlation_id,
    null,
    null,
    jsonb_build_object('mediaKind', media.kind)
  );

  return jsonb_build_object(
    'changed', true,
    'mediaId', media.id
  );
end
$function$;

-- ---------------------------------------------------------------------------
-- Service-role-only operator RPCs. Runtime application modules never import a
-- service key; these functions support guarded local/hosted operator tooling.
-- ---------------------------------------------------------------------------

create or replace function public.cms_operator_grant_admin(
  p_user_id uuid,
  p_operator_reference text,
  p_reason text,
  p_display_name text default null,
  p_correlation_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  auth_user jsonb;
  previous_role public.smartmed_role;
  effective_display_name text;
  changed boolean;
begin
  perform private.require_service_request();

  if nullif(btrim(coalesce(p_operator_reference, '')), '') is null
    or char_length(p_operator_reference) > 200
    or nullif(btrim(coalesce(p_reason, '')), '') is null
    or char_length(p_reason) > 1000
  then
    raise exception 'Operator reference and reason are required'
      using errcode = '22023';
  end if;

  if p_display_name is not null
    and char_length(btrim(p_display_name)) not between 2 and 100
  then
    raise exception 'Display name must contain 2 to 100 characters'
      using errcode = '22023';
  end if;

  select to_jsonb(auth_identity)
  into auth_user
  from auth.users as auth_identity
  where auth_identity.id = p_user_id;

  if auth_user is null then
    raise exception 'Auth user not found'
      using errcode = 'P0002';
  end if;

  if auth_user ->> 'email_confirmed_at' is null
    or coalesce((auth_user ->> 'is_anonymous')::boolean, false)
  then
    raise exception 'Admin identity must be confirmed and non-anonymous'
      using errcode = '22023';
  end if;

  effective_display_name :=
    nullif(btrim(coalesce(p_display_name, '')), '');

  insert into public.profiles as profile (id, full_name)
  values (p_user_id, effective_display_name)
  on conflict (id) do update
  set full_name = coalesce(
    effective_display_name,
    profile.full_name
  );

  select account_role.role
  into previous_role
  from public.account_roles as account_role
  where account_role.user_id = p_user_id
  for update;

  changed := previous_role is distinct from
    'admin'::public.smartmed_role;

  insert into public.account_roles (user_id, role)
  values (p_user_id, 'admin'::public.smartmed_role)
  on conflict (user_id) do update
  set role = excluded.role;

  if changed then
    perform private.write_cms_audit(
      'cms.admin.granted',
      'account_roles',
      p_user_id::text,
      jsonb_build_object('role', previous_role),
      jsonb_build_object('role', 'admin'),
      p_correlation_id,
      p_operator_reference,
      p_reason,
      jsonb_build_object('targetUserId', p_user_id),
      'service',
      null
    );
  end if;

  return jsonb_build_object(
    'changed', changed,
    'userId', p_user_id,
    'role', 'admin'
  );
end
$function$;

create or replace function public.cms_operator_revoke_admin(
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
  previous_role public.smartmed_role;
  changed boolean;
begin
  perform private.require_service_request();

  if nullif(btrim(coalesce(p_operator_reference, '')), '') is null
    or char_length(p_operator_reference) > 200
    or nullif(btrim(coalesce(p_reason, '')), '') is null
    or char_length(p_reason) > 1000
  then
    raise exception 'Operator reference and reason are required'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from auth.users as auth_user
    where auth_user.id = p_user_id
  ) then
    raise exception 'Auth user not found'
      using errcode = 'P0002';
  end if;

  select account_role.role
  into previous_role
  from public.account_roles as account_role
  where account_role.user_id = p_user_id
  for update;

  changed := previous_role is distinct from
    'user'::public.smartmed_role;

  insert into public.account_roles (user_id, role)
  values (p_user_id, 'user'::public.smartmed_role)
  on conflict (user_id) do update
  set role = excluded.role;

  if changed then
    perform private.write_cms_audit(
      'cms.admin.revoked',
      'account_roles',
      p_user_id::text,
      jsonb_build_object('role', previous_role),
      jsonb_build_object('role', 'user'),
      p_correlation_id,
      p_operator_reference,
      p_reason,
      jsonb_build_object('targetUserId', p_user_id),
      'service',
      null
    );
  end if;

  return jsonb_build_object(
    'changed', changed,
    'userId', p_user_id,
    'role', 'user'
  );
end
$function$;

create or replace function public.cms_operator_set_local_mfa_requirement(
  p_require_mfa boolean,
  p_supabase_url text,
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
  previous_requirement boolean;
  changed boolean;
begin
  perform private.require_service_request();

  if p_require_mfa is null then
    raise exception 'MFA requirement must be explicit'
      using errcode = '22023';
  end if;

  if not p_require_mfa
    and p_supabase_url not in (
      'http://localhost:54321',
      'http://127.0.0.1:54321'
    )
  then
    raise exception 'MFA bypass is restricted to exact local Supabase URLs'
      using errcode = '42501';
  end if;

  if nullif(btrim(coalesce(p_operator_reference, '')), '') is null
    or char_length(p_operator_reference) > 200
    or nullif(btrim(coalesce(p_reason, '')), '') is null
    or char_length(p_reason) > 1000
  then
    raise exception 'Operator reference and reason are required'
      using errcode = '22023';
  end if;

  select settings.require_mfa
  into previous_requirement
  from private.admin_security_settings as settings
  where settings.singleton
  for update;

  changed := previous_requirement is distinct from p_require_mfa;

  update private.admin_security_settings
  set
    require_mfa = p_require_mfa,
    updated_at = statement_timestamp(),
    updated_by_reference = p_operator_reference
  where singleton;

  if changed then
    perform private.write_cms_audit(
      'cms.admin_mfa_requirement.changed',
      'admin_security_settings',
      'singleton',
      jsonb_build_object('requireMfa', previous_requirement),
      jsonb_build_object('requireMfa', p_require_mfa),
      p_correlation_id,
      p_operator_reference,
      p_reason,
      jsonb_build_object('localSupabaseUrl', p_supabase_url),
      'service',
      null
    );
  end if;

  return jsonb_build_object(
    'changed', changed,
    'requireMfa', p_require_mfa
  );
end
$function$;

-- ---------------------------------------------------------------------------
-- Read policies. News is excluded from every public CMS projection. Existing
-- non-CMS content kinds keep the platform's prior visibility behavior.
-- ---------------------------------------------------------------------------

drop policy if exists content_entries_select_public
  on public.content_entries;
create policy content_entries_select_public
on public.content_entries
for select
to anon
using (
  status = 'published'
  and published_revision_id is not null
  and visibility = 'public'
  and published_at <= statement_timestamp()
  and private.content_kind_is_public(kind)
);

drop policy if exists content_entries_select_authenticated
  on public.content_entries;
drop policy if exists authenticated_select_access
  on public.content_entries;
create policy authenticated_select_access
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
      and entry.status = 'published'
      and entry.visibility = 'public'
      and entry.published_at <= statement_timestamp()
      and private.content_kind_is_public(entry.kind)
  )
);

drop policy if exists content_revisions_select_authenticated
  on public.content_revisions;
drop policy if exists authenticated_select_access
  on public.content_revisions;
create policy authenticated_select_access
on public.content_revisions
for select
to authenticated
using (
  private.is_admin()
  or exists (
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
to anon
using (
  exists (
    select 1
    from public.content_entries as entry
    where entry.id = content_entry_categories.content_entry_id
      and entry.status = 'published'
      and entry.visibility = 'public'
      and entry.published_at <= statement_timestamp()
      and private.content_kind_is_public(entry.kind)
  )
);

drop policy if exists authenticated_select_access
  on public.content_entry_categories;
create policy authenticated_select_access
on public.content_entry_categories
for select
to authenticated
using (
  private.is_admin()
  or private.can_read_content(content_entry_id)
);

drop policy if exists content_entry_tags_select_visible
  on public.content_entry_tags;
create policy content_entry_tags_select_visible
on public.content_entry_tags
for select
to anon
using (
  exists (
    select 1
    from public.content_entries as entry
    where entry.id = content_entry_tags.content_entry_id
      and entry.status = 'published'
      and entry.visibility = 'public'
      and entry.published_at <= statement_timestamp()
      and private.content_kind_is_public(entry.kind)
  )
);

drop policy if exists authenticated_select_access
  on public.content_entry_tags;
create policy authenticated_select_access
on public.content_entry_tags
for select
to authenticated
using (
  private.is_admin()
  or private.can_read_content(content_entry_id)
);

drop policy if exists content_relations_select_visible
  on public.content_relations;
create policy content_relations_select_visible
on public.content_relations
for select
to anon
using (
  exists (
    select 1
    from public.content_entries as source_entry
    where source_entry.id = content_relations.content_entry_id
      and source_entry.status = 'published'
      and source_entry.visibility = 'public'
      and source_entry.published_at <= statement_timestamp()
      and private.content_kind_is_public(source_entry.kind)
  )
  and exists (
    select 1
    from public.content_entries as related_entry
    where related_entry.id = content_relations.related_content_entry_id
      and related_entry.status = 'published'
      and related_entry.visibility = 'public'
      and related_entry.published_at <= statement_timestamp()
      and private.content_kind_is_public(related_entry.kind)
  )
);

drop policy if exists authenticated_select_access
  on public.content_relations;
create policy authenticated_select_access
on public.content_relations
for select
to authenticated
using (
  private.is_admin()
  or (
    private.can_read_content(content_entry_id)
    and private.can_read_content(related_content_entry_id)
  )
);

drop policy if exists media_assets_select_public
  on public.media_assets;
create policy media_assets_select_public
on public.media_assets
for select
to anon
using (
  status = 'active'
  and access_level = 'public'
  and storage_bucket in ('public-media', 'cms-media')
);

drop policy if exists media_assets_select_authenticated
  on public.media_assets;
drop policy if exists authenticated_select_access
  on public.media_assets;
create policy authenticated_select_access
on public.media_assets
for select
to authenticated
using (
  private.is_admin()
  or (
    status = 'active'
    and (
      access_level in ('public', 'authenticated')
      or owner_user_id = (select auth.uid())
      or private.has_active_entitlement('platform', null, 'view')
      or private.has_active_entitlement('media', id, 'view')
    )
  )
);

drop policy if exists authenticated_select_access
  on public.content_revision_media;
create policy authenticated_select_access
on public.content_revision_media
for select
to authenticated
using (private.is_admin());

-- Direct CMS writes are no longer part of the authenticated Data API surface.
-- SECURITY DEFINER RPCs above perform authorization, locking, audit, and all
-- related writes in one transaction.
revoke insert, update, delete on table
  public.media_assets,
  public.content_authors,
  public.content_categories,
  public.content_tags,
  public.content_entries,
  public.content_revisions,
  public.content_entry_categories,
  public.content_entry_tags,
  public.content_relations,
  public.content_collections,
  public.content_collection_items,
  public.content_revision_media
from authenticated;

revoke usage, select on sequence
  public.media_assets_id_seq,
  public.content_authors_id_seq,
  public.content_categories_id_seq,
  public.content_tags_id_seq,
  public.content_entries_id_seq,
  public.content_revisions_id_seq,
  public.content_collections_id_seq
from authenticated;

grant all privileges on table public.content_revision_media to service_role;
grant select on table public.content_revision_media to authenticated;

-- The public Blog repository needs these two new revision columns. No working
-- pointer or private change summary is exposed anonymously.
grant select (schema_version, editorial_snapshot)
on table public.content_revisions
to anon, authenticated;

-- Policy helpers called while evaluating anonymous Storage/Data API queries
-- need schema usage and only their exact EXECUTE grants.
grant usage on schema private to anon;
grant execute on function private.content_kind_is_public(text)
  to anon, authenticated, service_role;
grant execute on function private.can_read_public_cms_media_object(text, text)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Storage bucket and policies.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('cms-media', 'cms-media', false)
on conflict (id) do update
set
  name = excluded.name,
  public = false;

drop policy if exists smartmed_cms_media_read_public
  on storage.objects;
create policy smartmed_cms_media_read_public
on storage.objects
for select
to anon
using (
  bucket_id = 'cms-media'
  and private.can_read_public_cms_media_object(bucket_id, name)
);

drop policy if exists smartmed_admin_cms_media_read
  on storage.objects;
create policy smartmed_admin_cms_media_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'cms-media'
  and (
    private.is_admin()
    or private.can_read_public_cms_media_object(bucket_id, name)
  )
);

drop policy if exists smartmed_admin_media_insert
  on storage.objects;
create policy smartmed_admin_media_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('public-media', 'course-media', 'cms-media')
  and private.is_admin()
);

drop policy if exists smartmed_admin_media_update
  on storage.objects;
create policy smartmed_admin_media_update
on storage.objects
for update
to authenticated
using (
  bucket_id in ('public-media', 'course-media', 'cms-media')
  and private.is_admin()
)
with check (
  bucket_id in ('public-media', 'course-media', 'cms-media')
  and private.is_admin()
);

drop policy if exists smartmed_admin_media_delete
  on storage.objects;
create policy smartmed_admin_media_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('public-media', 'course-media', 'cms-media')
  and private.is_admin()
);

grant select on table storage.objects to anon, authenticated;
grant insert, update, delete on table storage.objects to authenticated;

-- ---------------------------------------------------------------------------
-- Explicit 2026+ function exposure.
-- ---------------------------------------------------------------------------

revoke all on function public.cms_list_content(
  text,
  text,
  bigint,
  bigint,
  integer,
  integer
) from public, anon, authenticated, service_role;
revoke all on function public.cms_get_content(bigint)
  from public, anon, authenticated, service_role;
revoke all on function public.cms_get_revision(bigint, bigint)
  from public, anon, authenticated, service_role;
revoke all on function public.cms_create_content(
  text,
  jsonb,
  jsonb,
  text,
  text
) from public, anon, authenticated, service_role;
revoke all on function public.cms_save_draft(
  bigint,
  bigint,
  jsonb,
  jsonb,
  text,
  text
) from public, anon, authenticated, service_role;
revoke all on function public.cms_publish_content(bigint, bigint, text)
  from public, anon, authenticated, service_role;
revoke all on function public.cms_unpublish_content(bigint, text)
  from public, anon, authenticated, service_role;
revoke all on function public.cms_archive_content(bigint, text)
  from public, anon, authenticated, service_role;
revoke all on function public.cms_register_media(
  text,
  text,
  text,
  text,
  text,
  bigint,
  integer,
  integer,
  text,
  jsonb,
  text
) from public, anon, authenticated, service_role;
revoke all on function public.cms_archive_media(bigint, text)
  from public, anon, authenticated, service_role;
revoke all on function public.cms_operator_grant_admin(
  uuid,
  text,
  text,
  text,
  text
) from public, anon, authenticated, service_role;
revoke all on function public.cms_operator_revoke_admin(
  uuid,
  text,
  text,
  text
) from public, anon, authenticated, service_role;
revoke all on function public.cms_operator_set_local_mfa_requirement(
  boolean,
  text,
  text,
  text,
  text
) from public, anon, authenticated, service_role;

grant execute on function public.cms_list_content(
  text,
  text,
  bigint,
  bigint,
  integer,
  integer
) to authenticated;
grant execute on function public.cms_get_content(bigint)
  to authenticated;
grant execute on function public.cms_get_revision(bigint, bigint)
  to authenticated;
grant execute on function public.cms_create_content(
  text,
  jsonb,
  jsonb,
  text,
  text
) to authenticated;
grant execute on function public.cms_save_draft(
  bigint,
  bigint,
  jsonb,
  jsonb,
  text,
  text
) to authenticated;
grant execute on function public.cms_publish_content(bigint, bigint, text)
  to authenticated;
grant execute on function public.cms_unpublish_content(bigint, text)
  to authenticated;
grant execute on function public.cms_archive_content(bigint, text)
  to authenticated;
grant execute on function public.cms_register_media(
  text,
  text,
  text,
  text,
  text,
  bigint,
  integer,
  integer,
  text,
  jsonb,
  text
) to authenticated;
grant execute on function public.cms_archive_media(bigint, text)
  to authenticated;

grant execute on function public.cms_operator_grant_admin(
  uuid,
  text,
  text,
  text,
  text
) to service_role;
grant execute on function public.cms_operator_revoke_admin(
  uuid,
  text,
  text,
  text
) to service_role;
grant execute on function public.cms_operator_set_local_mfa_requirement(
  boolean,
  text,
  text,
  text,
  text
) to service_role;

-- ---------------------------------------------------------------------------
-- Immutable history/audit enforcement.
-- ---------------------------------------------------------------------------

-- Preserve historical actor UUIDs verbatim. The former ON DELETE SET NULL
-- foreign keys would rewrite immutable rows whenever an Auth identity is
-- removed.
alter table public.content_revisions
  drop constraint if exists content_revisions_created_by_fkey;
alter table private.audit_log
  drop constraint if exists audit_log_actor_user_id_fkey;

create or replace function private.reject_immutable_cms_history_mutation()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  raise exception '% is append-only', tg_table_name
    using errcode = '55000';
end
$function$;

revoke all on function private.reject_immutable_cms_history_mutation()
  from public, anon, authenticated;

drop trigger if exists reject_content_revision_mutation
  on public.content_revisions;
create trigger reject_content_revision_mutation
before update or delete on public.content_revisions
for each row execute function private.reject_immutable_cms_history_mutation();

drop trigger if exists reject_content_revision_media_mutation
  on public.content_revision_media;
create trigger reject_content_revision_media_mutation
before update or delete on public.content_revision_media
for each row execute function private.reject_immutable_cms_history_mutation();

drop trigger if exists reject_audit_log_mutation
  on private.audit_log;
create trigger reject_audit_log_mutation
before update or delete on private.audit_log
for each row execute function private.reject_immutable_cms_history_mutation();

comment on table private.content_channels is
  'Durable publication gates. News remains disabled until an explicit migration changes it.';
comment on table private.admin_security_settings is
  'Fail-closed administrative security settings. Hosted default requires AAL2.';
comment on table private.content_slug_claims is
  'Global live and pending CMS slug reservations.';
comment on column public.content_entries.working_revision_id is
  'Latest immutable editorial revision; independent from the public published pointer.';
comment on column public.content_revisions.schema_version is
  '0 identifies imported legacy arrays; 1 identifies validated SmartMed ContentDocument objects.';
comment on column public.content_revisions.editorial_snapshot is
  'Immutable versioned editorial metadata associated with this revision.';
comment on table public.content_revision_media is
  'Immutable media references extracted from a revision document and cover snapshot.';
comment on function public.cms_operator_set_local_mfa_requirement(
  boolean,
  text,
  text,
  text,
  text
) is
  'Service-only local operator control. Disabling MFA accepts exact local Supabase URLs only.';

commit;
