-- Add the six current SmartMed centre-enrolment plans while retaining the
-- three historical slugs for existing links, leads, and notification payloads.

begin;

insert into public.access_plans (
  slug,
  name,
  description,
  status,
  metadata
)
values
  (
    'esential-1-materie',
    'Esențial · 1 materie',
    'Pregătire SmartMed Esențial pentru o singură materie.',
    'active',
    '{
      "centerEnrollment": true,
      "displayOrder": 4,
      "planTier": "essential",
      "subjectCount": 1
    }'::jsonb
  ),
  (
    'esential-2-materii',
    'Esențial · 2 materii',
    'Pregătire SmartMed Esențial pentru două materii.',
    'active',
    '{
      "centerEnrollment": true,
      "displayOrder": 5,
      "planTier": "essential",
      "subjectCount": 2
    }'::jsonb
  ),
  (
    'avansat-1-materie',
    'Avansat · 1 materie',
    'Pregătire SmartMed Avansat pentru o singură materie.',
    'active',
    '{
      "centerEnrollment": true,
      "displayOrder": 6,
      "planTier": "advanced",
      "subjectCount": 1
    }'::jsonb
  ),
  (
    'avansat-2-materii',
    'Avansat · 2 materii',
    'Pregătire SmartMed Avansat pentru două materii.',
    'active',
    '{
      "centerEnrollment": true,
      "displayOrder": 7,
      "planTier": "advanced",
      "subjectCount": 2
    }'::jsonb
  ),
  (
    'performanta-1-materie',
    'Performanță · 1 materie',
    'Pregătire SmartMed Performanță pentru o singură materie.',
    'active',
    '{
      "centerEnrollment": true,
      "displayOrder": 8,
      "planTier": "performance",
      "subjectCount": 1
    }'::jsonb
  ),
  (
    'performanta-2-materii',
    'Performanță · 2 materii',
    'Pregătire SmartMed Performanță pentru două materii.',
    'active',
    '{
      "centerEnrollment": true,
      "displayOrder": 9,
      "planTier": "performance",
      "subjectCount": 2
    }'::jsonb
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  status = excluded.status,
  metadata = public.access_plans.metadata || excluded.metadata,
  updated_at = statement_timestamp();

create or replace function public.submit_center_enrollment_server(
  p_authenticated_user_id uuid,
  p_selected_plan_slug text,
  p_idempotency_key uuid,
  p_participant_status text,
  p_full_name text,
  p_birth_date date,
  p_locality_county text,
  p_phone text,
  p_email text,
  p_high_school text,
  p_study_profile text,
  p_guardian_name text,
  p_guardian_phone text,
  p_guardian_email text,
  p_exam_year smallint,
  p_current_grade text,
  p_target_university text,
  p_target_university_other text,
  p_previous_tutoring boolean,
  p_subjects text[],
  p_delivery_mode text,
  p_biology_level text,
  p_chemistry_level text,
  p_whatsapp_opt_in boolean,
  p_preparation_types text[],
  p_privacy_accepted boolean,
  p_source_context text,
  p_context jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  effective_user_id uuid := private.registration_user_for_email(
    p_authenticated_user_id,
    p_email
  );
  enrollment public.center_enrollments%rowtype;
  normalized_plan_slug text := lower(btrim(coalesce(p_selected_plan_slug, '')));
  result jsonb;
  selected_plan public.access_plans%rowtype;
begin
  select plan.*
  into selected_plan
  from public.access_plans as plan
  where plan.slug = normalized_plan_slug
    and plan.slug in (
      'online-esential',
      'centru-plus',
      'module-signature',
      'esential-1-materie',
      'esential-2-materii',
      'avansat-1-materie',
      'avansat-2-materii',
      'performanta-1-materie',
      'performanta-2-materii'
    )
    and plan.status = 'active'
    and plan.metadata @> '{"centerEnrollment": true}'::jsonb
  for share;

  if not found then
    raise exception 'INVALID_CENTER_ENROLLMENT_PLAN' using errcode = '22023';
  end if;

  result := public.submit_center_enrollment(
    p_idempotency_key,
    p_participant_status,
    p_full_name,
    p_birth_date,
    p_locality_county,
    p_phone,
    p_email,
    p_high_school,
    p_study_profile,
    p_guardian_name,
    p_guardian_phone,
    p_guardian_email,
    p_exam_year,
    p_current_grade,
    p_target_university,
    p_target_university_other,
    p_previous_tutoring,
    p_subjects,
    p_delivery_mode,
    p_biology_level,
    p_chemistry_level,
    p_whatsapp_opt_in,
    p_preparation_types,
    p_privacy_accepted,
    p_source_context,
    p_context
  );

  select candidate.*
  into enrollment
  from public.center_enrollments as candidate
  where candidate.idempotency_key = p_idempotency_key
  for update;

  if not found then
    raise exception 'CENTER_ENROLLMENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if enrollment.normalized_email <> lower(btrim(coalesce(p_email, ''))) then
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '22023';
  end if;
  if enrollment.selected_access_plan_id is not null
    and enrollment.selected_access_plan_id <> selected_plan.id
  then
    raise exception 'IDEMPOTENCY_PLAN_CONFLICT' using errcode = '22023';
  end if;

  update public.center_enrollments
  set
    selected_access_plan_id = selected_plan.id,
    user_id = coalesce(effective_user_id, user_id)
  where id = enrollment.id
  returning * into enrollment;

  update private.center_enrollment_notification_outbox
  set payload = private.center_enrollment_payload(enrollment)
  where enrollment_id = enrollment.id
    and sent_at is null;

  return result;
end
$function$;

revoke all on function public.submit_center_enrollment_server(
  uuid, text, uuid, text, text, date, text, text, text, text, text, text,
  text, text, smallint, text, text, text, boolean, text[], text, text, text,
  boolean, text[], boolean, text, jsonb
) from public, anon, authenticated, service_role;

grant execute on function public.submit_center_enrollment_server(
  uuid, text, uuid, text, text, date, text, text, text, text, text, text,
  text, text, smallint, text, text, text, boolean, text[], text, text, text,
  boolean, text[], boolean, text, jsonb
) to service_role;

comment on function public.submit_center_enrollment_server(
  uuid, text, uuid, text, text, date, text, text, text, text, text, text,
  text, text, smallint, text, text, text, boolean, text[], text, text, text,
  boolean, text[], boolean, text, jsonb
) is 'Service-only centre enrolment command. It validates an active SmartMed enrolment plan and binds it immutably to the lead.';

commit;
