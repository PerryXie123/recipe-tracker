create extension if not exists "pgcrypto";

create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  calories_per_unit numeric not null check (calories_per_unit >= 0),
  protein_per_unit numeric not null check (protein_per_unit >= 0),
  unit_label text not null default '100g',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  target_plan text,
  source_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  food_id uuid not null references public.foods(id) on delete restrict,
  quantity numeric not null check (quantity >= 0),
  sort_order integer not null default 0
);

create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target_calories integer,
  target_protein numeric,
  days integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references public.meal_plans(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete restrict,
  day_number integer not null default 1,
  meal_slot text not null,
  servings numeric not null default 1
);

alter table public.foods enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.meal_plans enable row level security;
alter table public.meal_plan_items enable row level security;

create policy "Service role manages foods" on public.foods
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "Service role manages recipes" on public.recipes
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "Service role manages recipe ingredients" on public.recipe_ingredients
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "Service role manages meal plans" on public.meal_plans
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "Service role manages meal plan items" on public.meal_plan_items
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

insert into public.foods (name, calories_per_unit, protein_per_unit, unit_label, notes)
values
  ('Egg', 75, 6, 'serving', null),
  ('Rolled oats', 382.4, 13.4, '100g', null),
  ('Greek yoghurt', 102.8, 4.6, '100g', null),
  ('Chicken breast', 165, 31, '100g', 'cooked'),
  ('Rice', 170, 3.8, '100g', 'cooked')
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
    ('Overnight oats', 'Rolled oats', 0.6, 1),
    ('Overnight oats', 'Greek yoghurt', 1.5, 2),
    ('Chicken rice bowl', 'Chicken breast', 2, 1),
    ('Chicken rice bowl', 'Rice', 2, 2)
) as ingredient(recipe_name, food_name, quantity, sort_order)
join public.recipes recipes on recipes.name = ingredient.recipe_name
join public.foods foods on foods.name = ingredient.food_name
where not exists (
  select 1
  from public.recipe_ingredients existing
  where existing.recipe_id = recipes.id
    and existing.food_id = foods.id
);
