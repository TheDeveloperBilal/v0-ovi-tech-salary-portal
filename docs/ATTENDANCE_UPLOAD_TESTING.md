// ATTENDANCE UPLOAD - COMPREHENSIVE TESTING GUIDE
// This document outlines all testing procedures for the attendance file upload feature

# Phase 4: Testing Procedures

## Test Environment Setup
- Browser: Open DevTools Console (F12)
- File used: March attendance data (marchattandance-AUPvO.txt)
- Expected outcome: 490+ records successfully uploaded

## Unit Test Cases

### Test 1: Valid File Upload (CRITICAL)
**Objective:** Verify all valid records are parsed and saved correctly
**Setup:** 
  - Month: 03, Year: 2026
  - File: marcattendance-AUPvO.txt
**Steps:**
  1. Open Attendance tab in admin dashboard
  2. Select March 2026 from month/year selector
  3. Click "Upload File"
  4. Select the attendance file
**Expected Results:**
  - Client validation passes: "File Valid - Processing XXX rows"
  - Server logs show: delimiter detection, column parsing, employee lookup
  - Success toast: "Successfully uploaded XXX records"
  - Records appear in attendance table
**Pass Criteria:** 
  - All 490+ records uploaded
  - No "Missing required fields" errors
  - Attendance summary stats display correctly

### Test 2: File Encoding & Delimiter Detection
**Objective:** Verify multi-delimiter support and encoding handling
**Debug Steps:**
  1. Open browser DevTools → Console tab
  2. Upload file and check for [v0] logs
  3. Look for "Delimiter detection" log showing detected delimiter
  4. Verify first 3 rows are logged with column breakdown
**Expected Logs:**
  - `[v0] First line length: X`
  - `[v0] Character breakdown: [0]="1", [1]="TAB", [2]="2"...`
  - `[v0] Detected delimiter: "TAB" (count: 8)`
  - `[v0] Row 1: Found 9 columns`
**Pass Criteria:** 
  - Delimiter correctly identified as TAB
  - All 9 columns found
  - No undefined columns in logs

### Test 3: Employee Lookup Validation
**Objective:** Verify employees are correctly matched from database
**Debug Steps:**
  1. Check server logs for employee lookup: "Parsing complete - Records created: X"
  2. Compare employee IDs in file with database
**Expected Results:**
  - All employee IDs from file are found in database
  - Employee names correctly populated
  - No "Employee ID not found" errors
**Pass Criteria:** 
  - 0 "Employee not found" errors
  - All records have valid employee_name field

### Test 4: Data Validation
**Objective:** Verify datetime parsing and field validation
**Expected:**
  - All dates in March 2026 format: YYYY-MM-DD
  - All times in HH:MM:SS format
  - I/O types are either "I" (In) or "O" (Out)
  - No NULL values in required fields
**Pass Criteria:**
  - No datetime parsing errors
  - No malformed records in database

### Test 5: Error Handling - Missing Employee
**Objective:** Verify graceful handling of unknown employee IDs
**Setup:**
  1. Create a test file with a non-existent employee ID (e.g., "9999")
  2. Upload the file
**Expected Results:**
  - Upload partially succeeds (valid records saved)
  - Error message shows: "Employee ID '9999' not found in database"
  - Shows sample errors with row numbers
**Pass Criteria:**
  - Valid records still uploaded
  - Clear error message for missing employees

### Test 6: Wrong Month/Year Filtering
**Objective:** Verify records from wrong month are skipped
**Setup:**
  1. Upload March 2026 file
  2. Select April 2026 from dropdown
  3. Try uploading same file again
**Expected:**
  - Error: "No valid records found"
  - Explanation: No records match April 2026
**Pass Criteria:**
  - Month filtering works correctly
  - No cross-month contamination

### Test 7: File Size Limits
**Objective:** Verify file size validation
**Setup:** Try uploading file > 10MB
**Expected:** 
  - Error: "File size exceeds 10MB limit"
**Pass Criteria:** Proper error message before upload attempt

### Test 8: File Type Validation
**Objective:** Verify only .txt and .csv accepted
**Setup:** Try uploading .xls or .xlsx file
**Expected:**
  - Error: "File must be .txt or .csv format"
**Pass Criteria:** Proper file type rejection

## Integration Test Cases

### Test 9: Database Upsert (Idempotency)
**Objective:** Verify uploading same file twice replaces old data
**Steps:**
  1. Upload March attendance file - records saved
  2. Upload same file again
  3. Check attendance_date = "2026-03-03" record count (should not double)
**Expected:** Record count stays same, old data replaced
**Pass Criteria:** Idempotent upload - safe to re-upload

