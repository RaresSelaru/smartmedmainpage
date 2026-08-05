-- Only the newest lifecycle notification is deliverable. This prevents an
-- older confirmation from being sent after a quick rebooking or cancellation.

create or replace function public.claim_smartmed_evaluation_notification(
  p_public_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := (select auth.uid());
  outbox_row private.appointment_notification_outbox%rowtype;
  generated_claim_token uuid := gen_random_uuid();
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select outbox.*
  into outbox_row
  from private.appointment_notification_outbox as outbox
  join public.appointments as appointment
    on appointment.id = outbox.appointment_id
  where appointment.public_id = p_public_id
    and (
      appointment.user_id = current_user_id
      or private.is_admin()
    )
    and outbox.id = (
      select latest.id
      from private.appointment_notification_outbox as latest
      where latest.appointment_id = appointment.id
      order by latest.created_at desc, latest.id desc
      limit 1
    )
    and outbox.status in (
      'pending',
      'pending_configuration',
      'failed',
      'processing'
    )
    and outbox.attempt_count < 6
    and (
      outbox.status <> 'processing'
      or outbox.claimed_at < statement_timestamp() - interval '10 minutes'
    )
    and outbox.next_attempt_at <= statement_timestamp()
  for update of outbox skip locked
  limit 1;

  if not found then
    return jsonb_build_object('claimed', false);
  end if;

  update private.appointment_notification_outbox
  set
    status = 'processing',
    attempt_count = attempt_count + 1,
    claimed_by = current_user_id,
    claim_token = generated_claim_token,
    claimed_at = statement_timestamp(),
    last_error_code = null
  where id = outbox_row.id
  returning * into outbox_row;

  return jsonb_build_object(
    'claimed', true,
    'notificationId', outbox_row.id,
    'claimToken', generated_claim_token,
    'notificationType', outbox_row.notification_type,
    'idempotencyKey', outbox_row.idempotency_key,
    'recipientEmail', outbox_row.recipient_email,
    'payload', outbox_row.payload
  );
end
$function$;

revoke all on function public.claim_smartmed_evaluation_notification(uuid)
  from public, anon, authenticated;
grant execute on function public.claim_smartmed_evaluation_notification(uuid)
  to authenticated;
