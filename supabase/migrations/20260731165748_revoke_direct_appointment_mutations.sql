-- Appointments are mutated exclusively through the narrow, ownership-aware
-- booking RPCs. RLS remains defense in depth, but write privileges are removed
-- as well so clients cannot even attempt to forge identity, staff, or status.

revoke insert, update, delete on table public.appointments
  from public, anon, authenticated;
