-- Run this entire file in the Supabase SQL editor.

alter table public.kitchen_members
  add column if not exists kitchen_alias text;

create or replace function public.next_kitchen_name(p_base_name text, p_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_base text := trim(p_base_name);
  v_candidate text := trim(p_base_name);
  v_suffix integer := 2;
begin
  while exists (
    select 1
    from public.kitchen_members member
    join public.kitchens kitchen on kitchen.id = member.kitchen_id
    where member.user_id = p_user_id
      and lower(coalesce(member.kitchen_alias, kitchen.name)) = lower(v_candidate)
  ) loop
    v_candidate := v_base || ' (' || v_suffix || ')';
    v_suffix := v_suffix + 1;
  end loop;
  return v_candidate;
end $$;

create or replace function public.create_kitchen(p_name text)
returns uuid language plpgsql security definer set search_path = public, auth
as $$
declare v_id uuid; v_email text; v_name text; v_requested_name text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  v_requested_name := trim(p_name);
  if char_length(v_requested_name) not between 1 and 80 then raise exception 'Kitchen name must be 1-80 characters'; end if;
  if public.next_kitchen_name(v_requested_name, auth.uid()) <> v_requested_name then
    raise exception 'You are already part of a kitchen with that name';
  end if;
  insert into public.kitchens(name, owner_id) values(v_requested_name, auth.uid()) returning id into v_id;
  select email, coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name') into v_email, v_name from auth.users where id=auth.uid();
  insert into public.kitchen_members(kitchen_id,user_id,email,display_name) values(v_id,auth.uid(),v_email,v_name);
  insert into public.user_kitchen_preferences(user_id,active_kitchen_id) values(auth.uid(),v_id)
    on conflict(user_id) do update set active_kitchen_id=excluded.active_kitchen_id, updated_at=now();
  return v_id;
end $$;

create or replace function public.accept_kitchen_invite(p_code_or_token text)
returns uuid language plpgsql security definer set search_path = public, auth
as $$
declare v_kitchen uuid; v_email text; v_name text; v_invite uuid; v_base_name text; v_effective_name text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select lower(email), coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name') into v_email,v_name from auth.users where id=auth.uid();
  select id,name into v_kitchen,v_base_name from public.kitchens where upper(join_code)=upper(trim(p_code_or_token)) and not is_personal;
  if v_kitchen is null then
    begin
      select invite.id,invite.kitchen_id,kitchen.name into v_invite,v_kitchen,v_base_name
      from public.kitchen_invites invite join public.kitchens kitchen on kitchen.id=invite.kitchen_id
      where invite.token=trim(p_code_or_token)::uuid and invite.accepted_at is null and lower(invite.email)=v_email;
    exception when invalid_text_representation then v_kitchen := null;
    end;
  end if;
  if v_kitchen is null then raise exception 'Invite is invalid, expired, or belongs to another email'; end if;
  v_effective_name := public.next_kitchen_name(v_base_name, auth.uid());
  insert into public.kitchen_members(kitchen_id,user_id,email,display_name,kitchen_alias)
    values(v_kitchen,auth.uid(),v_email,v_name,case when v_effective_name=v_base_name then null else v_effective_name end)
    on conflict do nothing;
  if v_invite is not null then update public.kitchen_invites set accepted_at=now() where id=v_invite; end if;
  insert into public.user_kitchen_preferences(user_id,active_kitchen_id) values(auth.uid(),v_kitchen)
    on conflict(user_id) do update set active_kitchen_id=excluded.active_kitchen_id,updated_at=now();
  return v_kitchen;
end $$;

create or replace function public.accept_kitchen_invitation(p_invite_id uuid)
returns uuid language plpgsql security definer set search_path = public, auth
as $$
declare v_kitchen uuid; v_email text; v_name text; v_base_name text; v_effective_name text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select lower(email), coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name')
    into v_email, v_name from auth.users where id = auth.uid();
  select invite.kitchen_id,kitchen.name into v_kitchen,v_base_name
    from public.kitchen_invites invite join public.kitchens kitchen on kitchen.id=invite.kitchen_id
    where invite.id=p_invite_id and lower(invite.email)=v_email and invite.accepted_at is null;
  if v_kitchen is null then raise exception 'Invitation not found or no longer available'; end if;
  v_effective_name := public.next_kitchen_name(v_base_name, auth.uid());
  insert into public.kitchen_members(kitchen_id,user_id,email,display_name,kitchen_alias)
    values(v_kitchen,auth.uid(),v_email,v_name,case when v_effective_name=v_base_name then null else v_effective_name end)
    on conflict do nothing;
  update public.kitchen_invites set accepted_at=now() where id=p_invite_id;
  insert into public.user_kitchen_preferences(user_id,active_kitchen_id) values(auth.uid(),v_kitchen)
    on conflict(user_id) do update set active_kitchen_id=excluded.active_kitchen_id,updated_at=now();
  return v_kitchen;
end $$;

revoke all on function public.next_kitchen_name(text, uuid) from public;
grant execute on function public.create_kitchen(text) to authenticated;
grant execute on function public.accept_kitchen_invite(text) to authenticated;
grant execute on function public.accept_kitchen_invitation(uuid) to authenticated;
