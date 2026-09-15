-- Migration: Add source column to attendance_records for WFH self-service
-- Run this in Supabase SQL Editor before deploying the WFH feature

-- Add source column to distinguish biometric vs WFH portal records
ALTER TABLE attendance_records
ADD COLUMN source TEXT NOT NULL DEFAULT 'biometric';

-- Allow employees to insert their own WFH attendance records
CREATE POLICY "employees_insert_own_wfh" ON attendance_records
  FOR INSERT WITH CHECK (
    source = 'wfh_portal'
    AND employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- Allow employees to update their own WFH records (for adding checkout)
CREATE POLICY "employees_update_own_wfh" ON attendance_records
  FOR UPDATE USING (
    source = 'wfh_portal'
    AND employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
  ) WITH CHECK (
    source = 'wfh_portal'
    AND employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
  );
