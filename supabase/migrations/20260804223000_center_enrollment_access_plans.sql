-- Bind every new centre enrolment to one of the three active SmartMed plans.
-- Existing enrolments remain nullable because there is no trustworthy plan to
-- infer for leads collected before the plan-selection flow was introduced.

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
    'online-esential',
    'Online Esențial',
    'Cursuri online SmartMed și acces la platforma digitală.',
    'active',
    '{
      "centerEnrollment": true,
      "displayOrder": 1,
      "deliveryMode": "online",
      "includes": ["Cursuri online", "Platformă online"],
      "excludes": ["Pregătire la centru", "Module speciale incluse"]
    }'::jsonb
  ),
  (
    'centru-plus',
    'Centru Plus',
    'Pregătire la Centrul SmartMed, completată de module speciale selectate.',
    'active',
    '{
      "centerEnrollment": true,
      "displayOrder": 2,
      "deliveryMode": "in_person",
      "includes": ["Pregătire la centru", "Module speciale selectate"],
      "excludes": []
    }'::jsonb
  ),
  (
    'module-signature',
    'Module Signature',
    'Parcurs concentrat exclusiv pe modulele speciale SmartMed.',
    'active',
    '{
      "centerEnrollment": true,
      "displayOrder": 3,
      "deliveryMode": "modules_only",
      "includes": ["Module speciale SmartMed"],
      "excludes": ["Cursuri standard"]
    }'::jsonb
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  status = excluded.status,
  metadata = public.access_plans.metadata || excluded.metadata,
  updated_at = statement_timestamp();

alter table public.center_enrollments
  add column if not exists selected_access_plan_id bigint;

do $migration$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.center_enrollments'::regclass
      and conname = 'center_enrollments_selected_access_plan_id_fkey'
  ) then
    alter table public.center_enrollments
      add constraint center_enrollments_selected_access_plan_id_fkey
      foreign key (selected_access_plan_id)
      references public.access_plans(id)
      on delete restrict;
  end if;
end
$migration$;

comment on column public.center_enrollments.selected_access_plan_id is
  'Required by the service command for new enrolments; nullable only for records created before plan selection existed.';

create index if not exists center_enrollments_selected_plan_created_idx
  on public.center_enrollments (selected_access_plan_id, created_at desc, id desc)
  where selected_access_plan_id is not null;

create or replace function private.center_enrollment_payload(
  enrollment public.center_enrollments
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  select jsonb_build_object(
    'publicId', enrollment.public_id,
    'participantStatus', enrollment.participant_status,
    'fullName', enrollment.full_name,
    'birthDate', enrollment.birth_date,
    'localityCounty', enrollment.locality_county,
    'phone', enrollment.phone,
    'email', enrollment.normalized_email,
    'highSchool', enrollment.high_school,
    'studyProfile', enrollment.study_profile,
    'guardianName', enrollment.guardian_name,
    'guardianPhone', enrollment.guardian_phone,
    'guardianEmail', enrollment.guardian_email,
    'examYear', enrollment.exam_year,
    'currentGrade', enrollment.current_grade,
    'targetUniversity', enrollment.target_university,
    'targetUniversityOther', enrollment.target_university_other,
    'previousTutoring', enrollment.previous_tutoring,
    'subjects', to_jsonb(enrollment.subjects),
    'deliveryMode', enrollment.delivery_mode,
    'biologyLevel', enrollment.biology_level,
    'chemistryLevel', enrollment.chemistry_level,
    'whatsappOptIn', enrollment.whatsapp_opt_in,
    'preparationTypes', to_jsonb(enrollment.preparation_types),
    'selectedPlanSlug', (
      select plan.slug
      from public.access_plans as plan
      where plan.id = enrollment.selected_access_plan_id
    ),
    'selectedPlanName', (
      select plan.name
      from public.access_plans as plan
      where plan.id = enrollment.selected_access_plan_id
    ),
    'sourceContext', enrollment.source_context,
    'createdAt', enrollment.created_at
  )
$function$;

drop function if exists public.submit_center_enrollment_server(
  uuid, uuid, text, text, date, text, text, text, text, text, text, text,
  text, smallint, text, text, text, boolean, text[], text, text, text,
  boolean, text[], boolean, text, jsonb
);

create function public.submit_center_enrollment_server(
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
    and plan.slug in ('online-esential', 'centru-plus', 'module-signature')
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
