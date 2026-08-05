begin;

alter table public.profiles
  add column target_exam_year smallint;

update public.profiles
set target_exam_year = exam_year::smallint
where target_exam_plan = 'scheduled'
  and exam_year ~ '^[0-9]{4}$'
  and exam_year::integer between 2026 and 2045;

alter table public.profiles
  drop constraint profiles_target_exam_plan_consistent,
  add constraint profiles_target_exam_plan_consistent check (
    (
      target_exam_plan is null
      and target_exam_year is null
    )
    or (
      target_exam_plan = 'scheduled'
      and target_exam_year between 2026 and 2045
    )
    or (
      target_exam_plan in ('later', 'exploring')
      and target_exam_year is null
    )
  );

comment on column public.profiles.target_exam_year is
  'Optional admission target year from onboarding, separate from the legacy academic year field.';

commit;
