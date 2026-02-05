-- Drop existing RLS policies for employees that check auth.uid()
drop policy if exists "employees_insert_admin" on public.employees;
drop policy if exists "employees_update_admin" on public.employees;
drop policy if exists "employees_delete_admin" on public.employees;

-- Recreate RLS policies that allow service role key to work
-- Service role key has auth.uid() = null, but can still perform operations
create policy "employees_insert_admin"
  on public.employees for insert
  with check (
    auth.uid() is null  -- Allow service role (no session)
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

create policy "employees_update_admin"
  on public.employees for update
  using (
    auth.uid() is null  -- Allow service role (no session)
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

create policy "employees_delete_admin"
  on public.employees for delete
  using (
    auth.uid() is null  -- Allow service role (no session)
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );
