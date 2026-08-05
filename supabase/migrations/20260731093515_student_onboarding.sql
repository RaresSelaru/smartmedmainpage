begin;

-- Onboarding is a personalisation layer, never an access-control signal.
-- Keeping the answers on the one-to-one profile makes them available to every
-- sign-in method while the existing profile ownership RLS continues to apply.
alter table public.profiles
  add column study_stage text,
  add column target_exam_plan text,
  add column target_medical_center text,
  add column focus_subjects text[] not null default '{}'::text[],
  add column study_challenges text[] not null default '{}'::text[],
  add column primary_learning_goal text,
  add column onboarding_version smallint not null default 1,
  add column onboarding_status text not null default 'not_started',
  add column onboarding_step smallint not null default 0,
  add column onboarding_started_at timestamptz,
  add column onboarding_completed_at timestamptz,
  add column onboarding_snoozed_until timestamptz,
  add constraint profiles_study_stage_valid check (
    study_stage is null
    or study_stage in (
      'high_school_9_10',
      'high_school_11',
      'high_school_12',
      'graduate',
      'exploring'
    )
  ),
  add constraint profiles_target_exam_plan_valid check (
    target_exam_plan is null
    or target_exam_plan in ('scheduled', 'later', 'exploring')
  ),
  add constraint profiles_target_exam_plan_consistent check (
    target_exam_plan is null
    or (
      target_exam_plan = 'scheduled'
      and case
        when exam_year ~ '^[0-9]{4}$'
          then exam_year::integer between 2026 and 2045
        else false
      end
    )
    or (
      target_exam_plan in ('later', 'exploring')
      and exam_year is null
    )
  ),
  add constraint profiles_target_medical_center_valid check (
    target_medical_center is null
    or target_medical_center in (
      'bucharest',
      'cluj',
      'iasi',
      'timisoara',
      'targu_mures',
      'craiova',
      'other',
      'exploring'
    )
  ),
  add constraint profiles_focus_subjects_valid check (
    cardinality(focus_subjects) between 0 and 3
    and focus_subjects <@ array[
      'biology',
      'chemistry',
      'physics',
      'undecided'
    ]::text[]
    and (
      not ('undecided' = any(focus_subjects))
      or cardinality(focus_subjects) = 1
    )
  ),
  add constraint profiles_study_challenges_valid check (
    cardinality(study_challenges) between 0 and 2
    and study_challenges <@ array[
      'starting',
      'retention',
      'trick_questions',
      'consistency',
      'exam_time',
      'confidence'
    ]::text[]
  ),
  add constraint profiles_primary_learning_goal_valid check (
    primary_learning_goal is null
    or primary_learning_goal in (
      'study_plan',
      'visual_explanations',
      'questions_feedback',
      'realistic_simulations',
      'consistency'
    )
  ),
  add constraint profiles_onboarding_version_valid check (
    onboarding_version between 1 and 100
  ),
  add constraint profiles_onboarding_status_valid check (
    onboarding_status in ('not_started', 'in_progress', 'completed')
  ),
  add constraint profiles_onboarding_step_valid check (
    onboarding_step between 0 and 6
  ),
  add constraint profiles_onboarding_state_consistent check (
    (
      onboarding_status = 'not_started'
      and onboarding_step = 0
      and onboarding_started_at is null
      and onboarding_completed_at is null
    )
    or (
      onboarding_status = 'in_progress'
      and onboarding_step between 1 and 6
      and onboarding_started_at is not null
      and onboarding_completed_at is null
    )
    or (
      onboarding_status = 'completed'
      and onboarding_step = 6
      and onboarding_started_at is not null
      and onboarding_completed_at is not null
      and onboarding_snoozed_until is null
    )
  ),
  add constraint profiles_onboarding_completion_has_answers check (
    onboarding_status <> 'completed'
    or (
      study_stage is not null
      and target_exam_plan is not null
      and target_medical_center is not null
      and cardinality(focus_subjects) >= 1
      and cardinality(study_challenges) >= 1
      and primary_learning_goal is not null
    )
  );

create index profiles_onboarding_status_updated_idx
on public.profiles (onboarding_status, updated_at desc);

comment on column public.profiles.study_stage is
  'Voluntary academic stage used only to personalise the SmartMed experience.';
comment on column public.profiles.onboarding_status is
  'Optional profile onboarding lifecycle; never use this value for authorisation.';
comment on column public.profiles.onboarding_snoozed_until is
  'User-controlled date before which the optional onboarding invitation stays hidden.';

commit;
