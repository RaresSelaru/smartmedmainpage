begin;

set local search_path = public, extensions;

select no_plan();

select has_table(
  'private',
  'content_channels',
  'private content channel registry exists'
);
select has_table(
  'private',
  'admin_security_settings',
  'private admin security settings exist'
);
select has_table(
  'private',
  'content_slug_claims',
  'private slug claims exist'
);
select has_table(
  'public',
  'content_revision_media',
  'revision media relation exists'
);

select has_column(
  'public',
  'content_entries',
  'working_revision_id',
  'content entries have an independent working pointer'
);
select has_column(
  'public',
  'content_revisions',
  'schema_version',
  'content revisions have a schema version'
);
select has_column(
  'public',
  'content_revisions',
  'editorial_snapshot',
  'content revisions have an editorial snapshot'
);
select has_column(
  'private',
  'audit_log',
  'correlation_id',
  'audit log has a correlation identifier'
);
select has_column(
  'private',
  'audit_log',
  'context',
  'audit log has structured context'
);

select ok(
  (
    select relation.relrowsecurity
    from pg_class as relation
    where relation.oid = 'public.content_revision_media'::regclass
  ),
  'revision media has RLS enabled'
);

select results_eq(
  $$
    select public_enabled, public_path
    from private.content_channels
    where content_kind = 'article'
  $$,
  $$ values (true, '/blog'::text) $$,
  'Blog is the enabled public channel'
);

select results_eq(
  $$
    select public_enabled, public_path
    from private.content_channels
    where content_kind = 'news'
  $$,
  $$ values (false, null::text) $$,
  'News is durably disabled'
);

select is(
  (
    select require_mfa
    from private.admin_security_settings
    where singleton
  ),
  true,
  'MFA fails closed by default'
);

select is(
  (
    select count(*)
    from public.content_entries as entry
    where exists (
      select 1
      from public.content_revisions as revision
      where revision.content_entry_id = entry.id
    )
      and entry.working_revision_id is null
  ),
  0::bigint,
  'existing entries with revisions have a working pointer'
);

select is(
  (
    select count(*)
    from public.content_revisions
    where schema_version = 0
      and jsonb_typeof(body) <> 'array'
  ),
  0::bigint,
  'legacy version zero rows remain arrays'
);

select is(
  (
    select count(*)
    from public.content_revisions
    where editorial_snapshot ->> 'version' <> '1'
  ),
  0::bigint,
  'all revisions have a versioned editorial snapshot'
);

select is(
  (
    select count(*)
    from public.content_entries
    where kind = 'news'
      and status = 'published'
  ),
  0::bigint,
  'no News row is published'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'public.content_entries',
    'INSERT'
  ),
  'authenticated cannot insert content entries directly'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.content_entries',
    'UPDATE'
  ),
  'authenticated cannot update content entries directly'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.content_revisions',
    'INSERT'
  ),
  'authenticated cannot insert revisions directly'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.media_assets',
    'INSERT'
  ),
  'authenticated cannot register media directly'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.account_roles',
    'UPDATE'
  ),
  'authenticated cannot self-promote'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.cms_list_content(text,text,bigint,bigint,integer,integer)',
    'EXECUTE'
  ),
  'authenticated can execute the guarded CMS list RPC'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.cms_create_content(text,jsonb,jsonb,text,text)',
    'EXECUTE'
  ),
  'authenticated can execute the guarded CMS create RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.cms_create_content(text,jsonb,jsonb,text,text)',
    'EXECUTE'
  ),
  'anonymous callers cannot execute CMS mutations'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.cms_operator_grant_admin(uuid,text,text,text,text)',
    'EXECUTE'
  ),
  'service role can execute the operator grant RPC'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.cms_operator_grant_admin(uuid,text,text,text,text)',
    'EXECUTE'
  ),
  'authenticated callers cannot execute operator grants'
);

select results_eq(
  $$
    select public
    from storage.buckets
    where id = 'cms-media'
  $$,
  $$ values (false) $$,
  'CMS media bucket is private'
);

select ok(
  has_table_privilege('anon', 'storage.objects', 'SELECT'),
  'anonymous Storage reads reach RLS'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'smartmed_cms_media_read_public'
      and 'anon' = any (roles)
  ),
  'anonymous CMS media read policy exists'
);

select ok(
  has_column_privilege(
    'anon',
    'public.content_revisions',
    'schema_version',
    'SELECT'
  ),
  'anonymous published-revision reads include schema_version'
);

