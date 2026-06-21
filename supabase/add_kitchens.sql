-- Run this entire file once in the Supabase SQL editor.
-- It is safe to run again: schema objects and policies are replaced idempotently.

create extension if not exists "pgcrypto";

create table if not exists public.kitchens (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  owner_id uuid not null references auth.users(id) on delete cascade,
  join_code text not null unique default upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 8)),
  is_personal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists kitchens_one_personal_per_user
  on public.kitchens(owner_id) where is_personal;

create table if not exists public.kitchen_members (
  kitchen_id uuid not null references public.kitchens(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  display_name text,
  joined_at timestamptz not null default now(),
  primary key (kitchen_id, user_id)
);

create table if not exists public.kitchen_invites (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid not null references public.kitchens(id) on delete cascade,
  email text not null,
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (kitchen_id, email)
);

create table if not exists public.user_kitchen_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active_kitchen_id uuid references public.kitchens(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.foods add column if not exists kitchen_id uuid references public.kitchens(id) on delete cascade;
alter table public.foods add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.recipes add column if not exists kitchen_id uuid references public.kitchens(id) on delete cascade;
alter table public.recipes add column if not exists created_by uuid references auth.users(id) on delete set null;

-- Kitchen content must survive if its original creator later deletes their account.
alter table public.foods drop constraint if exists foods_user_id_fkey;
alter table public.foods add constraint foods_user_id_fkey foreign key(user_id) references auth.users(id) on delete set null;
alter table public.recipes drop constraint if exists recipes_user_id_fkey;
alter table public.recipes add constraint recipes_user_id_fkey foreign key(user_id) references auth.users(id) on delete set null;

-- Give every existing account with content a personal kitchen and move its content into it.
insert into public.kitchens (name, owner_id, is_personal)
select 'My Kitchen', user_id, true from (
  select user_id from public.foods where user_id is not null
  union
  select user_id from public.recipes where user_id is not null
) users
on conflict (owner_id) where is_personal do nothing;

insert into public.kitchen_members (kitchen_id, user_id, email, display_name)
select k.id, k.owner_id, u.email, coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')
from public.kitchens k join auth.users u on u.id = k.owner_id
on conflict do nothing;

update public.foods f set kitchen_id = k.id, created_by = coalesce(f.created_by, f.user_id)
from public.kitchens k where f.kitchen_id is null and f.user_id = k.owner_id and k.is_personal;
update public.recipes r set kitchen_id = k.id, created_by = coalesce(r.created_by, r.user_id)
from public.kitchens k where r.kitchen_id is null and r.user_id = k.owner_id and k.is_personal;

drop index if exists public.foods_user_id_name_key;
drop index if exists public.foods_seed_name_key;
drop index if exists public.recipes_seed_name_key;
create unique index if not exists foods_kitchen_id_name_key on public.foods(kitchen_id, lower(name)) where kitchen_id is not null;

create or replace function public.is_kitchen_member(p_kitchen_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.kitchen_members where kitchen_id = p_kitchen_id and user_id = p_user_id) $$;

create or replace function public.is_kitchen_owner(p_kitchen_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.kitchens where id = p_kitchen_id and owner_id = p_user_id) $$;

create or replace function public.ensure_personal_kitchen()
returns uuid language plpgsql security definer set search_path = public, auth
as $$
declare v_id uuid; v_email text; v_name text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select id into v_id from public.kitchens where owner_id = auth.uid() and is_personal;
  if v_id is null then
    insert into public.kitchens(name, owner_id, is_personal) values ('My Kitchen', auth.uid(), true) returning id into v_id;
  end if;
  select email, coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name') into v_email, v_name
    from auth.users where id = auth.uid();
  insert into public.kitchen_members(kitchen_id, user_id, email, display_name)
    values(v_id, auth.uid(), v_email, v_name)
    on conflict(kitchen_id, user_id) do update set email=excluded.email, display_name=excluded.display_name
    where public.kitchen_members.email is distinct from excluded.email
       or public.kitchen_members.display_name is distinct from excluded.display_name;
  insert into public.user_kitchen_preferences(user_id, active_kitchen_id) values(auth.uid(), v_id)
    on conflict(user_id) do update set active_kitchen_id = coalesce(public.user_kitchen_preferences.active_kitchen_id, excluded.active_kitchen_id);
  return v_id;
end $$;

create or replace function public.create_kitchen(p_name text)
returns uuid language plpgsql security definer set search_path = public, auth
as $$
declare v_id uuid; v_email text; v_name text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if char_length(trim(p_name)) not between 1 and 80 then raise exception 'Kitchen name must be 1-80 characters'; end if;
  insert into public.kitchens(name, owner_id) values(trim(p_name), auth.uid()) returning id into v_id;
  select email, coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name') into v_email, v_name from auth.users where id=auth.uid();
  insert into public.kitchen_members(kitchen_id,user_id,email,display_name) values(v_id,auth.uid(),v_email,v_name);
  insert into public.user_kitchen_preferences(user_id,active_kitchen_id) values(auth.uid(),v_id)
    on conflict(user_id) do update set active_kitchen_id=excluded.active_kitchen_id, updated_at=now();
  return v_id;
end $$;

create or replace function public.create_kitchen_invite(p_kitchen_id uuid, p_email text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_token uuid;
begin
  if not public.is_kitchen_owner(p_kitchen_id) then raise exception 'Only the kitchen owner can invite people'; end if;
  if position('@' in trim(p_email)) < 2 then raise exception 'Enter a valid email address'; end if;
  insert into public.kitchen_invites(kitchen_id,email,invited_by)
    values(p_kitchen_id,lower(trim(p_email)),auth.uid())
    on conflict(kitchen_id,email) do update set token=gen_random_uuid(), invited_by=auth.uid(), created_at=now(), accepted_at=null
    returning token into v_token;
  return v_token;
end $$;

create or replace function public.accept_kitchen_invite(p_code_or_token text)
returns uuid language plpgsql security definer set search_path = public, auth
as $$
declare v_kitchen uuid; v_email text; v_name text; v_invite uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select lower(email), coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name') into v_email,v_name from auth.users where id=auth.uid();
  select id into v_kitchen from public.kitchens where upper(join_code)=upper(trim(p_code_or_token)) and not is_personal;
  if v_kitchen is null then
    begin
      select id,kitchen_id into v_invite,v_kitchen from public.kitchen_invites
      where token=trim(p_code_or_token)::uuid and accepted_at is null and lower(email)=v_email;
    exception when invalid_text_representation then v_kitchen := null;
    end;
  end if;
  if v_kitchen is null then raise exception 'Invite is invalid, expired, or belongs to another email'; end if;
  insert into public.kitchen_members(kitchen_id,user_id,email,display_name) values(v_kitchen,auth.uid(),v_email,v_name) on conflict do nothing;
  if v_invite is not null then update public.kitchen_invites set accepted_at=now() where id=v_invite; end if;
  insert into public.user_kitchen_preferences(user_id,active_kitchen_id) values(auth.uid(),v_kitchen)
    on conflict(user_id) do update set active_kitchen_id=excluded.active_kitchen_id,updated_at=now();
  return v_kitchen;
end $$;

create or replace function public.protect_kitchen_membership()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  if exists(select 1 from public.kitchens where id=old.kitchen_id and owner_id=old.user_id) then
    raise exception 'The kitchen owner cannot leave or be removed';
  end if;
  return old;
end $$;
drop trigger if exists protect_kitchen_membership_trigger on public.kitchen_members;
create trigger protect_kitchen_membership_trigger before delete on public.kitchen_members
for each row execute function public.protect_kitchen_membership();

alter table public.kitchens enable row level security;
alter table public.kitchen_members enable row level security;
alter table public.kitchen_invites enable row level security;
alter table public.user_kitchen_preferences enable row level security;

drop policy if exists "Members view kitchens" on public.kitchens;
drop policy if exists "Owners update kitchens" on public.kitchens;
create policy "Members view kitchens" on public.kitchens for select to authenticated using(public.is_kitchen_member(id));
create policy "Owners update kitchens" on public.kitchens for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());

drop policy if exists "Members view kitchen members" on public.kitchen_members;
drop policy if exists "Owners or self remove members" on public.kitchen_members;
create policy "Members view kitchen members" on public.kitchen_members for select to authenticated using(public.is_kitchen_member(kitchen_id));
create policy "Owners or self remove members" on public.kitchen_members for delete to authenticated
  using(public.is_kitchen_owner(kitchen_id) or user_id=auth.uid());

drop policy if exists "Owners view invites" on public.kitchen_invites;
drop policy if exists "Owners delete invites" on public.kitchen_invites;
create policy "Owners view invites" on public.kitchen_invites for select to authenticated using(public.is_kitchen_owner(kitchen_id));
create policy "Owners delete invites" on public.kitchen_invites for delete to authenticated using(public.is_kitchen_owner(kitchen_id));

drop policy if exists "Users manage kitchen preference" on public.user_kitchen_preferences;
create policy "Users manage kitchen preference" on public.user_kitchen_preferences for all to authenticated
  using(user_id=auth.uid()) with check(user_id=auth.uid() and public.is_kitchen_member(active_kitchen_id));

drop policy if exists "Users manage their foods" on public.foods;
drop policy if exists "Kitchen members manage foods" on public.foods;
create policy "Kitchen members manage foods" on public.foods for all to authenticated
  using(public.is_kitchen_member(kitchen_id)) with check(public.is_kitchen_member(kitchen_id));
drop policy if exists "Users manage their recipes" on public.recipes;
drop policy if exists "Kitchen members manage recipes" on public.recipes;
create policy "Kitchen members manage recipes" on public.recipes for all to authenticated
  using(public.is_kitchen_member(kitchen_id)) with check(public.is_kitchen_member(kitchen_id));

drop policy if exists "Users read their recipe ingredients" on public.recipe_ingredients;
drop policy if exists "Users insert their recipe ingredients" on public.recipe_ingredients;
drop policy if exists "Users update their recipe ingredients" on public.recipe_ingredients;
drop policy if exists "Users delete their recipe ingredients" on public.recipe_ingredients;
drop policy if exists "Kitchen members read recipe ingredients" on public.recipe_ingredients;
drop policy if exists "Kitchen members insert recipe ingredients" on public.recipe_ingredients;
drop policy if exists "Kitchen members update recipe ingredients" on public.recipe_ingredients;
drop policy if exists "Kitchen members delete recipe ingredients" on public.recipe_ingredients;
create policy "Kitchen members read recipe ingredients" on public.recipe_ingredients for select to authenticated using(
  exists(select 1 from public.recipes r where r.id=recipe_id and public.is_kitchen_member(r.kitchen_id)));
create policy "Kitchen members insert recipe ingredients" on public.recipe_ingredients for insert to authenticated with check(
  exists(select 1 from public.recipes r join public.foods f on f.id=food_id where r.id=recipe_id and r.kitchen_id=f.kitchen_id and public.is_kitchen_member(r.kitchen_id)));
create policy "Kitchen members update recipe ingredients" on public.recipe_ingredients for update to authenticated
  using(exists(select 1 from public.recipes r where r.id=recipe_id and public.is_kitchen_member(r.kitchen_id)))
  with check(exists(select 1 from public.recipes r join public.foods f on f.id=food_id where r.id=recipe_id and r.kitchen_id=f.kitchen_id and public.is_kitchen_member(r.kitchen_id)));
create policy "Kitchen members delete recipe ingredients" on public.recipe_ingredients for delete to authenticated using(
  exists(select 1 from public.recipes r where r.id=recipe_id and public.is_kitchen_member(r.kitchen_id)));

grant execute on function public.ensure_personal_kitchen() to authenticated;
grant execute on function public.create_kitchen(text) to authenticated;
grant execute on function public.create_kitchen_invite(uuid,text) to authenticated;
grant execute on function public.accept_kitchen_invite(text) to authenticated;

alter table public.foods replica identity full;
alter table public.recipes replica identity full;
alter table public.recipe_ingredients replica identity full;
alter table public.kitchens replica identity full;
alter table public.kitchen_members replica identity full;
alter table public.kitchen_invites replica identity full;

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='foods') then alter publication supabase_realtime add table public.foods; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='recipes') then alter publication supabase_realtime add table public.recipes; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='recipe_ingredients') then alter publication supabase_realtime add table public.recipe_ingredients; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='kitchens') then alter publication supabase_realtime add table public.kitchens; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='kitchen_members') then alter publication supabase_realtime add table public.kitchen_members; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='kitchen_invites') then alter publication supabase_realtime add table public.kitchen_invites; end if;
end $$;
