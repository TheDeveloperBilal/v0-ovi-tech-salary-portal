-- Add is_probation column to salary_slips table
ALTER TABLE salary_slips ADD COLUMN is_probation BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN salary_slips.is_probation IS 'Flag indicating if the employee was on probation when this salary slip was created';
