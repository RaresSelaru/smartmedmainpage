-- Draft entries have no published revision. In PostgreSQL, comparing a
-- revision ID with NULL yields NULL, but the admin RPC promises a boolean.
-- Normalize both history flags so new drafts can be opened immediately.

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
            'isWorking',
              coalesce(history.id = entry.working_revision_id, false),
            'isPublished',
              coalesce(history.id = entry.published_revision_id, false)
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

revoke all on function public.cms_get_content(bigint) from public;
grant execute on function public.cms_get_content(bigint) to authenticated;