-- Trigger and append-only invariants use isolated rows that disappear with the
-- surrounding test transaction.
insert into public.content_entries (
  kind,
  slug,
  title,
  excerpt,
  status,
  visibility
)
values
  (
    'article',
    'cms-pgtap-article',
    'CMS pgTAP article',
    'Test article',
    'draft',
    'public'
  ),
  (
    'news',
    'cms-pgtap-news',
    'CMS pgTAP news',
    'Test News',
    'draft',
    'public'
  );

insert into public.content_revisions (
  content_entry_id,
  revision_no,
  body,
  schema_version,
  editorial_snapshot
)
select
  entry.id,
  1,
  '{"version":1,"blocks":[]}'::jsonb,
  1,
  jsonb_build_object(
    'version', 1,
    'title', entry.title,
    'slug', entry.slug,
    'excerpt', entry.excerpt,
    'authorId', null,
    'coverMediaId', null,
    'categoryIds', '[]'::jsonb,
    'tagIds', '[]'::jsonb,
    'seoTitle', null,
    'seoDescription', null,
    'publishedAt', null,
    'reviewer', null,
    'reviewDate', null,
    'disclaimer', null,
    'correctionNote', null,
    'relatedEntryIds', '[]'::jsonb
  )
from public.content_entries as entry
where entry.slug in ('cms-pgtap-article', 'cms-pgtap-news');

update public.content_entries as entry
set working_revision_id = revision.id
from public.content_revisions as revision
where revision.content_entry_id = entry.id
  and entry.slug in ('cms-pgtap-article', 'cms-pgtap-news');

select throws_ok(
  $$
    update public.content_entries
    set working_revision_id = (
      select revision.id
      from public.content_revisions as revision
      join public.content_entries as other_entry
        on other_entry.id = revision.content_entry_id
      where other_entry.slug = 'cms-pgtap-news'
    )
    where slug = 'cms-pgtap-article'
  $$,
  '23514',
  'working_revision_id must belong to the content entry',
  'a working pointer cannot cross entries'
);

select throws_ok(
  $$
    update public.content_entries as entry
    set
      status = 'published',
      published_at = statement_timestamp(),
      published_revision_id = revision.id
    from public.content_revisions as revision
    where entry.slug = 'cms-pgtap-news'
      and revision.content_entry_id = entry.id
  $$,
  '23514',
  'Publication is disabled for this content channel',
  'the database rejects News publication'
);

select throws_ok(
  $$
    update public.content_revisions
    set body = '{"version":1,"blocks":[]}'::jsonb
    where content_entry_id = (
      select id
      from public.content_entries
      where slug = 'cms-pgtap-article'
    )
  $$,
  '55000',
  'content_revisions is append-only',
  'revision history cannot be rewritten'
);

insert into private.audit_log (
  actor_type,
  action,
  entity_schema,
  entity_table,
  entity_id
)
values (
  'system',
  'cms.test',
  'public',
  'content_entries',
  'pgtap'
);

select throws_ok(
  $$
    update private.audit_log
    set action = 'cms.test.rewritten'
    where entity_id = 'pgtap'
  $$,
  '55000',
  'audit_log is append-only',
  'audit history cannot be rewritten'
);

-- Real Auth rows verify confirmed identity, role authority, AAL, and the local
-- setting without trusting user-editable metadata.
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'cms-admin-pgtap@example.invalid',
    '',
    statement_timestamp(),
    '{}'::jsonb,
    '{}'::jsonb,
    statement_timestamp(),
    statement_timestamp()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'cms-user-pgtap@example.invalid',
    '',
    statement_timestamp(),
    '{}'::jsonb,
    '{"role":"admin"}'::jsonb,
    statement_timestamp(),
    statement_timestamp()
  );

update public.account_roles
set role = 'admin'
where user_id = '10000000-0000-4000-8000-000000000001';

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);

select is(
  private.is_admin(),
  false,
  'AAL1 admin is denied while MFA is required'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);

select is(
  private.is_admin(),
  true,
  'confirmed database admin at AAL2 is authorized'
);

create or replace function pg_temp.cms_test_snapshot(
  test_slug text,
  test_title text,
  test_cover_media_id bigint default null
)
returns jsonb
language sql
as $$
  select jsonb_build_object(
    'version', 1,
    'title', test_title,
    'slug', test_slug,
    'excerpt', 'Conținut editorial pentru verificarea RPC-urilor CMS.',
    'authorId', null,
    'coverMediaId', test_cover_media_id,
    'categoryIds', '[]'::jsonb,
    'tagIds', '[]'::jsonb,
    'seoTitle', null,
    'seoDescription', null,
    'publishedAt', null,
    'reviewer', null,
    'reviewDate', null,
    'disclaimer', null,
    'correctionNote', null,
    'relatedEntryIds', '[]'::jsonb
  )
