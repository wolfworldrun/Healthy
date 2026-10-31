-- Reminder plumbing: secrets in Vault, service-only accessors, and a 15-minute cron.
-- The send-reminders function generates its own VAPID key pair on first run and stores it
-- with set_app_secret, so the private key never leaves the server.
-- project_url and cron_secret are created once (see the bottom of this file).

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.get_app_secrets()
returns table (name text, secret text)
language sql
security definer
set search_path = ''
as $$
  select s.name, s.decrypted_secret
  from vault.decrypted_secrets s
  where s.name in ('vapid_public_key', 'vapid_private_key', 'vapid_subject', 'cron_secret');
$$;

revoke execute on function public.get_app_secrets() from public, anon, authenticated;
grant execute on function public.get_app_secrets() to service_role;

create or replace function public.set_app_secret(p_name text, p_secret text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_name not in ('vapid_public_key', 'vapid_private_key') then
    raise exception 'secret % cannot be set this way', p_name;
  end if;
  if not exists (select 1 from vault.secrets where name = p_name) then
    perform vault.create_secret(p_secret, p_name);
  end if;
end;
$$;

revoke execute on function public.set_app_secret(text, text) from public, anon, authenticated;
grant execute on function public.set_app_secret(text, text) to service_role;

-- The public half is needed by the app to subscribe to push.
create or replace function public.get_vapid_public_key()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'vapid_public_key';
$$;

revoke execute on function public.get_vapid_public_key() from public, anon;
grant execute on function public.get_vapid_public_key() to authenticated;

select cron.schedule(
  'send-reminders',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- One-time setup (run once per project, not part of the schema):
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'cron_secret');
