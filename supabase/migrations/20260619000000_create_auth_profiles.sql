do $$
begin
  if not exists (select 1 from pg_type where typname = 'smartmed_role') then
    create type public.smartmed_role as enum ('user', 'premium', 'admin');
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  city text,
  exam_year text,
  school text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.account_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.smartmed_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_account_roles_updated_at on public.account_roles;
create trigger set_account_roles_updated_at
before update on public.account_roles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_smartmed_user()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''))
  on conflict (id) do nothing;

  insert into public.account_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_smartmed_profile on auth.users;
create trigger on_auth_user_created_create_smartmed_profile
after insert on auth.users
for each row execute function public.handle_new_smartmed_user();

alter table public.profiles enable row level security;
alter table public.account_roles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can read own role" on public.account_roles;
create policy "Users can read own role"
on public.account_roles
for select
to authenticated
using (auth.uid() = user_id);

grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.account_roles to authenticated;
