# How to Make a User an Admin - OviTech Salary Portal

## Overview
You have registered 2 users, but all users are employees by default. You need to promote one (or both) to admin status to access the salary management features.

## Current Status
Looking at your profiles table:
- **bilal@ovitech.co** - Employee (is_admin = FALSE)
- **admin@ovitech.co** - Admin (is_admin = TRUE) ✓

You already have 1 admin user!

---

## Method 1: Quick Manual Update (Recommended for First Time)

### Step 1: Open Supabase
1. Go to [supabase.com](https://supabase.com) and login
2. Select your project "OviTech Salary Portal"
3. Click **Table Editor** in the left sidebar

### Step 2: Update is_admin Column
1. Click on **profiles** table
2. Find your user row (bilal@ovitech.co)
3. Click on the `is_admin` cell (currently showing FALSE)
4. Change it to `TRUE`
5. The change saves automatically

### Step 3: Refresh Your App
1. Go back to your app
2. Refresh the browser (or logout and login again)
3. You'll now see the admin dashboard with all settings!

---

## Method 2: Using the App UI (After You're Admin)

Once you have at least one admin account, you can use the **Manage Users** tab to promote other users:

### Steps:
1. Login with your admin account (admin@ovitech.co)
2. Go to Dashboard
3. Click the **Manage Users** tab
4. Find the user you want to promote
5. Click **Make Admin** button
6. That user is now promoted!

---

## What You'll Get After Making Admin

Once a user is set to `is_admin = TRUE`, they'll see:

1. **Manage Employees Tab**
   - Add new employees
   - Edit employee details
   - Delete employees
   - View all employees

2. **Manage Users Tab** (NEW!)
   - Promote other users to admin
   - Demote admins to employee
   - View all registered users

3. **Salary Slips Tab**
   - Create salary slips for employees
   - View all salary slips
   - Calculate salary with allowances/deductions
   - Download as PDF or Word

4. **Settings Tab**
   - Configure company details
   - Add bank information
   - Set compliance codes (PAN, GST, CIN)
   - Save company details

5. **Dashboard Statistics**
   - Total employees count
   - Total salary slips count

---

## Step-by-Step: Make bilal@ovitech.co an Admin

### Via Supabase Dashboard:

\`\`\`
1. Open Supabase Project
2. Go to: Table Editor → profiles
3. Find row with email: bilal@ovitech.co
4. Click on is_admin cell (showing FALSE)
5. Change to TRUE
6. It saves automatically
7. Refresh your app
8. Login with bilal@ovitech.co
9. You now have admin access!
\`\`\`

### Via Your App (After bilal is admin):

\`\`\`
1. Login with admin@ovitech.co
2. Go to Dashboard
3. Click "Manage Users" tab
4. Find bilal@ovitech.co
5. Click "Make Admin" button
6. Done! Both are now admins
\`\`\`

---

## Creating New Admin Users

### For New User from Scratch:

1. **First**: Get your existing admin to promote them
   - New user signs up at /auth/sign-up
   - Login with existing admin account
   - Go to Manage Users tab
   - Promote new user to admin

2. **OR**: Manually in Supabase
   - User signs up in app
   - Go to Supabase profiles table
   - Set is_admin = TRUE for that user
   - They're now admin on next login

---

## Verify It's Working

After making a user admin:

1. Logout
2. Login with the admin user email
3. You should see:
   - Dashboard with statistics
   - 4 tabs: Manage Employees, Manage Users, Salary Slips, Settings
   - All features available

If you still don't see admin features:
- Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
- Or logout and login again
- Check the Supabase table to confirm is_admin is TRUE

---

## Troubleshooting

### Q: I changed is_admin to TRUE but still don't see admin panel
**A:** 
- Hard refresh your browser (Ctrl+Shift+R)
- Logout and login again
- Check Supabase that the change was saved

### Q: I see the tabs but can't click them
**A:** 
- Make sure is_admin is TRUE in Supabase
- Try logging out completely and logging back in

### Q: Can I make someone admin from the app?
**A:** 
Yes! Click "Manage Users" tab and use the "Make Admin" button
(Note: Only if you're already an admin)

### Q: Multiple admins possible?
**A:** 
Yes! You can have as many admins as you want. They all have full access to:
- Create/edit/delete employees
- Generate salary slips
- Manage settings
- Promote/demote other users

---

## Next Steps

Once you're admin:

1. **Add Employees**
   - Click "Manage Employees" tab
   - Click "Add New Employee"
   - Fill in employee details

2. **Configure Company**
   - Click "Settings" tab
   - Add company bank details
   - Add compliance information

3. **Create Salary Slips**
   - Click "Salary Slips" tab
   - Select employee
   - Enter month and year
   - Add basic salary and allowances
   - Add deductions
   - Click "Generate Slip"
   - Download as PDF or Word!

---

## Summary

| Task | Steps | Time |
|------|-------|------|
| Make user admin via Supabase | Open Supabase → Click is_admin → Change to TRUE | 1 min |
| Make user admin via App | Login admin → Manage Users tab → Make Admin | 2 min |
| Verify it worked | Refresh → Login → Check for tabs | 1 min |
| Start creating salaries | Add employees → Create salary slip → Download | 5 min |

You're all set! 🎉
