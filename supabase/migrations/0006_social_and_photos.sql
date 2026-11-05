-- Opt-in friends page and photo-scan limits.

alter table public.profiles add column if not exists share_social boolean not null default false;

-- What someone crossed off each day: goal keys only, never amounts, food or weight.
create table if not exists public.daily_wins (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null,
  done text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.daily_wins enable row level security;
create policy "own wins" on public.daily_wins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- The feed: only people who opted in, and only visible to people who opted in.
-- Exposes first name, doll, and latest crossed-off goals, nothing else.
create or replace function public.social_feed()
returns table (is_me boolean, name text, doll jsonb, day date, done text[])
language sql
stable
security definer
set search_path = ''
as $$
  select * from (
    select distinct on (p.id)
      p.id = auth.uid() as is_me,
      split_part(coalesce(p.display_name, 'friend'), ' ', 1) as name,
      p.doll,
      w.day,
      coalesce(w.done, '{}') as done
    from public.profiles p
    left join public.daily_wins w
      on w.user_id = p.id and w.day >= current_date - 1
    where p.share_social
      and exists (select 1 from public.profiles me where me.id = auth.uid() and me.share_social)
    order by p.id, w.day desc nulls last
  ) feed
  order by is_me desc, day desc nulls last
  limit 100;
$$;

revoke execute on function public.social_feed() from public, anon;
grant execute on function public.social_feed() to authenticated;

-- Per-person daily count for the food-photo function. Service role only.
create table if not exists public.photo_scans (
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  count int not null default 0,
  primary key (user_id, day)
);
alter table public.photo_scans enable row level security;
