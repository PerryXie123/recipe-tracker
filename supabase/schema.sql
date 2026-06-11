create extension if not exists "pgcrypto";

create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  calories_per_unit numeric not null check (calories_per_unit >= 0),
  kj_per_unit numeric not null check (kj_per_unit >= 0),
  protein_per_unit numeric not null check (protein_per_unit >= 0),
  unit_label text not null default '100g',
  notes text,
  created_at timestamptz not null default now()
);

alter table public.foods
  add column if not exists kj_per_unit numeric;

update public.foods
set kj_per_unit = round(calories_per_unit * 4.184, 1)
where kj_per_unit is null;

update public.foods
set unit_label = '100g'
where unit_label is distinct from '100g';

alter table public.foods
  alter column kj_per_unit set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'foods_kj_per_unit_nonnegative'
  ) then
    alter table public.foods
      add constraint foods_kj_per_unit_nonnegative check (kj_per_unit >= 0);
  end if;
end $$;

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  target_plan text,
  total_weight_g numeric,
  source_url text,
  created_at timestamptz not null default now()
);

alter table public.recipes
  add column if not exists total_weight_g numeric;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'recipes_total_weight_g_nonnegative'
  ) then
    alter table public.recipes
      add constraint recipes_total_weight_g_nonnegative check (total_weight_g is null or total_weight_g >= 0);
  end if;
end $$;

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  food_id uuid not null references public.foods(id) on delete restrict,
  quantity numeric not null check (quantity >= 0),
  sort_order integer not null default 0
);

alter table public.foods enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;

drop policy if exists "Service role manages foods" on public.foods;
drop policy if exists "Service role manages recipes" on public.recipes;
drop policy if exists "Service role manages recipe ingredients" on public.recipe_ingredients;

create policy "Service role manages foods" on public.foods
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "Service role manages recipes" on public.recipes
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "Service role manages recipe ingredients" on public.recipe_ingredients
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

insert into public.foods (name, calories_per_unit, kj_per_unit, protein_per_unit, unit_label, notes)
values
  ('Egg', 155, 648.5, 12.6, '100g', null),
  ('Rolled oats', 382.4, 1600, 13.4, '100g', null),
  ('Greek yoghurt', 102.8, 430.1, 4.6, '100g', null),
  ('Chicken breast', 165, 690.4, 31, '100g', 'cooked'),
  ('Rice', 170, 711.3, 3.8, '100g', 'cooked')
on conflict (name) do nothing;

insert into public.recipes (name, category, target_plan)
values
  ('Overnight oats', 'Breakfast', '1350 cal / 120 protein'),
  ('Chicken rice bowl', 'Lunch', '2100 cal / 180 protein')
on conflict do nothing;

insert into public.recipe_ingredients (recipe_id, food_id, quantity, sort_order)
select recipes.id, foods.id, ingredient.quantity, ingredient.sort_order
from (
  values
    ('Overnight oats', 'Rolled oats', 60, 1),
    ('Overnight oats', 'Greek yoghurt', 150, 2),
    ('Chicken rice bowl', 'Chicken breast', 200, 1),
    ('Chicken rice bowl', 'Rice', 200, 2)
) as ingredient(recipe_name, food_name, quantity, sort_order)
join public.recipes recipes on recipes.name = ingredient.recipe_name
join public.foods foods on foods.name = ingredient.food_name
where not exists (
  select 1
  from public.recipe_ingredients existing
  where existing.recipe_id = recipes.id
    and existing.food_id = foods.id
);

update public.recipes recipes
set total_weight_g = totals.total_weight_g
from (
  select recipe_id, sum(quantity) as total_weight_g
  from public.recipe_ingredients
  group by recipe_id
) totals
where recipes.id = totals.recipe_id
  and recipes.total_weight_g is null;
