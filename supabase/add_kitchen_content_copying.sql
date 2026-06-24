-- Run this entire file in the Supabase SQL editor.

alter table public.foods
  add column if not exists is_copied boolean not null default false,
  add column if not exists copied_from_food_id uuid references public.foods(id) on delete set null,
  add column if not exists copied_from_kitchen_id uuid references public.kitchens(id) on delete set null,
  add column if not exists copied_from_kitchen_name text;

alter table public.recipes
  add column if not exists is_copied boolean not null default false,
  add column if not exists copied_from_recipe_id uuid references public.recipes(id) on delete set null,
  add column if not exists copied_from_kitchen_id uuid references public.kitchens(id) on delete set null,
  add column if not exists copied_from_kitchen_name text;

create or replace function public.next_food_copy_name(p_kitchen_id uuid, p_base_name text)
returns text language plpgsql stable security definer set search_path=public
as $$
declare v_candidate text := trim(p_base_name); v_suffix integer := 2;
begin
  while exists(select 1 from public.foods where kitchen_id=p_kitchen_id and lower(name)=lower(v_candidate)) loop
    v_candidate := trim(p_base_name) || ' (' || v_suffix || ')';
    v_suffix := v_suffix + 1;
  end loop;
  return v_candidate;
end $$;

create or replace function public.next_recipe_copy_name(p_kitchen_id uuid, p_base_name text)
returns text language plpgsql stable security definer set search_path=public
as $$
declare v_candidate text := trim(p_base_name); v_suffix integer := 2;
begin
  while exists(select 1 from public.recipes where kitchen_id=p_kitchen_id and lower(name)=lower(v_candidate)) loop
    v_candidate := trim(p_base_name) || ' (' || v_suffix || ')';
    v_suffix := v_suffix + 1;
  end loop;
  return v_candidate;
end $$;

create or replace function public.copy_kitchen_content(
  p_source_kitchen_id uuid,
  p_target_kitchen_id uuid,
  p_food_ids uuid[] default array[]::uuid[],
  p_recipe_ids uuid[] default array[]::uuid[]
)
returns jsonb language plpgsql security definer set search_path=public,auth
as $$
declare
  v_source_kitchen_name text;
  v_food record;
  v_recipe record;
  v_new_food_id uuid;
  v_new_recipe_id uuid;
  v_food_count integer := 0;
  v_recipe_count integer := 0;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if p_source_kitchen_id=p_target_kitchen_id then raise exception 'Choose a different destination kitchen'; end if;
  if not public.is_kitchen_member(p_source_kitchen_id) then raise exception 'You are not a member of the source kitchen'; end if;
  if not public.is_kitchen_member(p_target_kitchen_id) then raise exception 'You are not a member of the destination kitchen'; end if;
  select name into v_source_kitchen_name from public.kitchens where id=p_source_kitchen_id;

  if exists(
    select 1 from unnest(coalesce(p_food_ids,array[]::uuid[])) selected(id)
    left join public.foods food on food.id=selected.id
    where food.id is null or food.kitchen_id<>p_source_kitchen_id
  ) then raise exception 'One or more selected ingredients do not belong to the current kitchen'; end if;
  if exists(
    select 1 from unnest(coalesce(p_recipe_ids,array[]::uuid[])) selected(id)
    left join public.recipes recipe on recipe.id=selected.id
    where recipe.id is null or recipe.kitchen_id<>p_source_kitchen_id
  ) then raise exception 'One or more selected meals do not belong to the current kitchen'; end if;

  create temporary table if not exists kitchen_copy_food_map(source_id uuid primary key, target_id uuid not null) on commit drop;
  truncate kitchen_copy_food_map;

  for v_food in
    select distinct food.* from public.foods food
    where food.id=any(coalesce(p_food_ids,array[]::uuid[]))
       or food.id in (
         select ingredient.food_id from public.recipe_ingredients ingredient
         where ingredient.recipe_id=any(coalesce(p_recipe_ids,array[]::uuid[]))
       )
    order by food.created_at,food.id
  loop
    insert into public.foods(
      name,calories_per_unit,kj_per_unit,protein_per_unit,unit_label,unit_weight_g,notes,
      user_id,kitchen_id,created_by,is_copied,copied_from_food_id,copied_from_kitchen_id,copied_from_kitchen_name
    ) values(
      public.next_food_copy_name(p_target_kitchen_id,v_food.name),v_food.calories_per_unit,v_food.kj_per_unit,
      v_food.protein_per_unit,v_food.unit_label,v_food.unit_weight_g,v_food.notes,auth.uid(),p_target_kitchen_id,
      auth.uid(),true,v_food.id,p_source_kitchen_id,v_source_kitchen_name
    ) returning id into v_new_food_id;
    insert into kitchen_copy_food_map values(v_food.id,v_new_food_id);
    v_food_count := v_food_count + 1;
  end loop;

  for v_recipe in
    select * from public.recipes
    where id=any(coalesce(p_recipe_ids,array[]::uuid[]))
    order by created_at,id
  loop
    insert into public.recipes(
      name,category,target_plan,total_weight_g,user_id,kitchen_id,created_by,
      is_copied,copied_from_recipe_id,copied_from_kitchen_id,copied_from_kitchen_name
    ) values(
      public.next_recipe_copy_name(p_target_kitchen_id,v_recipe.name),v_recipe.category,v_recipe.target_plan,
      v_recipe.total_weight_g,auth.uid(),p_target_kitchen_id,auth.uid(),true,v_recipe.id,
      p_source_kitchen_id,v_source_kitchen_name
    ) returning id into v_new_recipe_id;
    insert into public.recipe_ingredients(recipe_id,food_id,quantity,sort_order)
    select v_new_recipe_id,map.target_id,ingredient.quantity,ingredient.sort_order
    from public.recipe_ingredients ingredient
    join kitchen_copy_food_map map on map.source_id=ingredient.food_id
    where ingredient.recipe_id=v_recipe.id;
    v_recipe_count := v_recipe_count + 1;
  end loop;

  return jsonb_build_object('ingredients',v_food_count,'meals',v_recipe_count);
end $$;

revoke all on function public.next_food_copy_name(uuid,text) from public;
revoke all on function public.next_recipe_copy_name(uuid,text) from public;
revoke all on function public.copy_kitchen_content(uuid,uuid,uuid[],uuid[]) from public;
grant execute on function public.copy_kitchen_content(uuid,uuid,uuid[],uuid[]) to authenticated;
