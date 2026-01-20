# OviTech Salary Portal - Deployment Guide

## Prerequisites
- Vercel account (free tier available)
- Supabase account (free tier available)
- Git repository (GitHub, GitLab, or Bitbucket)

## Step 1: Setup Supabase

1. Go to [Supabase](https://supabase.com) and create a new project
2. After project creation, go to **SQL Editor** and execute the SQL script from `scripts/001_create_tables.sql`
3. Copy your project credentials:
   - Project URL: `Settings > API > Project URL`
   - Anon Key: `Settings > API > Project API keys > anon`
   - Service Role Key: `Settings > API > Project API keys > service_role`

## Step 2: Create Vercel Project

1. Go to [Vercel](https://vercel.com) and sign in
2. Click "Add New" > "Project"
3. Import your Git repository
4. Configure environment variables (see step 3)

## Step 3: Add Environment Variables in Vercel

In Vercel project settings, add these environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Step 4: Deploy

1. Push your code to Git
2. Vercel will automatically deploy on every push
3. Once deployed, your app will have a live URL like: `https://your-app.vercel.app`

## Step 5: Create Admin Account

1. Go to your Supabase project dashboard
2. In **Authentication > Users**, manually add an admin user with email and password
3. Go to the **profiles** table and update the newly created user's role to `admin`
4. Login with the admin account at your Vercel URL

## Key Features

- **Employee Management**: Add, edit, and delete employees
- **Salary Slip Generation**: Create salary slips with custom allowances and deductions
- **PDF Export**: Download salary slips as PDF (feature in progress)
- **Word Export**: Download salary slips as Word documents (feature in progress)
- **Role-Based Access**: Admin and Employee roles with different permissions
- **Row Level Security**: All data protected with RLS policies

## Troubleshooting

### "User not found" error on login
- Make sure the user account exists in Supabase Authentication
- Verify the email address matches exactly

### "Permission denied" when adding employees
- Ensure your user account has the `admin` role in the profiles table
- Check that RLS policies are properly configured

### Database connection errors
- Verify environment variables are correct in Vercel
- Check that Supabase project is active and not paused

## Support

For issues, check the [Next.js documentation](https://nextjs.org/docs) or [Supabase documentation](https://supabase.com/docs).
