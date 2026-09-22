-- Phase 2: Fix RLS policies — remove auth.uid() IS NULL bypass and tighten permissions
-- Run in Supabase SQL Editor

-- ═══════════════════════════════════════════════════════════════════════
-- CRITICAL: Remove auth.uid() IS NULL from employees table
-- These policies currently allow unauthenticated requests to modify data
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "employees_delete_admin" ON employees;
CREATE POLICY "employees_delete_admin" ON employees
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "employees_insert_admin" ON employees;
CREATE POLICY "employees_insert_admin" ON employees
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "employees_update_admin" ON employees;
CREATE POLICY "employees_update_admin" ON employees
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- ═══════════════════════════════════════════════════════════════════════
-- Tighten attendance_records: only admins can delete (not any auth user)
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Attendance records deletable by authenticated users" ON attendance_records;
CREATE POLICY "attendance_records_delete_admin" ON attendance_records
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- ═══════════════════════════════════════════════════════════════════════
-- Tighten employees: remove overly broad insert/update for any auth user
-- Admin-only policies above already cover admin operations.
-- Employees should only read, not insert/update via client.
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Employees insertable by authenticated users" ON employees;
DROP POLICY IF EXISTS "Employees updatable by authenticated users" ON employees;

-- ═══════════════════════════════════════════════════════════════════════
-- Tighten salary_slips: only admins can insert (generated server-side)
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Salary slips insertable by authenticated users" ON salary_slips;
CREATE POLICY "salary_slips_insert_admin" ON salary_slips
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- ═══════════════════════════════════════════════════════════════════════
-- Tighten salary_structures: only admins can insert/update
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Salary structures insertable by authenticated users" ON salary_structures;
CREATE POLICY "salary_structures_insert_admin" ON salary_structures
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "Salary structures updatable by authenticated users" ON salary_structures;
CREATE POLICY "salary_structures_update_admin" ON salary_structures
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- ═══════════════════════════════════════════════════════════════════════
-- Tighten company_settings: only admins can update
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Company settings updatable by authenticated users" ON company_settings;
CREATE POLICY "company_settings_update_admin" ON company_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- ═══════════════════════════════════════════════════════════════════════
-- Tighten attendance_summary: only admins can insert/update
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Attendance summary insertable by authenticated users" ON attendance_summary;
CREATE POLICY "attendance_summary_insert_admin" ON attendance_summary
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "Attendance summary updatable by authenticated users" ON attendance_summary;
CREATE POLICY "attendance_summary_update_admin" ON attendance_summary
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- ═══════════════════════════════════════════════════════════════════════
-- Tighten attendance_records: only admins can insert (except WFH self-service)
-- The employees_insert_own_wfh policy already handles WFH inserts
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Attendance records insertable by authenticated users" ON attendance_records;
CREATE POLICY "attendance_records_insert_admin" ON attendance_records
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- Tighten attendance_records update: admin or own WFH record
DROP POLICY IF EXISTS "Attendance records updatable by authenticated users" ON attendance_records;
CREATE POLICY "attendance_records_update_admin" ON attendance_records
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );
