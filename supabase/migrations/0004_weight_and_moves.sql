-- Private weight log, plus yoga and walking as exercise kinds.

create table if not exists public.weight_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null,
  weight_kg numeric not null check (weight_kg > 0),
  created_at timestamptz not null default now()
);

create index if not exists weight_logs_user_day on public.weight_logs (user_id, day);
alter table public.weight_logs enable row level security;
create policy "own weight" on public.weight_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.exercise_logs drop constraint if exists exercise_logs_kind_check;
alter table public.exercise_logs add constraint exercise_logs_kind_check
  check (kind in ('weights', 'treadmill', 'dance', 'yoga', 'walk'));
