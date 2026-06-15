-- Import generated from C:/Users/perry/Downloads/Meal plan 2025 - beef Pasta, katsu.pdf
-- Recipes are inserted for user ed60d7b3-46d8-4630-939e-6bd482d296f9.
-- Ingredient quantities are grams. Known serving-weight foods from the food import were converted to grams.
-- Run supabase/import_foods_ed60d7b3.sql first so all food names exist.
begin;

delete from public.recipes
where user_id = 'ed60d7b3-46d8-4630-939e-6bd482d296f9'::uuid
  and name in (
    'Beef Pasta',
    'Rice',
    'Chicken Southern',
    'Kra Pao',
    'Chicken Katsu',
    'Teriyaki Sauce',
    'Apple Pie',
    'Larb Gai',
    'Chicken Drumsticks',
    'Kumara Banana Bread (Jam)',
    'Bony_skuxx Keto Pizza',
    'Kumara Banana Bread (No Jam)',
    'Konjac Spicy Prawn Pasta'
  );

insert into public.recipes (user_id, name, category, target_plan, total_weight_g)
values
  ('ed60d7b3-46d8-4630-939e-6bd482d296f9'::uuid, 'Beef Pasta', 'Meal', null, 1930.0),
  ('ed60d7b3-46d8-4630-939e-6bd482d296f9'::uuid, 'Rice', 'Meal', null, 1010.0),
  ('ed60d7b3-46d8-4630-939e-6bd482d296f9'::uuid, 'Chicken Southern', 'Meal', null, 570.0),
  ('ed60d7b3-46d8-4630-939e-6bd482d296f9'::uuid, 'Kra Pao', 'Meal', null, 652.0),
  ('ed60d7b3-46d8-4630-939e-6bd482d296f9'::uuid, 'Chicken Katsu', 'Meal', null, 1136.0),
  ('ed60d7b3-46d8-4630-939e-6bd482d296f9'::uuid, 'Teriyaki Sauce', 'Sauce', null, 195.0),
  ('ed60d7b3-46d8-4630-939e-6bd482d296f9'::uuid, 'Apple Pie', 'Meal', null, 790.0),
  ('ed60d7b3-46d8-4630-939e-6bd482d296f9'::uuid, 'Larb Gai', 'Meal', null, 980.0),
  ('ed60d7b3-46d8-4630-939e-6bd482d296f9'::uuid, 'Chicken Drumsticks', 'Meal', null, 1429.0),
  ('ed60d7b3-46d8-4630-939e-6bd482d296f9'::uuid, 'Kumara Banana Bread (Jam)', 'Meal', null, 490.0),
  ('ed60d7b3-46d8-4630-939e-6bd482d296f9'::uuid, 'Bony_skuxx Keto Pizza', 'Meal', null, 180.0),
  ('ed60d7b3-46d8-4630-939e-6bd482d296f9'::uuid, 'Kumara Banana Bread (No Jam)', 'Meal', null, 477.5),
  ('ed60d7b3-46d8-4630-939e-6bd482d296f9'::uuid, 'Konjac Spicy Prawn Pasta', 'Meal', null, 1290.0);

create temp table recipe_food_import (
  recipe_name text not null,
  food_name text not null,
  quantity numeric not null,
  sort_order integer not null
) on commit drop;

