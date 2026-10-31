-- Nutrient Journal schema. Run once in Supabase -> SQL Editor (or `supabase db push`).

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  age int,
  sex text check (sex in ('female', 'male', 'other')),
  height_cm numeric,
  weight_kg numeric,
  goal_weight_kg numeric,
  activity_level text not null default 'light'
    check (activity_level in ('sedentary', 'light', 'moderate', 'active')),
  units text not null default 'imperial' check (units in ('imperial', 'metric')),
  -- Optional manual overrides; null means "use the calculated value".
  calorie_goal int,
  protein_goal int,
  carbs_goal int,
  fat_goal int,
  water_goal_ml int,
  exercise_goal_min int not null default 30,
  doll jsonb not null default '{}'::jsonb,
  reminders_enabled boolean not null default false,
  reminder_start_hour int not null default 8,
  reminder_end_hour int not null default 21,
  reminder_every_min int not null default 120,
  timezone text not null default 'UTC',
  last_reminded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.food_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null,
  name text not null,
  amount_label text,
  calories numeric not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  source text,
  ink text,
  created_at timestamptz not null default now()
);

create table if not exists public.water_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null,
  amount_ml int not null check (amount_ml > 0),
  ink text,
  created_at timestamptz not null default now()
);

create table if not exists public.exercise_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null,
  kind text not null check (kind in ('weights', 'treadmill', 'dance')),
  minutes int not null check (minutes > 0),
  intensity text not null default 'moderate' check (intensity in ('easy', 'moderate', 'hard')),
  calories_burned int not null default 0,
  ink text,
  created_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists food_logs_user_day on public.food_logs (user_id, day);
create index if not exists water_logs_user_day on public.water_logs (user_id, day);
create index if not exists exercise_logs_user_day on public.exercise_logs (user_id, day);

-- Row level security: every row belongs to exactly one signed-in user.
alter table public.profiles enable row level security;
alter table public.food_logs enable row level security;
alter table public.water_logs enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own food" on public.food_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own water" on public.water_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own exercise" on public.exercise_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own subscriptions" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Create an empty profile the first time someone signs in.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
