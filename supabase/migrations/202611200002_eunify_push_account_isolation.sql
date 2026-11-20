-- EUnify push account isolation: safely move the current browser endpoint to auth.uid().
-- Run once in the Supabase SQL Editor after migration 202611200001.
create or replace function public.register_eunify_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text
) returns void
language plpgsql security definer set search_path = public, auth
as $$
declare current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if coalesce(trim(p_endpoint), '') = '' or coalesce(trim(p_p256dh), '') = '' or coalesce(trim(p_auth), '') = '' then
    raise exception 'Invalid push subscription';
  end if;
  insert into public.eunify_push_subscriptions(user_id, endpoint, p256dh, auth, updated_at)
  values (current_user_id, p_endpoint, p_p256dh, p_auth, now())
  on conflict (endpoint) do update set
    user_id = excluded.user_id,
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    updated_at = now();
end;
$$;

create or replace function public.unregister_eunify_push_subscription(p_endpoint text)
returns void
language plpgsql security definer set search_path = public, auth
as $$
declare current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  delete from public.eunify_push_subscriptions
  where endpoint = p_endpoint and user_id = current_user_id;
end;
$$;

revoke all on function public.register_eunify_push_subscription(text, text, text) from public;
revoke all on function public.unregister_eunify_push_subscription(text) from public;
grant execute on function public.register_eunify_push_subscription(text, text, text) to authenticated;
grant execute on function public.unregister_eunify_push_subscription(text) to authenticated;
