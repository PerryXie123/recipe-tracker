drop policy if exists "Users manage their planned meals" on public.planned_meals;

create policy "Users manage their planned meals" on public.planned_meals
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter table public.planned_meals replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'planned_meals'
  ) then
    alter publication supabase_realtime add table public.planned_meals;
  end if;
end $$;
