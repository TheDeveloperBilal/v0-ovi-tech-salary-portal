-- Migration 025: Add role column to profiles for RBAC
--
-- Replaces the binary is_admin boolean with a proper role system.
-- Roles: admin, hr, manager, employee
--
-- SAFE: Backward-compatible. is_admin remains for existing code that checks it.
-- The role column defaults to 'employee', and existing admins get 'admin'.
-- Run in Supabase Dashboard → SQL Editor

-- Step 1: Add role column
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'employee';

-- Step 2: Sync existing admins
UPDATE public.profiles
SET role = 'admin'
WHERE is_admin = true AND role = 'employee';

-- Step 3: Create index for role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Step 4: Add a check constraint for valid roles
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS chk_profiles_role;

ALTER TABLE public.profiles
ADD CONSTRAINT chk_profiles_role
CHECK (role IN ('admin', 'hr', 'manager', 'employee'));
