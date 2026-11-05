-- Username + password accounts, alongside Google sign-in.

alter table public.profiles add column if not exists username text;

-- Usernames are stored lowercase. Google accounts simply leave this empty.
alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_.]{3,24}$');

create unique index if not exists profiles_username_key on public.profiles (username);

-- Failed sign-in counts for the username-auth function. RLS with no policies:
-- only the service role can touch this table.
create table if not exists public.login_attempts (
  key text primary key,
  failures int not null default 0,
  window_start timestamptz not null default now()
);
alter table public.login_attempts enable row level security;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, username)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'first_name'), ''),
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    nullif(lower(trim(new.raw_user_meta_data->>'username')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
