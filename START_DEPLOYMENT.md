# OviTech Salary Portal - Start Deployment Now

## ⚡ 3-Step Quick Start

### STEP 1: Create Tables (2 minutes)
```
1. Open: https://app.supabase.com
2. Click your project
3. SQL Editor → New Query
4. Paste from SETUP_GUIDE.md (entire SQL block)
5. Click RUN
✅ Done - Tables created
```

### STEP 2: Deploy to Vercel (1 minute)
```
1. Go to: https://vercel.com/dashboard
2. Click: "Add New Project"
3. Select your GitHub repo
4. Add Environment Variables:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
5. Click: Deploy
✅ Done - App is live
```

### STEP 3: Create Admin User (1 minute)
```
1. Go to your Vercel URL
2. Click "Sign Up"
3. Use email: admin@ovitech.co
4. Set strong password
5. Login
✅ Done - You're admin
```

---

## 📍 Your URLs After Deployment

| What | URL |
|------|-----|
| **App Live** | https://YOUR-PROJECT.vercel.app |
| **Login** | https://YOUR-PROJECT.vercel.app/auth/login |
| **Dashboard** | https://YOUR-PROJECT.vercel.app/dashboard |
| **Add Employee** | Dashboard → Employee Management |
| **Salary Slip** | Dashboard → Salary Slip Generator |

---

## 🔐 Get Your Credentials

### Find NEXT_PUBLIC_SUPABASE_URL
1. supabase.com → Your Project
2. Settings → API
3. Copy "Project URL"
4. Example: `https://xxxxxxxxxxxx.supabase.co`

### Find NEXT_PUBLIC_SUPABASE_ANON_KEY
1. supabase.com → Your Project
2. Settings → API
3. Copy "anon public" key
4. Example: `eyJhbGciOiJIUzI1NiIsInR5...`

---

## ✅ Verify Everything Works

### Test 1: Login
- [ ] Go to login page
- [ ] Sign up with email
- [ ] Verify email (check inbox or Supabase)
- [ ] Login successful

### Test 2: Add Employee
- [ ] Click "Employee Management"
- [ ] Click "Add Employee"
- [ ] Fill: EMP001, John, Doe, john@test.co, Engineering, Developer
- [ ] Click "Add"
- [ ] See employee in table ✅

### Test 3: Generate Salary Slip
- [ ] Click "Salary Slip Generator"
- [ ] Select employee: John Doe
- [ ] Fill: Basic 50000, HRA 10000
- [ ] Click "Generate"
- [ ] See net salary calculate ✅

### Test 4: Download
- [ ] Click "Download as PDF"
- [ ] PDF opens/downloads ✅
- [ ] Click "Download as Word"
- [ ] Word file downloads ✅

---

## 🆘 If Something Goes Wrong

### Error: "Failed to fetch"
```
Fix: Supabase not connected
1. Check keys are correct in Vercel
2. Go Vercel → Settings → Environment Variables
3. Copy-paste keys again from Supabase
4. Redeploy: vercel deploy --prod
```

### Error: "Cannot read property of undefined"
```
Fix: Tables don't exist yet
1. Go to Supabase → SQL Editor
2. Re-run the entire SQL script
3. Wait 1-2 minutes
4. Refresh browser
```

### Error: "Unauthorized"
```
Fix: User not found
1. Go to Supabase → Authentication → Users
2. Check your email is listed
3. If not, sign up again
4. Verify email by clicking link
```

---

## 📊 Architecture

```
┌──────────────────────┐
│   OviTech Website    │
│  (Your employees)    │
│                      │
│  1. Sign Up / Login  │
│  2. View Dashboard   │
│  3. Add Employees    │
│  4. Generate Slips   │
│  5. Download PDF     │
└──────────┬───────────┘
           │
    (Internet)
           │
┌──────────▼───────────┐
│  Vercel (Hosting)    │
│                      │
│  Next.js App         │
│  React Components    │
│  Smart Calculations  │
└──────────┬───────────┘
           │
    (API Calls)
           │
┌──────────▼──────────────┐
│  Supabase (Database)   │
│                        │
│  PostgreSQL + Auth     │
│  All data stored here  │
│  Real-time updates     │
└─────────────────────────┘
```

---

## 🎯 Key Features

| Feature | Where | Status |
|---------|-------|--------|
| **Sign Up/Login** | `/auth` | ✅ Works |
| **Employee Management** | Dashboard | ✅ Real-time |
| **Salary Calculations** | Auto | ✅ Dynamic |
| **PDF Download** | Slip View | ✅ Works |
| **Word Download** | Slip View | ✅ Works |
| **Admin Dashboard** | `/dashboard` | ✅ Live Stats |
| **Employee View** | Dashboard | ✅ Limited Access |

---

## 🚀 What Happens After Deployment

1. **Your data is secure**
   - Stored in PostgreSQL (Supabase)
   - Encrypted in transit
   - Row-level security enforced

2. **Real-time updates**
   - Add employee → Instantly appears
   - Generate slip → Saves immediately
   - Changes sync across devices

3. **Scalable**
   - Can handle 100+ employees
   - Auto-scales with Vercel
   - Database handles millions of records

4. **Always available**
   - App runs 24/7 on Vercel
   - 99.9% uptime
   - Global CDN for speed

---

## 📚 Complete Guides (If You Need Details)

| Guide | Purpose |
|-------|---------|
| **QUICK_START.md** | 5-minute overview |
| **SETUP_GUIDE.md** | Step-by-step setup |
| **HOW_IT_WORKS.md** | Technical deep dive |
| **VERCEL_DEPLOYMENT.md** | Vercel specific |

---

## 🎓 After Deployment

### Add More Users
1. Go to your app URL
2. Share signup link: `https://YOUR-APP/auth/sign-up`
3. They can create accounts
4. Make them admin if needed in Supabase

### Add More Employees
1. Login to dashboard
2. Click "Employee Management"
3. Add employees one by one
4. Or prepare CSV and contact support for bulk import

### Customize Settings
1. Dashboard → Settings
2. Update company name, address, phone
3. Add bank details for salary slips
4. Changes saved automatically

---

## ⏱️ Time Estimates

| Task | Time |
|------|------|
| Create Supabase tables | 2 min |
| Deploy to Vercel | 3 min |
| Create first user | 2 min |
| Add test employee | 2 min |
| Generate test slip | 2 min |
| **Total** | **11 minutes** |

---

## 🎉 You're Ready!

**Next Steps:**
1. Open SETUP_GUIDE.md
2. Follow Step 1 (Create Tables)
3. Follow Step 2 (Deploy to Vercel)
4. Share your live URL with team!

**Questions?** Check HOW_IT_WORKS.md for detailed explanations.