$$;

create or replace function pg_temp.cms_test_document(
  test_media_id bigint default null
)
returns jsonb
language sql
as $$
  select jsonb_build_object(
    'version',
    1,
    'blocks',
    jsonb_build_array(
      jsonb_build_object(
        'id', '20000000-0000-4000-8000-000000000001',
        'type', 'paragraph',
        'content', jsonb_build_array(
          jsonb_build_object(
            'type', 'text',
            'text', 'Document CMS valid.'
          )
        )
      ),
      jsonb_build_object(
        'id', '20000000-0000-4000-8000-000000000002',
        'type', 'list',
        'style', 'ordered',
        'items', jsonb_build_array(
          jsonb_build_object(
            'id', '20000000-0000-4000-8000-000000000003',
            'content', jsonb_build_array(
              jsonb_build_object(
                'type', 'text',
                'text', 'Element valid.'
              )
            )
          )
        )
      )
    ) || case
      when test_media_id is null then '[]'::jsonb
      else jsonb_build_array(
        jsonb_build_object(
          'id', '20000000-0000-4000-8000-000000000004',
          'type', 'image',
          'mediaId', test_media_id,
          'decorative', false,
          'alt', 'Imagine de test'
        )
      )
    end
  )
$$;

create or replace function pg_temp.cms_test_image_source_document(
  test_source text
)
returns jsonb
language sql
as $$
  select jsonb_build_object(
    'version',
    1,
    'blocks',
    jsonb_build_array(
      jsonb_build_object(
        'id', '20000000-0000-4000-8000-000000000005',
        'type', 'image',
        'mediaId', 1,
        'decorative', false,
        'alt', 'Imagine cu sursă editorială',
        'source', test_source
      )
    )
  )
$$;

select lives_ok(
  $$
    select private.validate_cms_document(
      pg_temp.cms_test_image_source_document(
        'https://example.com/' || repeat('a', 600)
      )
    )
  $$,
  'image source accepts a safe HTTPS URL beyond annotation length'
);

select throws_ok(
  $$
    select private.validate_cms_document(
      pg_temp.cms_test_image_source_document(
        'http://example.com/medical-image'
      )
    )
  $$,
  '22023',
  'Image source must be a safe HTTPS URL',
  'image source rejects non-HTTPS URLs'
);

select is(
  private.cms_href_is_safe('https://editor@example.com/source', false),
  false,
  'external URLs reject embedded credentials'
);

create temporary table cms_rpc_results (
  operation text primary key,
  result jsonb not null
) on commit drop;

insert into cms_rpc_results (operation, result)
select
  'blog-create',
  public.cms_create_content(
    'blog',
    pg_temp.cms_test_snapshot(
      'cms-pgtap-rpc-blog',
      'CMS pgTAP RPC Blog'
    ),
    pg_temp.cms_test_document(),
    'Creare prin test',
    'pgtap-blog-create'
  );

select ok(
  (
    select (result ->> 'entryId')::bigint > 0
      and (result ->> 'workingRevisionId')::bigint > 0
    from cms_rpc_results
    where operation = 'blog-create'
  ),
  'Blog create returns camelCase entry and working revision IDs'
);

select lives_ok(
  format(
    'select public.cms_get_content(%s)',
    (
      select result ->> 'entryId'
      from cms_rpc_results
      where operation = 'blog-create'
    )
  ),
  'admin can read the created CMS entry'
);

select lives_ok(
  $$
    select public.cms_list_content('blog', null, null, null, 1, 20)
  $$,
  'admin can list filtered CMS content'
);

insert into cms_rpc_results (operation, result)
select
  'blog-save',
  public.cms_save_draft(
    (created.result ->> 'entryId')::bigint,
    (created.result ->> 'workingRevisionId')::bigint,
    pg_temp.cms_test_snapshot(
      'cms-pgtap-rpc-blog-renamed',
      'CMS pgTAP RPC Blog actualizat'
    ),
    pg_temp.cms_test_document(),
    'Salvare optimistă',
    'pgtap-blog-save'
  )
from cms_rpc_results as created
where created.operation = 'blog-create';

select throws_ok(
  format(
    $sql$
      select public.cms_save_draft(
        %s,
        %s,
        pg_temp.cms_test_snapshot(
          'cms-pgtap-rpc-blog-conflict',
          'Conflict'
        ),
        pg_temp.cms_test_document(),
        'Conflict',
        'pgtap-conflict'
      )
    $sql$,
    (
      select result ->> 'entryId'
      from cms_rpc_results
      where operation = 'blog-create'
    ),
    (
      select result ->> 'workingRevisionId'
      from cms_rpc_results
      where operation = 'blog-create'
    )
  ),
  '40001',
  'The working revision changed',
  'stale working revisions cannot overwrite a newer save'
);

