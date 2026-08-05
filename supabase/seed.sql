-- SmartMed local seed hook.
--
-- Initial editorial content is migration-owned so it is deterministic on every
-- environment. Administrative identities and the local-only MFA exception are
-- intentionally provisioned by the guarded operator CLI, never by seed data.
-- This file must remain free of credentials and hosted-project mutations.

do $seed$
begin
  if not exists (
    select 1
    from private.content_channels
    where content_kind = 'article'
      and public_enabled
      and public_path = '/blog'
  ) then
    raise exception 'SmartMed Blog channel configuration is missing';
  end if;

  if not exists (
    select 1
    from private.content_channels
    where content_kind = 'news'
      and not public_enabled
      and public_path is null
  ) then
    raise exception 'SmartMed News channel must remain private';
  end if;
end
$seed$;

-- Local-only evaluation availability. Hosted environments receive the booking
-- model through migrations, while administrators publish their real calendar
-- from the SmartMed admin area. These rolling slots keep local QA immediately
-- usable after every `supabase db reset` without pretending to be production
-- availability.
with evaluation_config as (
  select
    appointment_type.id as appointment_type_id,
    staff.id as staff_member_id
  from public.appointment_types as appointment_type
  cross join public.staff_members as staff
  where appointment_type.slug = 'evaluare-initiala-smartmed'
    and staff.slug = 'echipa-evaluare-smartmed'
),
evaluation_dates as (
  select day::date as slot_date
  from generate_series(
    current_date + 1,
    current_date + 28,
    interval '1 day'
  ) as day
  where extract(isodow from day) in (2, 4, 6)
),
evaluation_times as (
  select
    slot_date,
    slot_time
  from evaluation_dates
  cross join lateral (
    select unnest(
      case
        when extract(isodow from slot_date) = 6
          then array['10:00'::time, '11:30'::time]
        else array['16:30'::time, '18:00'::time]
      end
    ) as slot_time
  ) as available_times
),
evaluation_locations as (
  select id, kind, name
  from public.locations
  where slug in (
    'evaluare-smartmed-online',
    'evaluare-smartmed-centru'
  )
),
evaluation_slots as (
  select
    config.appointment_type_id,
    config.staff_member_id,
    location.id as location_id,
    (
      evaluation_time.slot_date + evaluation_time.slot_time
    ) at time zone 'Europe/Bucharest'
      + case when location.kind = 'center' then interval '30 minutes' else interval '0 minutes' end
      as starts_at,
    (
      evaluation_time.slot_date + evaluation_time.slot_time
    ) at time zone 'Europe/Bucharest'
      + case when location.kind = 'center' then interval '60 minutes' else interval '30 minutes' end
      as ends_at,
    case
      when location.kind = 'online' then 'Evaluare online'
      else 'Evaluare la centrul SmartMed'
    end as public_label
  from evaluation_config as config
  cross join evaluation_times as evaluation_time
  cross join evaluation_locations as location
)
insert into public.availability_exceptions (
  staff_member_id,
  appointment_type_id,
  location_id,
  kind,
  starts_at,
  ends_at,
  capacity,
  public_label,
  is_public
)
select
  staff_member_id,
  appointment_type_id,
  location_id,
  'available',
  starts_at,
  ends_at,
  8,
  public_label,
  true
from evaluation_slots
where starts_at > statement_timestamp() + interval '3 hours'
on conflict do nothing;
