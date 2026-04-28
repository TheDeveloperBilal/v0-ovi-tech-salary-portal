# Attendance & Payroll Integration - Complete Implementation Guide

## Overview
The Attendance & Payroll Logic has been successfully integrated into your payroll portal as a full-stack feature. All attendance data is now persisted in the database and can be retrieved by selecting a month/year.

## What Was Implemented

### 1. Database Schema
- **attendance_records** table: Stores individual attendance records with calculated statuses
  - Columns: employee_name, attendance_date, check_in, check_out, work_hours, status, is_late, is_early_out, is_absent, nine_hour_waiver
  - Upserts data based on employee_name + date combination
  
- **attendance_summary** table: Caches monthly calculations for performance
  - Columns: employee_id, month, year, total_days, present_days, late_count, early_out_count, absent_count, leaves_deducted

### 2. Business Rules Implemented
All business logic from the original HTML tool is preserved:

- **Office Hours**: 11:00 AM – 8:00 PM (15 min grace period)
- **9th Hour Rule**: If employee is late but works ≥9 hours, "Late In" violation is waived
- **Missing Check-Outs**: Days with only one scan are marked as "Early Out"
- **Leave Deduction Formula**:
  - 1 Absent = 1 leave
  - 3 combined (Late + Early Out violations) = 1 leave
- **Payroll Calculation**: Salary / 30 * Total Leaves Deducted

### 3. Component Architecture

#### AttendanceManager Component (`components/attendance-manager.tsx`)
- Month/Year selector dropdowns for easy data retrieval
- File upload (CSV/XLSX) with automatic parsing
- Real-time search by employee name
- Dynamic summary cards showing:
  - Total Days, Present, Late, Early Out, Absent, Leaves Deducted
- Attendance records table with status indicators
- "Apply Leaves to Payroll" button to calculate and update leaves

#### API Routes

1. **POST /api/attendance/upload**
   - Accepts CSV/XLSX files
   - Parses attendance data
   - Upserts to database based on employee_name + date
   - Returns record count

2. **GET /api/attendance/records**
   - Retrieves attendance for selected month/year
   - Accepts query params: month, year
   - Returns filtered records

3. **DELETE /api/attendance/records**
   - Deletes individual attendance records
   - Accepts recordId in request body

4. **POST /api/attendance/calculate-leaves**
   - Calculates leaves deducted based on attendance rules
   - Updates employee's leaves_taken count in database
   - Stores summary in attendance_summary table
   - Called for each employee when "Apply Leaves to Payroll" is clicked

### 4. Library Functions (`lib/attendance-calculations.ts`)
- `processAttendanceRecord()`: Calculates all statuses (late, early_out, absent, nine_hour_waiver)
- Core calculation logic with all business rules
- Handles time parsing and work hour computation

### 5. Dashboard Integration
- New "Attendance" tab added to admin dashboard
- Accessible via Dashboard → Attendance
- Fully responsive UI using Tailwind CSS and shadcn/ui components

## How to Use

### Step 1: Upload Attendance File
1. Go to Dashboard → Attendance
2. Select Month and Year from dropdowns
3. Click "Upload File" and select your CSV or XLSX file
4. File should have columns: Employee Name, Date, Check In, Check Out
5. Records are automatically parsed and saved to database

### Step 2: Review Attendance Data
- All records appear in the table below
- Search by employee name using the search box
- View calculated statuses (On Time, Late, Early Out, Absent)
- See 9-hour waiver indicators

### Step 3: Apply Leaves to Payroll
1. After uploading, click "Apply Leaves to Payroll"
2. System automatically:
   - Calculates absences (1 = 1 leave)
   - Calculates violations (3 combined = 1 leave)
   - Updates employee's leaves_taken count
   - Stores monthly summary for records
3. Leaves are now reflected in salary calculations

### Step 4: Generate Salary Slips
- Go to Dashboard → Salary Slips
- Salary calculations now include leave deductions based on attendance
- For each employee: Salary / 30 * Total Leaves Deducted

## Data Persistence
- All uploaded attendance data is stored in Supabase
- Month/Year selectors load existing data automatically
- No need to re-upload files for the same month
- Historical data is preserved for future reference

## Search & Filtering
- Search box filters records by employee name
- Month/Year selectors reload data automatically
- Summary cards update dynamically based on selected month

## Integration with Payroll
The attendance system is fully integrated with your salary calculation system:
1. Attendance is recorded and status calculated
2. Leave deductions are computed from attendance rules
3. Employee's leaves_taken count is updated
4. Salary slips automatically deduct leave amounts

## File Locations
- Component: `/components/attendance-manager.tsx`
- Calculations: `/lib/attendance-calculations.ts`
- API Routes: `/app/api/attendance/*`
- Database Schema: `/scripts/012_attendance_tables_clean.sql`

## Features
✓ CSV/XLSX file upload with parsing
✓ Automatic upsert to database
✓ Month/Year selector with data persistence
✓ Dynamic search and filtering
✓ All business rules implemented
✓ Automatic leave calculation
✓ Payroll integration
✓ Responsive UI design
✓ Toast notifications for user feedback
✓ Salary slip integration

Your attendance system is now fully operational and integrated with your payroll portal!
