-- Consolidate newsletter functions: remove the old public implementations
-- and keep only the hardened private implementations with public wrappers.
-- Migration 20261008184732 created public.newsletter_* functions directly.
-- Migration 20261008185014 created private.newsletter_* with public wrappers.
-- The second migration's CREATE OR REPLACE should have overwritten the public functions,
-- but we explicitly drop and recreate to ensure clean state and correct permissions.

-- Drop the old public functions if they exist (from first migration)
drop function if exists public.newsletter_subscribe(text, text, text);
drop function if exists public.newsletter_confirm(text);
drop function if exists public.newsletter_unsubscribe(text);

-- Ensure private implementations exist (from hardening migration)
create or replace function private.newsletter_subscribe(p_email text, p_confirmation_token_hash text, p_unsubscribe_token_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if p_email is null or char_length(btrim(p_email)) > 254
     or lower(btrim(p_email)) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or p_confirmation_token_hash !~ '^[0-9a-f]{64}$'
     or p_unsubscribe_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid newsletter subscription' using errcode = '22023';
  end if;
  insert into public.newsletter_subscribers as existing (email, confirmation_token_hash, unsubscribe_token_hash)
  values (lower(btrim(p_email)), p_confirmation_token_hash, p_unsubscribe_token_hash)
  on conflict (lower(email)) do update set
    confirmation_token_hash = excluded.confirmation_token_hash,
    unsubscribe_token_hash = excluded.unsubscribe_token_hash,
    consented_at = now(), unsubscribed_at = null, updated_at = now()
  where existing.confirmed_at is null or existing.unsubscribed_at is not null
  returning id into v_id;
  return v_id is not null;
end;
$$;
revoke all on function private.newsletter_subscribe(text,text,text) from public, anon, authenticated, service_role;
grant usage on schema private to anon, authenticated;
grant execute on function private.newsletter_subscribe(text,text,text) to anon, authenticated;

create or replace function public.newsletter_subscribe(p_email text, p_confirmation_token_hash text, p_unsubscribe_token_hash text)
returns boolean language sql security invoker set search_path = '' as $$ select private.newsletter_subscribe(p_email,p_confirmation_token_hash,p_unsubscribe_token_hash); $$;
revoke all on function public.newsletter_subscribe(text,text,text) from public;
grant execute on function public.newsletter_subscribe(text,text,text) to anon, authenticated;

create or replace function private.newsletter_confirm(p_confirmation_token_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_confirmation_token_hash is null or p_confirmation_token_hash !~ '^[0-9a-f]{64}$' then return false; end if;
  update public.newsletter_subscribers set confirmed_at = now(), confirmation_token_hash = null, updated_at = now()
  where confirmation_token_hash = p_confirmation_token_hash and unsubscribed_at is null;
  return found;
end;
$$;
revoke all on function private.newsletter_confirm(text) from public, anon, authenticated, service_role;
grant execute on function private.newsletter_confirm(text) to anon, authenticated;

create or replace function public.newsletter_confirm(p_confirmation_token_hash text)
returns boolean language sql security invoker set search_path = '' as $$ select private.newsletter_confirm(p_confirmation_token_hash); $$;
revoke all on function public.newsletter_confirm(text) from public;
grant execute on function public.newsletter_confirm(text) to anon, authenticated;

create or replace function private.newsletter_unsubscribe(p_unsubscribe_token_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_unsubscribe_token_hash is null or p_unsubscribe_token_hash !~ '^[0-9a-f]{64}$' then return false; end if;
  update public.newsletter_subscribers set unsubscribed_at = now(), confirmation_token_hash = null, updated_at = now()
  where unsubscribe_token_hash = p_unsubscribe_token_hash and unsubscribed_at is null;
  return found;
end;
$$;
revoke all on function private.newsletter_unsubscribe(text) from public, anon, authenticated, service_role;
grant execute on function private.newsletter_unsubscribe(text) to anon, authenticated;

create or replace function public.newsletter_unsubscribe(p_unsubscribe_token_hash text)
returns boolean language sql security invoker set search_path = '' as $$ select private.newsletter_unsubscribe(p_unsubscribe_token_hash); $$;
revoke all on function public.newsletter_unsubscribe(text) from public;
grant execute on function public.newsletter_unsubscribe(text) to anon, authenticated;

notify pgrst, 'reload schema';