select lives_ok(
  format(
    'select public.cms_get_revision(%s, %s)',
    (
      select result ->> 'entryId'
      from cms_rpc_results
      where operation = 'blog-save'
    ),
    (
      select result ->> 'workingRevisionId'
      from cms_rpc_results
      where operation = 'blog-save'
    )
  ),
  'admin can preview an exact immutable revision'
);

insert into cms_rpc_results (operation, result)
select
  'blog-publish',
  public.cms_publish_content(
    (saved.result ->> 'entryId')::bigint,
    (saved.result ->> 'workingRevisionId')::bigint,
    'pgtap-blog-publish'
  )
from cms_rpc_results as saved
where saved.operation = 'blog-save';

select results_eq(
  $$
    select entry.status, entry.slug,
      entry.published_revision_id = entry.working_revision_id
    from public.content_entries as entry
    where entry.id = (
      select (result ->> 'entryId')::bigint
      from cms_rpc_results
      where operation = 'blog-publish'
    )
  $$,
  $$
    values ('published'::text, 'cms-pgtap-rpc-blog-renamed'::text, true)
  $$,
  'publish promotes the exact working snapshot and slug'
);

insert into cms_rpc_results (operation, result)
select
  'blog-published-rename-save',
  public.cms_save_draft(
    (published.result ->> 'entryId')::bigint,
    (published.result ->> 'workingRevisionId')::bigint,
    pg_temp.cms_test_snapshot(
      'cms-pgtap-rpc-blog-renamed-again',
      'CMS pgTAP RPC Blog redenumit după publicare'
    ),
    pg_temp.cms_test_document(),
    'Redenumire după publicare',
    'pgtap-blog-published-rename-save'
  )
from cms_rpc_results as published
where published.operation = 'blog-publish';

insert into cms_rpc_results (operation, result)
select
  'blog-published-rename-publish',
  public.cms_publish_content(
    (saved.result ->> 'entryId')::bigint,
    (saved.result ->> 'workingRevisionId')::bigint,
    'pgtap-blog-published-rename-publish'
  )
from cms_rpc_results as saved
where saved.operation = 'blog-published-rename-save';

select results_eq(
  $$
    select claim.slug, claim.is_live, claim.is_working
    from private.content_slug_claims as claim
    where claim.content_entry_id = (
      select (result ->> 'entryId')::bigint
      from cms_rpc_results
      where operation = 'blog-published-rename-publish'
    )
    order by claim.slug
  $$,
  $$
    values (
      'cms-pgtap-rpc-blog-renamed-again'::text,
      true,
      true
    )
  $$,
  'publishing a renamed live Blog atomically replaces its slug claim'
);

select lives_ok(
  format(
    'select public.cms_unpublish_content(%s, %L)',
    (
      select result ->> 'entryId'
      from cms_rpc_results
      where operation = 'blog-publish'
    ),
    'pgtap-blog-unpublish'
  ),
  'Blog can be unpublished atomically'
);

select lives_ok(
  format(
    'select public.cms_archive_content(%s, %L)',
    (
      select result ->> 'entryId'
      from cms_rpc_results
      where operation = 'blog-publish'
    ),
    'pgtap-blog-archive'
  ),
  'unpublished Blog can be archived'
);

insert into cms_rpc_results (operation, result)
select
  'news-create',
  public.cms_create_content(
    'news',
    pg_temp.cms_test_snapshot(
      'cms-pgtap-rpc-news',
      'CMS pgTAP RPC News'
    ),
    pg_temp.cms_test_document(),
    'News draft',
    'pgtap-news-create'
  );

select throws_ok(
  format(
    'select public.cms_publish_content(%s, %s, %L)',
    (
      select result ->> 'entryId'
      from cms_rpc_results
      where operation = 'news-create'
    ),
    (
      select result ->> 'workingRevisionId'
      from cms_rpc_results
      where operation = 'news-create'
    ),
    'pgtap-news-publish'
  ),
  '23514',
  'Publication is disabled for this content channel',
  'News RPC publication is rejected without changing state'
);

insert into storage.objects (bucket_id, name)
values (
  'cms-media',
  'cms/30000000-0000-4000-8000-000000000003/original.webp'
);