insert into recipe_food_import (recipe_name, food_name, quantity, sort_order)
values
  ('Beef Pasta', 'Dry pasta', 250.0, 1),
  ('Beef Pasta', 'Lean beef mince', 500.0, 2),
  ('Beef Pasta', 'Cottage cheese', 67.5, 3),
  ('Beef Pasta', 'Canned tomato', 400.0, 4),
  ('Beef Pasta', 'Garlic', 15.0, 5),
  ('Beef Pasta', 'Olive oil', 150.0, 6),
  ('Beef Pasta', 'Onion', 150.0, 7),
  ('Beef Pasta', 'Spinach', 250.0, 8),
  ('Beef Pasta', 'Knorr - chicken seasoning', 100.0, 9),
  ('Rice', 'Uncooked jasmine rice', 150.0, 1),
  ('Rice', 'Uncooked mixed rice', 330.0, 2),
  ('Chicken Southern', 'Chicken breast (uncooked)', 660.0, 1),
  ('Chicken Southern', 'Cornstarch', 30.0, 2),
  ('Chicken Southern', 'Knorr - chicken seasoning', 30.0, 3),
  ('Chicken Southern', 'Oil', 9.0, 4),
  ('Chicken Southern', 'Egg whites', 40.0, 5),
  ('Kra Pao', 'Pork mince', 446.0, 1),
  ('Kra Pao', 'Zuchinni', 35.0, 2),
  ('Kra Pao', 'Knorr - chicken seasoning', 50.0, 3),
  ('Kra Pao', 'Garlic', 20.0, 4),
  ('Kra Pao', 'Onion', 100.0, 5),
  ('Kra Pao', 'Oil', 1.0, 6),
  ('Chicken Katsu', 'Chicken breast (uncooked)', 940.0, 1),
  ('Chicken Katsu', 'Panko', 106.0, 2),
  ('Chicken Katsu', 'Oil', 30.0, 3),
  ('Chicken Katsu', 'Egg whites', 60.0, 4),
  ('Teriyaki Sauce', 'Soy sauce', 132.0, 1),
  ('Teriyaki Sauce', 'Seasame oil', 100.0, 2),
  ('Teriyaki Sauce', 'Rice wine vinegar', 10.0, 3),
  ('Teriyaki Sauce', 'White sugar', 70.0, 4),
  ('Teriyaki Sauce', 'Cornstarch', 8.0, 5),
  ('Teriyaki Sauce', 'Crushed garlic', 9.0, 6),
  ('Apple Pie', 'Apples', 350.0, 1),
  ('Apple Pie', 'Jam', 30.0, 2),
  ('Apple Pie', 'Rice paper', 400.0, 3),
  ('Apple Pie', 'Butter', 10.0, 4),
  ('Larb Gai', 'Chicken mince', 1000.0, 1),
  ('Larb Gai', 'Knorr - chicken seasoning', 35.0, 2),
  ('Larb Gai', 'Oil', 10.0, 3),
  ('Larb Gai', 'Onion', 100.0, 4),
  ('Chicken Drumsticks', 'Soy sauce', 230.0, 1),
  ('Chicken Drumsticks', 'Chicken drumstick (uncooked)', 1005.0, 2),
  ('Chicken Drumsticks', 'Rice wine vinegar', 5.0, 3),
  ('Chicken Drumsticks', 'Dijon mustard', 70.0, 4),
  ('Chicken Drumsticks', 'Cornstarch', 8.0, 5),
  ('Chicken Drumsticks', 'Miso paste', 100.0, 6),
  ('Kumara Banana Bread (Jam)', 'Banana', 200.0, 1),
  ('Kumara Banana Bread (Jam)', 'Jam', 12.5, 2),
  ('Kumara Banana Bread (Jam)', 'Egg whites', 25.0, 3),
  ('Kumara Banana Bread (Jam)', 'Greek yoghurt', 40.0, 4),
  ('Kumara Banana Bread (Jam)', 'Kumara', 60.0, 5),
  ('Kumara Banana Bread (Jam)', 'Maple syrup', 17.5, 6),
  ('Kumara Banana Bread (Jam)', 'Protein Powder (cinnamon donut)', 25.0, 7),
  ('Kumara Banana Bread (Jam)', 'Oat bran', 60.0, 8),
  ('Bony_skuxx Keto Pizza', 'Keto wrap', 100.0, 1),
  ('Bony_skuxx Keto Pizza', 'Edam cheese', 20.0, 2),
  ('Bony_skuxx Keto Pizza', 'Tomato paste', 20.0, 3),
  ('Bony_skuxx Keto Pizza', 'Country Pride Ham', 40.0, 4),
  ('Kumara Banana Bread (No Jam)', 'Banana', 200.0, 1),
  ('Kumara Banana Bread (No Jam)', 'Egg whites', 25.0, 2),
  ('Kumara Banana Bread (No Jam)', 'Greek yoghurt', 40.0, 3),
  ('Kumara Banana Bread (No Jam)', 'Kumara', 60.0, 4),
  ('Kumara Banana Bread (No Jam)', 'Maple syrup', 17.5, 5),
  ('Kumara Banana Bread (No Jam)', 'Protein Powder (cinnamon donut)', 25.0, 6),
  ('Kumara Banana Bread (No Jam)', 'Oat bran', 60.0, 7),
  ('Konjac Spicy Prawn Pasta', 'Konjac fettucine', 240.0, 1),
  ('Konjac Spicy Prawn Pasta', 'Frozen prawn', 350.0, 2),
  ('Konjac Spicy Prawn Pasta', 'Canned tomato', 400.0, 3),
  ('Konjac Spicy Prawn Pasta', 'Onion', 100.0, 4),
  ('Konjac Spicy Prawn Pasta', 'Cottage cheese', 60.0, 5),
  ('Konjac Spicy Prawn Pasta', 'Tomato paste', 25.0, 6),
  ('Konjac Spicy Prawn Pasta', 'Spinach', 260.0, 7),
  ('Konjac Spicy Prawn Pasta', 'Chilli oil', 30.0, 8),
  ('Konjac Spicy Prawn Pasta', 'Soy sauce', 200.0, 9),
  ('Konjac Spicy Prawn Pasta', 'Egg whites', 120.0, 10);

insert into public.recipe_ingredients (recipe_id, food_id, quantity, sort_order)
select recipes.id, foods.id, recipe_food_import.quantity, recipe_food_import.sort_order
from recipe_food_import
join public.recipes recipes
  on recipes.user_id = 'ed60d7b3-46d8-4630-939e-6bd482d296f9'::uuid
  and recipes.name = recipe_food_import.recipe_name
join public.foods foods
  on foods.user_id = 'ed60d7b3-46d8-4630-939e-6bd482d296f9'::uuid
  and lower(foods.name) = lower(recipe_food_import.food_name)
order by recipes.name, recipe_food_import.sort_order;

-- This should return zero rows. If it returns anything, run the foods import first or add those foods.
select distinct recipe_food_import.food_name as missing_food
from recipe_food_import
left join public.foods foods
  on foods.user_id = 'ed60d7b3-46d8-4630-939e-6bd482d296f9'::uuid
  and lower(foods.name) = lower(recipe_food_import.food_name)
where foods.id is null
order by recipe_food_import.food_name;

commit;
