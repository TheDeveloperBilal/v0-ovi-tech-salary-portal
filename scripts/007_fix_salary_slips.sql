-- Add leaves_deducted column to salary_slips table if it doesn't exist
ALTER TABLE public.salary_slips
ADD COLUMN IF NOT EXISTS leaves_deducted integer DEFAULT 0;

-- Ensure leaves_taken column exists on employees table
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS leaves_taken integer DEFAULT 0;

-- Create index on salary_slips for better query performance
CREATE INDEX IF NOT EXISTS idx_salary_slips_employee_id ON public.salary_slips(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_slips_year_month ON public.salary_slips(year, month);

-- Verify the columns exist
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'salary_slips' 
ORDER BY ordinal_position;
