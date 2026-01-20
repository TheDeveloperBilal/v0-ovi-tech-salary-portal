# Complete Setup Guide: Connect Supabase → Vercel → Make Dynamic

This guide will walk you through setting up your OviTech Salary Portal completely from start to finish.

---

## PART 1: CREATE DATABASE TABLES IN SUPABASE

### Step 1.1: Access Supabase SQL Editor

1. Go to [supabase.com](https://supabase.com)
2. Login to your account
3. Select your project (should already be created)
4. Click on **SQL Editor** in the left sidebar
5. Click **New Query**

### Step 1.2: Create Tables (Copy & Paste This SQL)

Paste the entire SQL below into the SQL editor and click **Run**:

```sql
-- Create profiles table (for users)
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
  company_name TEXT NOT NULL DEFAULT 'OviTech Global Pvt Ltd',
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

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create RLS Policies for employees
CREATE POLICY "Employees viewable by authenticated users" ON employees
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Employees insertable by authenticated users" ON employees
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Employees updatable by authenticated users" ON employees
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create RLS Policies for salary_structures
CREATE POLICY "Salary structures viewable by authenticated users" ON salary_structures
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Salary structures insertable by authenticated users" ON salary_structures
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Salary structures updatable by authenticated users" ON salary_structures
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create RLS Policies for salary_slips
CREATE POLICY "Salary slips viewable by authenticated users" ON salary_slips
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Salary slips insertable by authenticated users" ON salary_slips
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create RLS Policies for company_settings
CREATE POLICY "Company settings viewable by all" ON company_settings
  FOR SELECT USING (true);

CREATE POLICY "Company settings updatable by authenticated users" ON company_settings
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Insert default company settings
INSERT INTO company_settings (company_name, company_address, company_phone, company_email)
VALUES (
  'OviTech Global Pvt Ltd',
  'Your Company Address',
  'Your Phone Number',
  'contact@ovitech.co'
) ON CONFLICT DO NOTHING;

-- Create trigger for profile auto-creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_admin)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', false);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Click RUN to execute all queries**

✅ You should see "Query executed successfully"

---

## PART 2: SET UP VERCEL DEPLOYMENT

### Step 2.1: Push Code to GitHub

```bash
git add .
git commit -m "OviTech Salary Portal - Ready for Vercel"
git push origin main
```

### Step 2.2: Create Vercel Project

1. Go to [vercel.com](https://vercel.com)
2. Click **Add New Project**
3. Select **Import Git Repository**
4. Find your GitHub repository and click **Import**
5. Click **Continue**

### Step 2.3: Configure Environment Variables

In the **Environment Variables** section, add these variables:

| Variable Name | Value | Where to Find |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | Supabase > Settings > API > Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Anon Key | Supabase > Settings > API > `anon` public key |

**How to get these values:**
1. Go to your Supabase project
2. Click **Settings** → **API**
3. Copy **Project URL**
4. Copy **anon public** key

### Step 2.4: Deploy

1. Click **Deploy**
2. Wait for build to complete (usually 2-3 minutes)
3. You'll get a URL like: `https://ovitech-salary-portal.vercel.app`

---

## PART 3: CREATE YOUR FIRST ADMIN USER

### Option A: Sign Up Through the App

1. Go to your Vercel URL (e.g., `https://ovitech-salary-portal.vercel.app`)
2. Click **Sign Up**
3. Create account with email and password
4. Click **Login** to verify it works

### Option B: Make User Admin in Supabase

1. Go to Supabase > **Authentication** > **Users**
2. Find your user and copy their ID
3. Go to **SQL Editor**
4. Run this query:

```sql
UPDATE profiles SET is_admin = TRUE WHERE email = 'your-email@example.com';
```

---

## PART 4: TEST DYNAMIC FEATURES

### Login & Dashboard
- [ ] Sign in at `/auth/login`
- [ ] See admin dashboard at `/dashboard`
- [ ] View statistics (0 employees initially)

### Add Employee (Dynamic)
1. Click **Employee Management** 
2. Click **Add New Employee**
3. Fill in form:
   - Employee ID: `EMP001`
   - First Name: `John`
   - Last Name: `Doe`
   - Email: `john@ovitech.co`
   - Department: `Engineering`
   - Designation: `Developer`
4. Click **Add Employee**
5. See employee appear in list (dynamic!)

### Generate Salary Slip (Dynamic)
1. Click **Salary Slip Generator**
2. Select employee from dropdown
3. Enter salary details:
   - Basic Salary: `50000`
   - HRA: `10000`
   - Allowances: as needed
   - Deductions: as needed
4. Click **Generate Slip**
5. See calculated net salary (dynamic math!)

### Download Salary Slip
1. Click **Download as PDF** or **Download as Word**
2. File saves to your computer

---

## HOW IT WORKS (The Dynamic Part)

### Data Flow:

```
User Input (Form)
    ↓
React Component (Next.js)
    ↓
Supabase Client (JavaScript)
    ↓
Supabase Database (PostgreSQL)
    ↓
Real-time Update
    ↓
Component Re-renders
    ↓
User Sees Changes Instantly
```

### Example: Adding an Employee

**Frontend Code** (already set up):
```javascript
const handleAddEmployee = async (formData) => {
  // Send data to Supabase
  const { data, error } = await supabase
    .from('employees')
    .insert([formData])
  
  // Automatically updates the employee list
  refreshEmployeeList()
}
```

**Database** (PostgreSQL in Supabase):
- Data saved to `employees` table
- Real-time updates sent to frontend
- Component automatically re-renders

---

## TROUBLESHOOTING

### Issue: "Failed to fetch" error
**Solution:** 
- Check Supabase environment variables in Vercel settings
- Make sure both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Redeploy with: `vercel deploy --prod`

### Issue: Can't login
**Solution:**
- Make sure you created a user in Supabase Authentication
- Check that profiles table has RLS policies enabled
- Verify `is_admin` is set to `true` for your user

### Issue: Database tables not showing
**Solution:**
- Run the SQL script in Supabase SQL Editor again
- Wait 1-2 minutes for changes to propagate
- Refresh the browser

### Issue: Employees don't save
**Solution:**
- Check browser console (F12) for error messages
- Make sure all required fields are filled
- Verify Supabase connection is working

---

## NEXT STEPS

✅ Tables created in Supabase
✅ Code deployed to Vercel  
✅ Environment variables configured
✅ First user created
✅ Test employee added

Now your app is fully dynamic and live! 

**Your Live URL:** `https://your-project.vercel.app`

---

## USEFUL LINKS

- Supabase Dashboard: https://app.supabase.com
- Vercel Dashboard: https://vercel.com/dashboard
- Your App Admin: `/dashboard`
- Add Employee: `/dashboard?tab=employees`
- Generate Salary Slip: `/dashboard?tab=salary`
