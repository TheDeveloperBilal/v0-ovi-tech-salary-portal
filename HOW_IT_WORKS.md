# How OviTech Salary Portal Works (Technical Overview)

## Architecture

\`\`\`
┌─────────────────────┐
│  Browser (User)     │
│                     │
│  Next.js App        │
│  (React Components) │
└──────────┬──────────┘
           │
           │ API Calls
           │ (Supabase Client)
           ↓
┌─────────────────────┐
│  Supabase Auth      │
│  (Login/Signup)     │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  Supabase Client    │
│  (Real-time Data)   │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────────────────────────┐
│    Supabase Database (PostgreSQL)       │
│                                         │
│  - profiles table                       │
│  - employees table                      │
│  - salary_structures table              │
│  - salary_slips table                   │
│  - company_settings table               │
└─────────────────────────────────────────┘
\`\`\`

---

## Real-Time Data Flow

### Example: Adding an Employee

**Step 1: User fills form and clicks "Add Employee"**
\`\`\`
Form Input:
- Employee ID: EMP001
- Name: John Doe
- Email: john@ovitech.co
- Department: Engineering
\`\`\`

**Step 2: React component sends data to Supabase**
\`\`\`javascript
// File: components/employee-management.tsx
const handleAddEmployee = async (formData) => {
  const { data, error } = await supabase
    .from('employees')
    .insert([formData])
  
  if (error) {
    toast({ description: error.message })
  } else {
    // Refresh employee list
    await fetchEmployees()
  }
}
\`\`\`

**Step 3: Supabase validates and saves to PostgreSQL**
\`\`\`sql
INSERT INTO employees (
  employee_id, 
  first_name, 
  last_name, 
  email, 
  department
) VALUES ('EMP001', 'John', 'Doe', 'john@ovitech.co', 'Engineering')
\`\`\`

**Step 4: Component re-fetches data**
\`\`\`javascript
const fetchEmployees = async () => {
  const { data } = await supabase
    .from('employees')
    .select('*')
    .order('created_at', { ascending: false })
  
  setEmployees(data || [])  // Update UI
}
\`\`\`

**Step 5: User sees employee in list (Real-time!)**

---

## Dynamic Features Explained

### 1. Employee Management (Dynamic CRUD)

**Technology:** React State + Supabase Client

**Create (Add Employee):**
\`\`\`javascript
const { data } = await supabase
  .from('employees')
  .insert([newEmployee])
\`\`\`

**Read (Get Employees):**
\`\`\`javascript
const { data } = await supabase
  .from('employees')
  .select('*')
\`\`\`

**Update (Edit Employee):**
\`\`\`javascript
const { data } = await supabase
  .from('employees')
  .update(updatedData)
  .eq('id', employeeId)
\`\`\`

**Delete (Remove Employee):**
\`\`\`javascript
const { data } = await supabase
  .from('employees')
  .delete()
  .eq('id', employeeId)
\`\`\`

---

### 2. Salary Slip Generation (Dynamic Calculations)

**Technology:** JavaScript Math + Supabase Queries

**Get Employee & Salary Structure:**
\`\`\`javascript
// Fetch employee info
const { data: employee } = await supabase
  .from('employees')
  .select('*')
  .eq('id', employeeId)
  .single()

// Fetch salary structure
const { data: structure } = await supabase
  .from('salary_structures')
  .select('*')
  .eq('employee_id', employeeId)
  .single()
\`\`\`

**Calculate Salary:**
\`\`\`javascript
const calculateSalary = (employee, structure) => {
  // Earnings
  const basicSalary = structure.basic_salary
  const hra = structure.hra || 0
  const dearness = structure.dearness_allowance || 0
  const medical = structure.medical_allowance || 0
  const transport = structure.transport_allowance || 0
  
  const totalEarnings = basicSalary + hra + dearness + medical + transport
  
  // Deductions
  const pf = structure.pf_deduction || 0
  const esi = structure.esi_deduction || 0
  const tax = structure.income_tax || 0
  
  const totalDeductions = pf + esi + tax
  
  // Net Salary
  const netSalary = totalEarnings - totalDeductions
  
  return {
    earnings: { basicSalary, hra, dearness, medical, transport },
    deductions: { pf, esi, tax },
    totals: {
      totalEarnings,
      totalDeductions,
      netSalary
    }
  }
}
\`\`\`

**Save Salary Slip:**
\`\`\`javascript
const { data } = await supabase
  .from('salary_slips')
  .insert([{
    employee_id: employeeId,
    month: selectedMonth,
    year: selectedYear,
    basic_salary: structure.basic_salary,
    allowances: {
      hra: structure.hra,
      dearness: structure.dearness_allowance,
      // ... other allowances
    },
    deductions: {
      pf: structure.pf_deduction,
      esi: structure.esi_deduction,
      // ... other deductions
    },
    net_salary: calculatedNetSalary
  }])
\`\`\`

---

### 3. Export to PDF/Word (Dynamic Document Generation)

**PDF Export:**
\`\`\`javascript
const generatePDF = (slip) => {
  // Uses library to create PDF
  // Fetches data dynamically from slip object
  // Generates on-the-fly when user clicks "Download"
}
\`\`\`

**Word Export:**
\`\`\`javascript
const generateWord = (slip) => {
  // Uses library to create .doc file
  // Inserts dynamic data from database
  // File name: `salary_slip_${employeeId}_${month}.doc`
}
\`\`\`

---

### 4. Role-Based Access (Dynamic Permission Check)

**Technology:** Row-Level Security (RLS) + React State

**In Next.js Server Component:**
\`\`\`javascript
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single()

// Check if user is admin
if (!profile.is_admin) {
  redirect('/auth/login')
}
\`\`\`

**In React Component:**
\`\`\`javascript
export function DashboardContent({ user }) {
  if (!user.is_admin) {
    return <EmployeeView />  // Limited features
  }
  
  return <AdminView />  // Full features
}
\`\`\`

**Database Level (RLS Policy):**
\`\`\`sql
CREATE POLICY "Employees viewable by authenticated users" ON employees
  FOR SELECT USING (auth.role() = 'authenticated');
\`\`\`

---

## Data Types & Structure

### Profiles Table
\`\`\`javascript
{
  id: "uuid",           // User ID (from auth)
  email: "string",      // Login email
  full_name: "string",  // User name
  is_admin: boolean,    // Admin flag
  created_at: "timestamp",
  updated_at: "timestamp"
}
\`\`\`

### Employees Table
\`\`\`javascript
{
  id: "uuid",
  employee_id: "string",     // EMP001, EMP002, etc
  first_name: "string",
  last_name: "string",
  email: "string",
  phone: "string",
  department: "string",      // Engineering, HR, etc
  designation: "string",     // Developer, Manager, etc
  date_of_joining: "date",
  bank_account: "string",
  bank_ifsc: "string",
  pan: "string",
  aadhar: "string",
  created_at: "timestamp",
  updated_at: "timestamp"
}
\`\`\`

### Salary Structures Table
\`\`\`javascript
{
  id: "uuid",
  employee_id: "uuid",           // References employees table
  basic_salary: 50000,           // Decimal(12,2)
  hra: 10000,
  dearness_allowance: 5000,
  medical_allowance: 3000,
  transport_allowance: 2000,
  other_allowance: 0,
  pf_deduction: 1800,            // 12% of basic
  esi_deduction: 650,            // 0.75% of earnings
  income_tax: 5000,
  loan_deduction: 1000,
  other_deduction: 0,
  created_at: "timestamp",
  updated_at: "timestamp"
}
\`\`\`

### Salary Slips Table
\`\`\`javascript
{
  id: "uuid",
  employee_id: "uuid",           // References employees
  month: 1-12,                   // January = 1, etc
  year: 2024,
  basic_salary: 50000,
  allowances: {                  // JSON object
    hra: 10000,
    dearness: 5000,
    // ... etc
  },
  deductions: {                  // JSON object
    pf: 1800,
    esi: 650,
    // ... etc
  },
  net_salary: 65550,            // Auto-calculated
  created_at: "timestamp",
  updated_at: "timestamp"
}
\`\`\`

---

## API Endpoints (Supabase Functions)

### Add Employee
\`\`\`
POST /functions/v1/add-employee
Body: { employee_id, first_name, last_name, ... }
Returns: New employee object
\`\`\`

### Generate Salary Slip
\`\`\`
POST /functions/v1/generate-slip
Body: { employee_id, month, year, salary_data }
Returns: New salary slip object
\`\`\`

### Get All Employees
\`\`\`
GET /functions/v1/employees
Returns: Array of employees
\`\`\`

### Export Salary Slip
\`\`\`
GET /functions/v1/export-pdf/:slipId
Returns: PDF file download
\`\`\`

---

## Performance & Caching

**Supabase Auto-Caches:**
- Query results
- User authentication tokens
- RLS policies

**Client-Side Caching (React):**
- Component state holds employee list
- Reduces database queries
- Updates on form submit

**Optimization:**
\`\`\`javascript
// Good: Fetch once and cache
const [employees, setEmployees] = useState([])

useEffect(() => {
  fetchEmployees()  // Only on mount
}, [])

// Bad: Fetches every second
setInterval(() => {
  fetchEmployees()  // Too many queries!
}, 1000)
\`\`\`

---

## Security Features

### 1. Authentication
- Email/password hashing (Supabase handles)
- JWT tokens for session
- 24-hour token expiry

### 2. Row-Level Security (RLS)
- Users can only see their own data
- Admins can see all data
- Database enforces rules (can't bypass)

### 3. SQL Injection Protection
- Parameterized queries (automatic)
- Supabase client sanitizes input
- No raw SQL from user input

### 4. CORS & Credentials
- Supabase validates origin
- Cookies are HTTP-only
- Environment variables never exposed

---

## Deployment Flow

\`\`\`
Local Development
    ↓
    Push to GitHub
    ↓
Vercel Detects Change
    ↓
Build Next.js App
    ↓
Deploy to Vercel Servers
    ↓
App Available Globally
    ↓
All Data in Supabase
    ↓
Real-Time Sync with Users
\`\`\`

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Failed to fetch" | CORS error | Check Supabase keys in Vercel |
| Data doesn't save | RLS policy blocks insert | Check RLS policies in Supabase |
| Can't login | Auth not configured | Create user in Supabase Auth |
| Employees don't show | Query error | Check employee table exists |
| Salary calculation wrong | Math error | Verify deduction percentages |

---

## Next Steps

1. ✅ Create tables in Supabase (SETUP_GUIDE.md)
2. ✅ Deploy to Vercel (QUICK_START.md)
3. ✅ Create first user
4. ✅ Add test employee
5. ✅ Generate salary slip
6. ✅ Download PDF
7. 🚀 Share with team!
