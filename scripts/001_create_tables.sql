-- Create profiles table (user management)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  is_admin boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create employees table
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  employee_id text unique not null,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  department text,
  designation text,
  date_of_joining date,
  bank_account text,
  bank_name text,
  ifsc_code text,
  pan text,
  aadhar text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create salary structure table
create table if not exists public.salary_structures (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  base_salary numeric(12, 2) not null,
  hra numeric(12, 2) default 0,
  dearness_allowance numeric(12, 2) default 0,
  medical_allowance numeric(12, 2) default 0,
  transport_allowance numeric(12, 2) default 0,
  other_allowance numeric(12, 2) default 0,
  pf_deduction numeric(12, 2) default 0,
  esi_deduction numeric(12, 2) default 0,
  professional_tax numeric(12, 2) default 0,
  loan_deduction numeric(12, 2) default 0,
  other_deduction numeric(12, 2) default 0,
  effective_from date default now(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create salary slips table
create table if not exists public.salary_slips (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  year integer not null,
  month integer not null,
  base_salary numeric(12, 2),
  hra numeric(12, 2),
  dearness_allowance numeric(12, 2),
  medical_allowance numeric(12, 2),
  transport_allowance numeric(12, 2),
  other_allowance numeric(12, 2),
  total_earnings numeric(12, 2),
  pf_deduction numeric(12, 2),
  esi_deduction numeric(12, 2),
  professional_tax numeric(12, 2),
  loan_deduction numeric(12, 2),
  other_deduction numeric(12, 2),
  total_deductions numeric(12, 2),
  net_salary numeric(12, 2),
  working_days integer default 26,
  present_days integer default 26,
  absent_days integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(employee_id, year, month)
);

-- Create company settings table
create table if not exists public.company_settings (
  id uuid primary key default gen_random_uuid(),
  company_name text default 'OviTech Global Pvt Ltd',
  company_address text,
  company_phone text,
  company_email text,
  company_website text,
  bank_name text,
  bank_account text,
  ifsc_code text,
  cin text,
  pan text,
  esi_code text,
  pf_code text,
  updated_at timestamp with time zone default now()
);

-- Enable Row Level Security on all tables
alter table public.profiles enable row level security;
alter table public.employees enable row level security;
alter table public.salary_structures enable row level security;
alter table public.salary_slips enable row level security;
alter table public.company_settings enable row level security;

-- Create RLS policies for profiles
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Create RLS policies for employees (admin only for write, all authenticated can read own)
create policy "employees_select_own_or_admin"
  on public.employees for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

create policy "employees_insert_admin"
  on public.employees for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

create policy "employees_update_admin"
  on public.employees for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

create policy "employees_delete_admin"
  on public.employees for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- Create RLS policies for salary_structures
create policy "salary_structures_select_own_or_admin"
  on public.salary_structures for select
  using (
    (select user_id from public.employees where id = employee_id) = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

create policy "salary_structures_write_admin"
  on public.salary_structures for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

create policy "salary_structures_update_admin"
  on public.salary_structures for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- Create RLS policies for salary_slips
create policy "salary_slips_select_own_or_admin"
  on public.salary_slips for select
  using (
    (select user_id from public.employees where id = employee_id) = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

create policy "salary_slips_write_admin"
  on public.salary_slips for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

create policy "salary_slips_update_admin"
  on public.salary_slips for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- Create RLS policy for company_settings (admin only)
create policy "company_settings_select_all"
  on public.company_settings for select
  using (true);

create policy "company_settings_write_admin"
  on public.company_settings for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

create policy "company_settings_update_admin"
  on public.company_settings for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- Create trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, is_admin)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'first_name', null),
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
