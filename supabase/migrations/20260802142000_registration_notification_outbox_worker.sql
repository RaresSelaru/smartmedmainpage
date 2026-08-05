-- Give the protected application worker a bounded list of due registration
-- notification targets. The function intentionally returns routing data only;
-- the existing per-registration claim RPCs remain authoritative and use
-- FOR UPDATE SKIP LOCKED before any email is sent.

begin;

create function public.list_registration_notification_retry_targets(
  p_limit integer default 12
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  targets jsonb;
begin
  if p_limit is null or p_limit < 1 or p_limit > 50 then
    raise exception 'INVALID_RETRY_TARGET_LIMIT' using errcode = '22023';
  end if;

  with due_targets as (
    select
      'center'::text as kind,
      min(
        case
          when notification.state = 'sending'
            then notification.claimed_at + interval '15 minutes'
          else notification.next_attempt_at
        end
      ) as due_at,
      enrollment.id::text as stable_id,
      enrollment.public_id,
      null::bigint as event_id,
      null::text as email
    from private.center_enrollment_notification_outbox as notification
    join public.center_enrollments as enrollment
      on enrollment.id = notification.enrollment_id
    where notification.attempt_count < 5
      and (
        (
          notification.state in ('pending', 'failed', 'pending_configuration')
          and notification.next_attempt_at <= statement_timestamp()
        )
        or (
          notification.state = 'sending'
          and notification.claimed_at
            < statement_timestamp() - interval '15 minutes'
        )
      )
    group by enrollment.id, enrollment.public_id

    union all

    select
      'event'::text as kind,
      min(
        case
          when notification.state = 'sending'
            then notification.claimed_at + interval '15 minutes'
          else notification.next_attempt_at
        end
      ) as due_at,
      registration.id::text as stable_id,
      null::uuid as public_id,
      registration.event_id,
      registration.normalized_email as email
    from private.event_registration_notification_outbox as notification
    join public.event_registrations as registration
      on registration.id = notification.registration_id
      and registration.notification_batch_id = notification.batch_id
    where notification.attempt_count < 5
      and (
        (
          notification.state in ('pending', 'failed', 'pending_configuration')
          and notification.next_attempt_at <= statement_timestamp()
        )
        or (
          notification.state = 'sending'
          and notification.claimed_at
            < statement_timestamp() - interval '15 minutes'
        )
      )
    group by
      registration.id,
      registration.event_id,
      registration.normalized_email
  ),
  selected_targets as (
    select candidate.*
    from due_targets as candidate
    order by candidate.due_at, candidate.kind, candidate.stable_id
    limit p_limit
  )
  select coalesce(
    jsonb_agg(
      case selected.kind
        when 'center' then jsonb_build_object(
          'kind', 'center',
          'publicId', selected.public_id
        )
        else jsonb_build_object(
          'kind', 'event',
          'eventId', selected.event_id,
          'email', selected.email
        )
      end
      order by selected.due_at, selected.kind, selected.stable_id
    ),
    '[]'::jsonb
  )
  into targets
  from selected_targets as selected;

  return jsonb_build_object('targets', targets);
end
$function$;

revoke all on function public.list_registration_notification_retry_targets(integer)
  from public, anon, authenticated, service_role;
grant execute on function public.list_registration_notification_retry_targets(integer)
  to service_role;

comment on function public.list_registration_notification_retry_targets(integer) is
  'Returns a bounded, oldest-first list of due centre and event notification targets to the service-role worker. Existing per-target RPCs perform the atomic claim.';

commit;
