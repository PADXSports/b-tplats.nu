create table if not exists public.profiles (
  id uuid references auth.users on delete cascade,
  role text default 'renter',
  full_name text,
  primary key (id)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('renter', 'owner'));
  end if;
end $$;
