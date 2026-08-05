begin;

create or replace function private.clear_center_enrollment_email_error_on_delivery()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.state = 'sent'
    and old.state is distinct from new.state
    and not exists (
      select 1
      from private.center_enrollment_notification_outbox as pending
      where pending.enrollment_id = new.enrollment_id
        and pending.state <> 'sent'
    )
  then
    update public.center_enrollments
    set email_last_error = null
    where id = new.enrollment_id;
  end if;

  return new;
end;
$$;

revoke all on function private.clear_center_enrollment_email_error_on_delivery() from public;

drop trigger if exists clear_center_enrollment_email_error_on_delivery
  on private.center_enrollment_notification_outbox;

create trigger clear_center_enrollment_email_error_on_delivery
after update of state on private.center_enrollment_notification_outbox
for each row
execute function private.clear_center_enrollment_email_error_on_delivery();

create or replace function private.clear_event_registration_email_error_on_delivery()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.state = 'sent'
    and old.state is distinct from new.state
    and not exists (
      select 1
      from private.event_registration_notification_outbox as pending
      where pending.registration_id = new.registration_id
        and pending.batch_id = new.batch_id
        and pending.state <> 'sent'
    )
  then
    update public.event_registrations
    set email_last_error = null
    where id = new.registration_id;
  end if;

  return new;
end;
$$;

revoke all on function private.clear_event_registration_email_error_on_delivery() from public;

drop trigger if exists clear_event_registration_email_error_on_delivery
  on private.event_registration_notification_outbox;

create trigger clear_event_registration_email_error_on_delivery
after update of state on private.event_registration_notification_outbox
for each row
execute function private.clear_event_registration_email_error_on_delivery();

commit;
