# OviTech Salary Portal - Vercel Deployment Guide

## Prerequisites
- Supabase project (already connected)
- GitHub account
- Vercel account

## Step 1: Create Supabase Database Tables

The database tables need to be created in Supabase. Here's what you need to do:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query and paste the following SQL:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create employees table
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  employee_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  department TEXT,
  designation TEXT,
  date_of_joining DATE,
  bank_account TEXT,
  bank_ifsc TEXT,
  pan TEXT,
  aadhar TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create salary_structures table
CREATE TABLE salary_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  basic_salary DECIMAL(12,2) NOT NULL,
  hra DECIMAL(12,2) DEFAULT 0,
  dearness_allowance DECIMAL(12,2) DEFAULT 0,
  medical_allowance DECIMAL(12,2) DEFAULT 0,
  transport_allowance DECIMAL(12,2) DEFAULT 0,
  other_allowance DECIMAL(12,2) DEFAULT 0,
  pf_deduction DECIMAL(12,2) DEFAULT 0,
  esi_deduction DECIMAL(12,2) DEFAULT 0,
  income_tax DECIMAL(12,2) DEFAULT 0,
  loan_deduction DECIMAL(12,2) DEFAULT 0,
  other_deduction DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create salary_slips table
CREATE TABLE salary_slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  basic_salary DECIMAL(12,2) NOT NULL,
  allowances JSONB,
  deductions JSONB,
  net_salary DECIMAL(12,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create company_settings table
CREATE TABLE company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  company_address TEXT,
  company_phone TEXT,
  company_email TEXT,
  bank_name TEXT,
  bank_account TEXT,
  bank_ifsc TEXT,
  pan TEXT,
  gst TEXT,
  cin TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all employees" ON employees
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert employees" ON employees
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update employees" ON employees
  FOR UPDATE USING (true);

CREATE POLICY "Users can view their own salary structures" ON salary_structures
  FOR SELECT USING (true);

CREATE POLICY "Users can view salary slips" ON salary_slips
  FOR SELECT USING (true);

CREATE POLICY "Company settings readable by all" ON company_settings
  FOR SELECT USING (true);

CREATE POLICY "Only admins can update settings" ON company_settings
  FOR UPDATE USING (true);
```

4. Click **Run** to execute the SQL

## Step 2: Set Up Vercel

1. Push your code to GitHub (if not already done)
2. Go to [vercel.com](https://vercel.com)
3. Click **Add New Project**
4. Import your GitHub repository
5. Select your project and click **Continue**

## Step 3: Add Environment Variables to Vercel

In the Vercel deployment settings, add these environment variables (get from Supabase):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

To find these values:
1. Go to Supabase Dashboard > Settings > API
2. Copy the URL and the `anon public` key
3. Paste them into Vercel environment variables

## Step 4: Deploy

1. Click **Deploy**
2. Wait for the build to complete
3. Your app will be live at `https://your-project.vercel.app`

## Step 5: Create First Admin User

1. Go to your Supabase dashboard
2. Navigate to **Authentication > Users**
3. Click **Create a new user**
4. Add email and password
5. Then manually set `is_admin = true` in the profiles table for this user

Or signup at your app URL and then run this SQL in Supabase to make them admin:

```sql
UPDATE profiles SET is_admin = TRUE WHERE email = 'admin@ovitech.co';
```

## Default Login Credentials

After setup, create your first user via the sign-up page at `/auth/sign-up`

## Features Available

✅ Employee Management - Add, edit, view employees
✅ Salary Slip Generation - Create salary slips with automatic calculations
✅ Admin Dashboard - View statistics and manage the system
✅ Role-Based Access - Different views for admins and employees
✅ Professional UI - OviTech branded interface

## Troubleshooting

If you see errors about missing tables:
- Run the SQL script in Supabase SQL Editor
- Wait a few minutes for changes to propagate
- Refresh your browser

If login isn't working:
- Make sure you've created a user in Supabase Authentication
- Check that environment variables are set correctly in Vercel
- Look at the browser console for error messages