insert into cms_rpc_results (operation, result)
select
  'media-register',
  public.cms_register_media(
    'cms/30000000-0000-4000-8000-000000000003/original.webp',
    'Imagine pgTAP',
    'Imagine de test',
    null,
    'image/webp',
    1000,
    100,
    100,
    repeat('a', 64),
    jsonb_build_object(
      'version', 1,
      'credit', null,
      'decorative', false,
      'originalFileName', 'test.png',
      'originalFormat', 'png',
      'rights', null,
      'source', null,
      'variants', jsonb_build_array(
        jsonb_build_object(
          'key', 'original',
          'path',
            'cms/30000000-0000-4000-8000-000000000003/original.webp',
          'width', 100,
          'height', 100,
          'byteSize', 1000,
          'checksumSha256', repeat('a', 64)
        )
      )
    ),
    'pgtap-media-register'
  );

select ok(
  (
    select (result ->> 'mediaId')::bigint > 0
    from cms_rpc_results
    where operation = 'media-register'
  ),
  'media registration returns a camelCase mediaId'
);

insert into cms_rpc_results (operation, result)
select
  'media-blog-create',
  public.cms_create_content(
    'blog',
    pg_temp.cms_test_snapshot(
      'cms-pgtap-media-blog',
      'CMS pgTAP Media Blog',
      (media.result ->> 'mediaId')::bigint
    ),
    pg_temp.cms_test_document(
      (media.result ->> 'mediaId')::bigint
    ),
    'Media Blog',
    'pgtap-media-blog-create'
  )
from cms_rpc_results as media
where media.operation = 'media-register';

insert into cms_rpc_results (operation, result)
select
  'media-blog-publish',
  public.cms_publish_content(
    (created.result ->> 'entryId')::bigint,
    (created.result ->> 'workingRevisionId')::bigint,
    'pgtap-media-blog-publish'
  )
from cms_rpc_results as created
where created.operation = 'media-blog-create';

select is(
  private.can_read_public_cms_media_object(
    'cms-media',
    'cms/30000000-0000-4000-8000-000000000003/original.webp'
  ),
  true,
  'published Blog promotes its referenced media projection'
);

select lives_ok(
  format(
    'select public.cms_unpublish_content(%s, %L)',
    (
      select result ->> 'entryId'
      from cms_rpc_results
      where operation = 'media-blog-publish'
    ),
    'pgtap-media-blog-unpublish'
  ),
  'media Blog can be unpublished'
);

select is(
  private.can_read_public_cms_media_object(
    'cms-media',
    'cms/30000000-0000-4000-8000-000000000003/original.webp'
  ),
  false,
  'unpublish immediately withdraws CMS media access'
);

select throws_ok(
  format(
    'select public.cms_archive_media(%s, %L)',
    (
      select result ->> 'mediaId'
      from cms_rpc_results
      where operation = 'media-register'
    ),
    'pgtap-media-archive'
  ),
  '55000',
  'Referenced CMS media cannot be archived',
  'historically referenced media cannot be removed'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}',
  true
);

select is(
  private.is_admin(),
  false,
  'user metadata cannot self-promote an account'
);

update private.admin_security_settings
set require_mfa = false
where singleton;

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);

select is(
  private.is_admin(),
  true,
  'explicit local setting permits AAL1 admin'
);

update private.admin_security_settings
set require_mfa = true
where singleton;

select set_config(
  'request.jwt.claims',
  '{"role":"service_role","aal":"aal1"}',
  true
);

select lives_ok(
  $$
    select public.cms_operator_grant_admin(
      '10000000-0000-4000-8000-000000000002',
      'pgtap',
      'operator grant verification',
      'Operator Test',
      'pgtap-grant'
    )
  $$,
  'service operator can grant admin idempotently'
);

select results_eq(
  $$
    select role::text
    from public.account_roles
    where user_id = '10000000-0000-4000-8000-000000000002'
  $$,
  $$ values ('admin'::text) $$,
  'operator grant changes the authoritative database role'
);

select lives_ok(
  $$
    select public.cms_operator_revoke_admin(
      '10000000-0000-4000-8000-000000000002',
      'pgtap',
      'operator revoke verification',
      'pgtap-revoke'
    )
  $$,
  'service operator can revoke admin idempotently'
);

select results_eq(
  $$
    select role::text
    from public.account_roles
    where user_id = '10000000-0000-4000-8000-000000000002'
  $$,
  $$ values ('user'::text) $$,
  'operator revoke immediately restores the user role'
);

select throws_ok(
  $$
    select public.cms_operator_set_local_mfa_requirement(
      false,
      'https://example.supabase.co',
      'pgtap',
      'must fail outside local',
      'pgtap-mfa'
    )
  $$,
  '42501',
  'MFA bypass is restricted to exact local Supabase URLs',
  'MFA bypass rejects a hosted URL'
);

select * from finish();

rollback;
