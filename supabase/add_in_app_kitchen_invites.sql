-- Run this entire file in the Supabase SQL editor after add_kitchens.sql.

create or replace function public.get_pending_kitchen_invites()
returns table(id uuid, kitchen_id uuid, kitchen_name text, invited_by uuid, created_at timestamptz)
language sql stable security definer set search_path = public, auth
as $$
  select i.id, i.kitchen_id, k.name, i.invited_by, i.created_at
  from public.kitchen_invites i
  join public.kitchens k on k.id = i.kitchen_id
  where lower(i.email) = lower(coalesce(auth.jwt()->>'email', ''))
    and i.accepted_at is null
  order by i.created_at desc
$$;

create or replace function public.accept_kitchen_invitation(p_invite_id uuid)
returns uuid language plpgsql security definer set search_path = public, auth
as $$
declare v_kitchen uuid; v_email text; v_name text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select lower(email), coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name')
    into v_email, v_name from auth.users where id = auth.uid();
  select kitchen_id into v_kitchen from public.kitchen_invites
    where id = p_invite_id and lower(email) = v_email and accepted_at is null;
  if v_kitchen is null then raise exception 'Invitation not found or no longer available'; end if;
  insert into public.kitchen_members(kitchen_id,user_id,email,display_name)
    values(v_kitchen,auth.uid(),v_email,v_name) on conflict do nothing;
  update public.kitchen_invites set accepted_at=now() where id=p_invite_id;
  insert into public.user_kitchen_preferences(user_id,active_kitchen_id) values(auth.uid(),v_kitchen)
    on conflict(user_id) do update set active_kitchen_id=excluded.active_kitchen_id,updated_at=now();
  return v_kitchen;
end $$;

create or replace function public.decline_kitchen_invitation(p_invite_id uuid)
returns void language plpgsql security definer set search_path = public, auth
as $$
declare v_email text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select lower(email) into v_email from auth.users where id=auth.uid();
  delete from public.kitchen_invites where id=p_invite_id and lower(email)=v_email and accepted_at is null;
  if not found then raise exception 'Invitation not found or no longer available'; end if;
end $$;

revoke all on function public.get_pending_kitchen_invites() from public;
revoke all on function public.accept_kitchen_invitation(uuid) from public;
revoke all on function public.decline_kitchen_invitation(uuid) from public;
grant execute on function public.get_pending_kitchen_invites() to authenticated;
grant execute on function public.accept_kitchen_invitation(uuid) to authenticated;
grant execute on function public.decline_kitchen_invitation(uuid) to authenticated;

drop policy if exists "Invitees view their invitations" on public.kitchen_invites;
create policy "Invitees view their invitations" on public.kitchen_invites for select to authenticated
  using(lower(email)=lower(coalesce(auth.jwt()->>'email','')));
