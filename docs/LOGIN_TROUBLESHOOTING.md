# OviTech Salary Portal - Login Troubleshooting Guide

## Problem: Can't Sign In / Login Not Working

If you're entering correct credentials but:
- Login button doesn't respond
- Getting error messages
- Not redirecting to dashboard
- Nothing happens when clicking Login

Follow this guide to fix it.

---

## Step 1: Check Environment Variables

### In v0 Preview:
1. Click the **Vars** tab in the left sidebar
2. Look for these two variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Both must have values (not empty)

If they're missing:
1. Go to Supabase Dashboard
2. Navigate to **Settings > API**
3. Copy the values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Add them to v0 in the **Vars** section

### If Deployed to Vercel:
1. Go to Vercel Dashboard
2. Select your project
3. Go to **Settings > Environment Variables**
4. Verify both variables are set with correct values
5. Redeploy if you just added them

---

## Step 2: Check Browser Console for Errors

1. Open browser DevTools: Press **F12**
2. Go to **Console** tab
3. Try to login
4. Look for messages starting with **[v0]** - these are debug messages
5. Check for any red error messages

### Common Errors:

**"Failed to load "@supabase/ssr""**
- Solution: Refresh the page (Ctrl+Shift+R)
- If persists: Environment variables not set

**"Invalid login credentials"**
- Your email/password is wrong
- Check Supabase for the correct user

**"Unexpected error"**
- Network issue or Supabase is down
- Try again in a few seconds

**"No user data returned"**
- User doesn't exist in Supabase
- Create account first with Sign Up

---

## Step 3: Verify User Exists in Supabase

1. Go to **Supabase Dashboard**
2. Navigate to **Authentication > Users**
3. Check if your email exists
4. If not, you need to sign up first (not login)

### If user exists but login fails:
1. Check the password is correct
2. Try resetting password in Supabase
3. Or delete user and create new one via Sign Up

---

## Step 4: Test with Debug Page

1. Go to `/debug` page in your app
2. It shows environment variables status
3. If variables are red "NOT SET":
   - Environment variables are missing
   - Add them to Vars section
4. If variables are green and set:
   - Environment is fine
   - Problem is with user/password

---

## Step 5: Common Solutions

### Solution 1: User Doesn't Exist
- Go to `/auth/sign-up`
- Create a new account
- Then try logging in

### Solution 2: Wrong Password
- Try resetting password in Supabase:
  1. Go to Supabase Dashboard
  2. Auth > Users
  3. Click on your user
  4. Reset password via email

### Solution 3: Environment Variables Missing
- Click **Vars** in left sidebar
- Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Get values from Supabase Settings > API
- Refresh the app

### Solution 4: Browser Cache Issue
- Hard refresh: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)
- Or clear browser cache entirely

---

## Step 6: If Still Not Working

### Check Supabase Logs:
1. Go to Supabase Dashboard
2. Go to **Logs** section
3. Look for authentication errors
4. Check if user is trying to login

### Check Network Tab:
1. Open DevTools (F12)
2. Go to **Network** tab
3. Try to login
4. Look for failed requests to Supabase
5. Check the response for error details

### Contact Support:
If none of the above works:
1. Note down exact error message from console
2. Check `/debug` page for environment variable status
3. Open Supabase dashboard and check authentication logs
4. Try creating new test user and logging in

---

## Quick Checklist

- [ ] Environment variables set in Vars section
- [ ] NEXT_PUBLIC_SUPABASE_URL has value
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY has value  
- [ ] User exists in Supabase Auth > Users
- [ ] Email and password are correct
- [ ] Browser cache cleared (Ctrl+Shift+R)
- [ ] Console shows no errors (F12)
- [ ] Try Sign Up page if user doesn't exist

---

## Example: Step-by-Step Login Fix

**Scenario: Login button doesn't work**

1. Open browser console (F12)
2. Go to `/debug` page
3. Check if environment variables show green
   - If red: Add them from Supabase Settings > API to Vars section
   - If green: Continue to step 4
4. Go to Supabase > Authentication > Users
5. Search for your email
   - If found: Your password might be wrong, try Sign Up again
   - If not found: Go to Sign Up page and create account
6. Go back to login and try again
7. Check console for [v0] debug messages

---

## Success! You're Logged In

Once you see the dashboard:
- You're successfully logged in
- You can now manage employees
- Create salary slips
- Download PDFs

If you're an admin (`is_admin = TRUE` in Supabase profiles table), you'll see:
- Admin dashboard with all features
- Employee management
- Salary slip creation
- Company settings

If not admin, you'll see:
- Your profile
- Your salary slips (view only)
