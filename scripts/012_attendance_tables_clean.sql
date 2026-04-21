-- Create attendance_records table for storing attendance data
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  status TEXT DEFAULT 'present', -- present, absent, late, early_out
  is_late BOOLEAN DEFAULT FALSE,
  is_early_out BOOLEAN DEFAULT FALSE,
  is_absent BOOLEAN DEFAULT FALSE,
  worked_hours DECIMAL(4,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, attendance_date)
);

-- Create attendance_summary table for caching monthly calculations
CREATE TABLE IF NOT EXISTS public.attendance_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  total_present INT DEFAULT 0,
  total_absent INT DEFAULT 0,
  total_late INT DEFAULT 0,
  total_early_out INT DEFAULT 0,
  total_worked_hours DECIMAL(6,2) DEFAULT 0,
  leaves_deducted INT DEFAULT 0,
  salary_deduction NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, month, year)
);

-- Enable RLS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_summary ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for attendance_records
CREATE POLICY "Attendance records viewable by authenticated users" ON public.attendance_records
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Attendance records insertable by authenticated users" ON public.attendance_records
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Attendance records updatable by authenticated users" ON public.attendance_records
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Attendance records deletable by authenticated users" ON public.attendance_records
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create RLS policies for attendance_summary
CREATE POLICY "Attendance summary viewable by authenticated users" ON public.attendance_summary
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Attendance summary insertable by authenticated users" ON public.attendance_summary
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Attendance summary updatable by authenticated users" ON public.attendance_summary
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_id ON public.attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON public.attendance_records(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_summary_employee_id ON public.attendance_summary(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_summary_month_year ON public.attendance_summary(month, year);
