-- Fixes from the Supabase security advisor.
-- The sign-up trigger function should only ever run as a trigger.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
-- Keep pg_net out of the public schema (its functions still live in the `net` schema).
drop extension if exists pg_net;
create extension pg_net schema extensions;
