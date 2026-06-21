-- Run this entire file in the Supabase SQL editor.

create or replace function public.delete_kitchen(
  p_kitchen_id uuid,
  p_confirmation_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kitchen public.kitchens%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;

  select * into v_kitchen
  from public.kitchens
  where id = p_kitchen_id;

  if not found then
    raise exception 'Kitchen not found';
  end if;

  if v_kitchen.owner_id <> auth.uid() then
    raise exception 'Only the kitchen owner can delete this kitchen';
  end if;

  if v_kitchen.is_personal then
    raise exception 'My Kitchen cannot be deleted';
  end if;

  if p_confirmation_name is distinct from v_kitchen.name then
    raise exception 'Kitchen name does not match';
  end if;

  -- Remove ingredient links first because foods use an ON DELETE RESTRICT
  -- relationship while recipes use ON DELETE CASCADE.
  delete from public.recipe_ingredients
  where recipe_id in (select id from public.recipes where kitchen_id = p_kitchen_id)
     or food_id in (select id from public.foods where kitchen_id = p_kitchen_id);

  -- Allow the owner membership to be removed only as part of this verified,
  -- owner-initiated kitchen deletion.
  perform set_config('app.deleting_kitchen_id', p_kitchen_id::text, true);
  delete from public.kitchens where id = p_kitchen_id;
end;
$$;

create or replace function public.protect_kitchen_membership()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  if current_setting('app.deleting_kitchen_id', true) = old.kitchen_id::text then
    return old;
  end if;
  if exists(select 1 from public.kitchens where id=old.kitchen_id and owner_id=old.user_id) then
    raise exception 'The kitchen owner cannot leave or be removed';
  end if;
  return old;
end $$;

revoke all on function public.delete_kitchen(uuid, text) from public;
grant execute on function public.delete_kitchen(uuid, text) to authenticated;
