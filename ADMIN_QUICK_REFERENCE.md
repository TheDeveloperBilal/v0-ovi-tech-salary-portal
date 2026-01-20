# Admin Setup - Quick Reference

## 🎯 Your Current Situation

```
USERS IN DATABASE:
├─ bilal@ovitech.co ❌ (Employee - needs to be admin)
└─ admin@ovitech.co ✅ (Already admin)
```

---

## ✅ Solution: Make bilal an Admin

### FASTEST WAY (2 minutes):

**Step 1:** Open Supabase
```
https://supabase.com
Login → Select Your Project
```

**Step 2:** Go to profiles table
```
Left Sidebar → Table Editor → profiles table
```

**Step 3:** Find and update
```
Find row: bilal@ovitech.co
Click:    is_admin cell (showing FALSE)
Change:   FALSE → TRUE
```

**Step 4:** Refresh app
```
Go back to your app
Hard Refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
Logout and Login again
```

**Step 5:** You're done! 🎉
```
Now you see:
✅ Manage Employees tab
✅ Manage Users tab  
✅ Salary Slips tab
✅ Settings tab
```

---

## 📊 Before & After

### EMPLOYEE VIEW (Current bilal@ovitech.co)
```
Dashboard
├─ Statistics (View only)
└─ My Salary Slips
    └─ View salary slips
```

### ADMIN VIEW (After making admin)
```
Dashboard
├─ Statistics (with counts)
├─ Manage Employees
│  ├─ Add new employee
│  ├─ Edit employee
│  └─ Delete employee
├─ Manage Users (NEW!)
│  ├─ Make other users admin
│  └─ Remove admin status
├─ Salary Slips
│  ├─ Create salary slip
│  ├─ View all slips
│  ├─ Calculate salary
│  └─ Download PDF/Word
└─ Settings
   ├─ Company details
   ├─ Bank information
   ├─ Tax codes
   └─ Save settings
```

---

## 🔄 The Process Visual

```
┌─────────────────────────────────────────────────────┐
│         YOUR OViTECH SALARY PORTAL FLOW             │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 1. SIGNUP/LOGIN                                     │
│    └─→ Created in Supabase with is_admin=FALSE     │
│                                                     │
│ 2. SET ADMIN STATUS (You do this now!)             │
│    └─→ Update is_admin to TRUE in Supabase         │
│                                                     │
│ 3. REFRESH APP                                      │
│    └─→ Browser refreshes, reads is_admin=TRUE      │
│                                                     │
│ 4. ADMIN FEATURES UNLOCK                            │
│    ├─ Manage Employees                             │
│    ├─ Manage Users                                 │
│    ├─ Create Salary Slips                          │
│    └─ Configure Settings                           │
│                                                     │
│ 5. CREATE SALARY                                    │
│    ├─ Add employee                                 │
│    ├─ Create salary slip                           │
│    ├─ Set salary components                        │
│    └─ Download PDF/Word                            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🎬 Step-by-Step Screenshots Guide

### Step 1: Open Supabase Dashboard
```
1. Go to supabase.com
2. Click "Sign In"
3. Login with your account
4. Select project "ovitech_salary" (or your project name)
```

### Step 2: Navigate to profiles table
```
Left Menu:
├─ Home
├─ SQL Editor
├─ Table Editor  ← CLICK HERE
├─ Auth
└─ ...

Then:
├─ profiles    ← CLICK HERE
├─ employees
├─ salary_slips
└─ ...
```

### Step 3: Find bilal@ovitech.co
```
You'll see a table like:

| id          | email              | full_name | is_admin |
|-------------|-------------------|-----------|----------|
| 226bf1d...  | bilal@ovitech.co  | NULL      | FALSE   | ← YOUR ROW
| f661e52...  | admin@ovitech.co  | NULL      | TRUE    |
```

### Step 4: Click on FALSE to change to TRUE
```
Click on the FALSE value in bilal@ovitech.co row
A popup appears
Select: TRUE
It saves automatically
```

### Step 5: Refresh your app browser
```
Press Ctrl+Shift+R (Windows/Linux)
   or Cmd+Shift+R (Mac)

The app will refresh and reload with new permissions
```

---

## ✨ After Making Admin - What You Can Do

### 1️⃣ Add Employee
```
Manage Employees tab
→ "Add New Employee" button
→ Fill form
→ Click Save
→ Employee added to system
```

### 2️⃣ Create Salary Slip
```
Salary Slips tab
→ Select Employee
→ Enter Month & Year
→ Add Basic Salary
→ Add Allowances (HRA, Medical, etc)
→ Add Deductions (PF, Tax, etc)
→ "Generate Slip" button
→ Download as PDF or Word
```

### 3️⃣ Manage Company Settings
```
Settings tab
→ Enter Company Name
→ Add Bank Details
→ Add PAN/GST/CIN
→ Click Save
```

### 4️⃣ Manage Other Users
```
Manage Users tab
→ See all registered users
→ Click "Make Admin" to promote
→ Click "Remove Admin" to demote
```

---

## 🐛 If Something Goes Wrong

### Problem: Still don't see admin tabs
**Solution:**
1. Hard refresh: Ctrl+Shift+R
2. Logout completely
3. Login again
4. Check Supabase that is_admin is TRUE

### Problem: is_admin is TRUE but no admin access
**Solution:**
1. Check Supabase RLS policies
2. Try clearing browser cookies
3. Try a different browser or incognito mode

### Problem: Can't find the is_admin column
**Solution:**
1. Make sure you're in profiles table (not employees)
2. Scroll right if the column is off-screen
3. Refresh the page in Supabase

---

## ⏱️ Timing

| Task | Time |
|------|------|
| Open Supabase | 30 sec |
| Find profiles table | 20 sec |
| Update is_admin | 20 sec |
| Refresh app | 30 sec |
| **TOTAL** | **~2 min** |

---

## 🎉 Result

After 2 minutes:
- ✅ Full admin access
- ✅ Can add employees
- ✅ Can create salary slips
- ✅ Can manage company settings
- ✅ Can promote other users to admin

**Start creating your first salary slip now!** 🚀
