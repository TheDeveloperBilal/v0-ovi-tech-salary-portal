-- Add leaves column to employees table for tracking annual leaves
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS leaves_taken integer default 0;

-- Add leaves_deducted column to salary_slips table
ALTER TABLE public.salary_slips
ADD COLUMN IF NOT EXISTS leaves_taken integer default 0,
ADD COLUMN IF NOT EXISTS leaves_deducted numeric(12, 2) default 0;

-- Create a view to get remaining leaves for each employee (14 annual leaves)
CREATE OR REPLACE VIEW employee_leaves AS
SELECT 
  e.id,
  e.employee_id,
  e.first_name,
  e.last_name,
  e.email,
  14 as annual_leaves,
  COALESCE(e.leaves_taken, 0) as leaves_taken,
  14 - COALESCE(e.leaves_taken, 0) as remaining_leaves
FROM public.employees e;