### Test 10: Data Consistency After Upload
**Objective:** Verify salary slip reflects attendance-based leaves
**Steps:**
  1. Upload March attendance
  2. Click "Apply Leaves to Payroll"
  3. Generate salary slip for affected employee
**Expected:**
  - Leave counts updated based on attendance
  - Salary deductions reflect calculated leaves
**Pass Criteria:** Payroll integration works correctly

### Test 11: Search & Filter Functionality
**Objective:** Verify attendance records can be searched and filtered
**Steps:**
  1. Upload file
  2. Search for employee name
  3. Search for specific date
  4. Filter by status (Late, Early Out, Absent)
**Expected:** All filters work, show correct records
**Pass Criteria:** Search/filter returns expected results

### Test 12: Summary Stats Accuracy
**Objective:** Verify attendance statistics are correctly calculated
**Steps:**
  1. Upload file
  2. Check summary cards: Total Days, Present, Absent, Late
  3. Verify against raw data
**Expected:** Math is correct
**Pass Criteria:** Stats match calculated values

## Edge Case Tests

### Test 13: Empty File
**Setup:** Upload file with 0 data rows
**Expected:** Error "No data found in file"

### Test 14: Duplicate Records in File
**Setup:** File has same employee, same date twice (both I and O)
**Expected:** Records aggregated into single entry with both check-in and check-out

### Test 15: Missing Check-Out
**Setup:** Employee only has check-in, no check-out for a day
**Expected:** Marked as "Early Out"

### Test 16: Missing Check-In
**Setup:** Employee only has check-out, no check-in for a day
**Expected:** Marked as "Early Out"

### Test 17: Late Employee with 9+ Hour Work
**Setup:** Employee is late but works 9+ hours (9-hour waiver rule)
**Expected:** "Late" violation waived, shows nine_hour_waiver = true

### Test 18: File with Inconsistent Delimiters
**Setup:** Create file with mixed tabs and pipes
**Expected:** API detects and uses primary delimiter

## Performance Tests

### Test 19: Large File Upload (1000+ rows)
**Setup:** Upload large attendance file
**Expected:** 
  - Completes within 30 seconds
  - No memory issues
  - All records processed
**Pass Criteria:** Upload completes successfully

### Test 20: Bulk Employee Lookup
**Setup:** Upload file with all 100+ employees
**Expected:**
  - Database queries optimized with caching
  - Reasonable response time
**Pass Criteria:** Fast response despite many lookups

## Console Debugging Checklist

When debugging, look for these [v0] logs:

```
✓ [v0] Upload started - File: xxx, Size: xxx, Month: 3, Year: 2026
✓ [v0] File read complete - Total lines: 490
✓ [v0] First line length: XX
✓ [v0] Character breakdown: [0]="1"(49), [1]="TAB"(9), [2]="2"(50)...
✓ [v0] Delimiter detection - Tabs: 8, Pipes: 0, Commas: 0, Multi-space: 0
✓ [v0] Detected delimiter: "TAB" (count: 8)
✓ [v0] Row 1: Found 9 columns
✓ [v0] Row 1 data: Col[0]="1", Col[1]="2", Col[2]="2026-03-03 09:58:09", Col[6]="I"
✓ [v0] Parsing complete - Records created: XXX, Errors: X
✓ [v0] Upload successful - XXX records saved
```

If you see undefined columns:
```
✗ [v0] Row 1 data: Col[0]="1", Col[1]="undefined", Col[2]="undefined", Col[6]="undefined"
→ Delimiter detection failed - check file encoding
```

## Rollback/Recovery

If upload fails:
1. Check console logs for [v0] messages
2. Verify file format matches expected structure
3. Delete partially uploaded records if needed
4. Try uploading again with corrected file

## Success Criteria Summary

| Test | Pass Criteria | Status |
|------|---------------|--------|
| 1 | 490+ records uploaded successfully | TBD |
| 2 | Delimiter correctly detected | TBD |
| 3 | All employees matched from database | TBD |
| 4 | No datetime parsing errors | TBD |
| 5 | Graceful error handling for missing employees | TBD |
| 6 | Month filtering works | TBD |
| 7 | File size validation | TBD |
| 8 | File type validation | TBD |
| 9 | Idempotent uploads (safe re-upload) | TBD |
| 10 | Payroll integration works | TBD |
| 11 | Search/filter functionality | TBD |
| 12 | Stats calculations accurate | TBD |
| 13-18 | Edge cases handled correctly | TBD |
| 19-20 | Performance acceptable | TBD |

## Post-Upload Verification

After successful upload:
1. Check attendance_records table: `SELECT COUNT(*) FROM attendance_records WHERE month=3 AND year=2026`
2. Verify no NULL values in required columns
3. Check summary stats in UI match database
4. Run "Apply Leaves to Payroll" to verify payroll integration
5. Generate salary slip to verify leave deductions applied
