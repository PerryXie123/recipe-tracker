create table if not exists public.favorite_recipes (
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

alter table public.favorite_recipes enable row level security;

drop policy if exists "Users manage their favourite recipes" on public.favorite_recipes;

create policy "Users manage their favourite recipes" on public.favorite_recipes
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter table public.favorite_recipes replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'favorite_recipes'
  ) then
    alter publication supabase_realtime add table public.favorite_recipes;
  end if;
end $$;
