-- One-time migration: move all existing ingredients and meals into the target kitchen.
-- Run this entire file in the Supabase SQL editor.

do $$
declare
  target_kitchen_id constant uuid := '6bee488c-9443-408c-9990-21f78f7ddc23';
begin
  if not exists (select 1 from public.kitchens where id = target_kitchen_id) then
    raise exception 'Target kitchen % does not exist', target_kitchen_id;
  end if;

  -- foods_kitchen_id_name_key requires ingredient names to be unique inside a
  -- kitchen. Preserve duplicate ingredients by giving later copies a stable,
  -- identifiable suffix before consolidating them.
  with ranked_foods as (
    select
      id,
      name,
      row_number() over (
        partition by lower(trim(name))
        order by
          case when kitchen_id = target_kitchen_id then 0 else 1 end,
          created_at nulls last,
          id
      ) as duplicate_number
    from public.foods
  )
  update public.foods as food
  set name = left(ranked.name, 68) || ' (' || substr(food.id::text, 1, 8) || ')'
  from ranked_foods as ranked
  where ranked.id = food.id
    and ranked.duplicate_number > 1;

  update public.foods
  set kitchen_id = target_kitchen_id
  where kitchen_id is distinct from target_kitchen_id;

  update public.recipes
  set kitchen_id = target_kitchen_id
  where kitchen_id is distinct from target_kitchen_id;
end $$;

-- Keep each account's most recently selected kitchen valid. Accounts that are
-- members of their saved kitchen retain that selection; invalid selections fall
-- back to My Kitchen (or another kitchen membership if needed).
with account_kitchens as (
  select
    member.user_id,
    case
      when public.is_kitchen_member(preference.active_kitchen_id, member.user_id)
        then preference.active_kitchen_id
      else (array_agg(member.kitchen_id order by kitchen.is_personal desc, kitchen.created_at))[1]
    end as selected_kitchen_id
  from public.kitchen_members member
  join public.kitchens kitchen on kitchen.id = member.kitchen_id
  left join public.user_kitchen_preferences preference on preference.user_id = member.user_id
  group by member.user_id, preference.active_kitchen_id
)
insert into public.user_kitchen_preferences (user_id, active_kitchen_id, updated_at)
select user_id, selected_kitchen_id, now()
from account_kitchens
on conflict (user_id) do update
set active_kitchen_id = excluded.active_kitchen_id,
    updated_at = excluded.updated_at
where public.user_kitchen_preferences.active_kitchen_id is null
   or not public.is_kitchen_member(
     public.user_kitchen_preferences.active_kitchen_id,
     public.user_kitchen_preferences.user_id
   );
