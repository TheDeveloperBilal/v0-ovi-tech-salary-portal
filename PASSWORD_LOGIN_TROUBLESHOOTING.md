# Password & Login Troubleshooting Guide

## Issue: Employee Login Shows "Incorrect Password"

If you've created an employee with a password, but the employee is getting an "incorrect password" error, follow these steps:

### Root Cause
The issue is typically related to timing between user authentication creation and the employee database record creation. Supabase needs time for its trigger to create the profile record.

### Quick Fixes

#### Fix 1: Re-create the Employee (Recommended)
1. Go to **Admin Dashboard** → **Employee Management**
2. Find the problematic employee and click **Delete**
3. Click **Add Employee**
4. Fill in all details exactly as before
5. **Important**: Wait 2-3 seconds after clicking "Add Employee" before doing anything else
6. The success message will show the credentials
7. Share the exact password shown in the message with the employee

#### Fix 2: Reset Password from Supabase (If Already Created)
1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Users**
3. Find the employee's email
4. Click the **...** menu and select **Reset password**
5. A password reset email will be sent to the employee
6. Employee should use the reset link to set a new password

#### Fix 3: Test Login Immediately
After adding an employee:
1. Log out from your admin account
2. Try logging in as the new employee using the exact email and password shown
3. If it works, the account is properly created
4. If it fails, wait a few more seconds and try again

### Why This Happens

Supabase authentication and your database have two separate systems:
- **Supabase Auth**: Stores encrypted passwords and handles login
- **Profiles Table**: Stores user metadata (created automatically via trigger)
- **Employees Table**: Stores employee details

The flow is:
1. Admin enters employee details and password
2. App creates Supabase Auth account (this is instant)
3. Supabase trigger creates Profile record (takes ~500-1000ms)
4. App creates Employee record (should happen after profile exists)

If these happen out of order, the employee record can't link properly.

### How We Fixed It

The application now:
1. ✅ Waits 1 second after auth account creation
2. ✅ Adds detailed logging for debugging
3. ✅ Shows better success/error messages
4. ✅ Validates that the user ID is returned from auth

### Testing Your Fix

To verify the password login works:
\`\`\`
1. Employee email: the email you entered
2. Employee password: the password shown in the success message
3. Visit: /auth/login
4. Enter credentials
5. Should be redirected to /employee
\`\`\`

### If Password Still Doesn't Work

1. **Check Supabase Dashboard**:
   - Go to Authentication → Users
   - Verify the employee's email exists
   - Check if account shows as "Confirmed" or "Unconfirmed"
   - If unconfirmed, manually confirm it

2. **Check Employee Record**:
   - Go to SQL Editor in Supabase
   - Run: `SELECT * FROM employees WHERE email = 'employee@email.com';`
   - Verify the record exists with correct user_id

3. **Check Profile Record**:
   - Run: `SELECT * FROM profiles WHERE email = 'employee@email.com';`
   - Verify the profile exists

4. **Clear Browser Cache**:
   - Clear cookies and site data for your domain
   - Try logging in again in incognito/private window

### Getting Help

If the issue persists:
1. Check the browser console (F12 → Console tab)
2. Look for errors marked with `[v0]`
3. Take a screenshot of the error
4. Note the exact email that's failing to log in

## Password Security Notes

- Passwords are never stored in the database
- Supabase Auth encrypts passwords securely
- Only the salted hash is stored in Supabase
- Passwords shown to admins are temporary - employees should change them on first login
- Consider implementing "Force password change on first login" feature

## Preventing Future Issues

1. **After adding employee**: Wait 2-3 seconds before closing the dialog
2. **Share password**: Immediately share the password shown in the success message
3. **Test first**: Try logging in yourself before sending credentials to employee
4. **Use password reset**: For future password changes, use Supabase password reset instead of re-creating accounts

## Employee Password Reset Process

If an employee forgets their password:
1. Employee goes to login page
2. Clicks "Don't have an account?" → but actually just enters email on login
3. They click a "Forgot password?" link (if implemented)
4. Reset email is sent
5. They create a new password via the link

To implement this, add a forgot password link on the login page.

---

**Last Updated**: January 2026
**Related Files**: components/employee-management.tsx, app/auth/login/page.tsx
