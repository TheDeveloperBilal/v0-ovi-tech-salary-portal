-- Create attendance_records table
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  attendance_date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  work_hours NUMERIC,
  status TEXT, -- 'On Time', 'Late', 'Early Out', 'Absent'
  is_late BOOLEAN DEFAULT FALSE,
  is_early_out BOOLEAN DEFAULT FALSE,
  is_absent BOOLEAN DEFAULT FALSE,
  nine_hour_waiver BOOLEAN DEFAULT FALSE, -- 9-hour rule waiver
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(employee_id, attendance_date)
);

-- Create index for faster queries by month/year
CREATE INDEX idx_attendance_month_year ON attendance_records(month, year);
CREATE INDEX idx_attendance_employee_date ON attendance_records(employee_id, attendance_date);

-- Enable RLS
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view attendance records
CREATE POLICY "Attendance records viewable by authenticated users"
  ON attendance_records
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS Policy: Users can insert attendance records
CREATE POLICY "Attendance records insertable by authenticated users"
  ON attendance_records
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- RLS Policy: Users can update attendance records
CREATE POLICY "Attendance records updatable by authenticated users"
  ON attendance_records
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Create attendance_summary table for caching calculations
CREATE TABLE IF NOT EXISTS attendance_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_days INTEGER DEFAULT 0,
  present_days INTEGER DEFAULT 0,
  late_count INTEGER DEFAULT 0,
  early_out_count INTEGER DEFAULT 0,
  absent_count INTEGER DEFAULT 0,
  leaves_deducted INTEGER DEFAULT 0,
  total_leaves_deducted NUMERIC DEFAULT 0,
  salary_deduction NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(employee_id, month, year)
);

-- Enable RLS on attendance_summary
ALTER TABLE attendance_summary ENABLE ROW LEVEL SECURITY;

-- RLS policies for attendance_summary
CREATE POLICY "Attendance summary viewable by authenticated users"
  ON attendance_summary
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Attendance summary updatable by authenticated users"
  ON attendance_summary
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Attendance summary updatable by authenticated users"
  ON attendance_summary
  FOR UPDATE
  USING (auth.role() = 'authenticated');
