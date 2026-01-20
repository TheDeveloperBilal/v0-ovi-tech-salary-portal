# OviTech Salary Portal - Quick Start (5 Minutes)

## 🚀 Get Live in 5 Steps

### Step 1: Create Database (2 min)
```
1. Go to supabase.com → Your Project → SQL Editor
2. New Query → Copy SETUP_GUIDE.md SQL code
3. Click RUN
4. Wait for "Query executed successfully"
```

### Step 2: Get Credentials (1 min)
```
Supabase → Settings → API
Copy:
- Project URL
- Anon Key
```

### Step 3: Deploy to Vercel (1 min)
```
1. vercel.com → Add New Project
2. Import GitHub repo
3. Add Environment Variables:
   NEXT_PUBLIC_SUPABASE_URL = [your url]
   NEXT_PUBLIC_SUPABASE_ANON_KEY = [your key]
4. Click Deploy
```

### Step 4: Create Admin User (1 min)
```
Click "Sign Up" at your Vercel URL
Or: Supabase → SQL → UPDATE profiles SET is_admin = TRUE WHERE email = '...';
```

### Step 5: Test It Works (1 min)
```
1. Login at https://your-app.vercel.app
2. Go to Dashboard
3. Add an employee
4. See it appear immediately (dynamic!)
```

---

## 📊 What's Now Working

| Feature | Status | How to Use |
|---------|--------|-----------|
| **Login** | ✅ Live | `/auth/login` |
| **Dashboard** | ✅ Live | See stats automatically |
| **Add Employees** | ✅ Dynamic | Fill form → appears instantly |
| **Salary Slips** | ✅ Dynamic | Select employee → auto-calculate |
| **PDF Export** | ✅ Live | Download button on slip |
| **Word Export** | ✅ Live | Download button on slip |
| **Role-Based Access** | ✅ Live | Admins vs Employees different views |

---

## 🔗 Key URLs

| Page | URL |
|------|-----|
| **Your App** | https://your-project.vercel.app |
| **Login** | https://your-project.vercel.app/auth/login |
| **Admin Dashboard** | https://your-project.vercel.app/dashboard |
| **Supabase** | https://app.supabase.com |
| **Vercel** | https://vercel.com/dashboard |

---

## 💾 Database Tables Created

```
profiles          → User accounts & admin status
employees         → Employee information
salary_structures → Salary components (basic, HRA, etc)
salary_slips      → Monthly salary slips
company_settings  → OviTech company details
```

---

## 🧪 Test These Features

**Add Employee Test:**
1. Click "Employee Management"
2. Click "Add New Employee"
3. Fill: EMP001, John, Doe, john@test.co
4. See it appear in table (real-time!)

**Generate Salary Slip Test:**
1. Click "Salary Slip Generator"
2. Select John Doe
3. Enter Basic: 50000, HRA: 10000
4. Click "Generate"
5. See net salary calculate automatically

**Export Test:**
1. Click "Download as PDF"
2. Opens PDF in new tab
3. Click "Download as Word"
4. Downloads .doc file

---

## 🆘 Quick Fixes

| Problem | Fix |
|---------|-----|
| "Failed to fetch" | Check Supabase keys in Vercel env vars |
| Can't login | Create user in Supabase Auth |
| Data doesn't save | Check browser console for errors |
| Tables don't exist | Re-run SQL in Supabase |

---

## 📞 Support

- Check SETUP_GUIDE.md for detailed instructions
- Vercel logs: vercel.com → Settings → Logs
- Supabase logs: Supabase → Database → Query Performance
