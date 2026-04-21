// lib/attendance-calculations.ts
// Business Logic for Attendance & Leave Calculations

export const OFFICE_START = { hour: 11, minute: 0 }; // 11:00 AM
export const OFFICE_END = { hour: 20, minute: 0 }; // 8:00 PM (20:00)
export const GRACE_MINUTES = 15;
export const MIN_HOURS_FOR_WAIVER = 9; // 9-hour rule

export interface AttendanceRecord {
  employeeName: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkIn: string | null; // HH:MM format
  checkOut: string | null; // HH:MM format
}

export interface ProcessedAttendance {
  employeeName: string;
  employeeId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  workHours: number;
  status: 'On Time' | 'Late' | 'Early Out' | 'Absent';
  isLate: boolean;
  isEarlyOut: boolean;
  isAbsent: boolean;
  nineHourWaiver: boolean;
}

// Convert time string (HH:MM) to minutes since midnight
function timeToMinutes(timeStr: string | null): number | null {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Convert minutes to HH:MM format
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

// Get office start and end times in minutes
function getOfficeStartMinutes(): number {
  return OFFICE_START.hour * 60 + OFFICE_START.minute;
}

function getOfficeEndMinutes(): number {
  return OFFICE_END.hour * 60 + OFFICE_END.minute;
}

// Calculate work hours
function calculateWorkHours(checkInStr: string | null, checkOutStr: string | null): number {
  if (!checkInStr || !checkOutStr) return 0;

  const checkInMin = timeToMinutes(checkInStr);
  const checkOutMin = timeToMinutes(checkOutStr);

  if (checkInMin === null || checkOutMin === null) return 0;

  // Handle case where checkout is next day (after midnight)
  if (checkOutMin < checkInMin) {
    return (24 * 60 - checkInMin + checkOutMin) / 60;
  }

  return (checkOutMin - checkInMin) / 60;
}

// Determine attendance status based on office rules
export function determineStatus(
  checkIn: string | null,
  checkOut: string | null
): {
  status: ProcessedAttendance['status'];
  isLate: boolean;
  isEarlyOut: boolean;
  isAbsent: boolean;
  nineHourWaiver: boolean;
} {
  // No check-in and no check-out = Absent
  if (!checkIn && !checkOut) {
    return {
      status: 'Absent',
      isLate: false,
      isEarlyOut: false,
      isAbsent: true,
      nineHourWaiver: false,
    };
  }

  // Only check-in (no check-out) = Early Out
  if (checkIn && !checkOut) {
    return {
      status: 'Early Out',
      isLate: false,
      isEarlyOut: true,
      isAbsent: false,
      nineHourWaiver: false,
    };
  }

  // Only check-out (no check-in) = Early Out
  if (!checkIn && checkOut) {
    return {
      status: 'Early Out',
      isLate: false,
      isEarlyOut: true,
      isAbsent: false,
      nineHourWaiver: false,
    };
  }

  // Both check-in and check-out exist
  const checkInMin = timeToMinutes(checkIn)!;
  const checkOutMin = timeToMinutes(checkOut)!;
  const officeStartMin = getOfficeStartMinutes();
  const officeEndMin = getOfficeEndMinutes();
  const workHours = calculateWorkHours(checkIn, checkOut);

  let isLate = false;
  let isEarlyOut = false;
  let nineHourWaiver = false;

  // Check if late (beyond grace period)
  if (checkInMin > officeStartMin + GRACE_MINUTES) {
    isLate = true;

    // Apply 9-hour rule: if worked ≥9 hours, waive the late violation
    if (workHours >= MIN_HOURS_FOR_WAIVER) {
      isLate = false;
      nineHourWaiver = true;
    }
  }

  // Check if early out
  if (checkOutMin < officeEndMin) {
    isEarlyOut = true;
  }

  // Determine final status
  let status: ProcessedAttendance['status'] = 'On Time';
  if (isLate) status = 'Late';
  else if (isEarlyOut) status = 'Early Out';

  return {
    status,
    isLate,
    isEarlyOut,
    isAbsent: false,
    nineHourWaiver,
  };
}

// Process raw attendance data
export function processAttendanceRecord(record: AttendanceRecord): ProcessedAttendance {
  const { status, isLate, isEarlyOut, isAbsent, nineHourWaiver } = determineStatus(
    record.checkIn,
    record.checkOut
  );

  const workHours = calculateWorkHours(record.checkIn, record.checkOut);

  return {
    employeeName: record.employeeName,
    employeeId: record.employeeId,
    date: record.date,
    checkIn: record.checkIn,
    checkOut: record.checkOut,
    workHours: parseFloat(workHours.toFixed(2)),
    status,
    isLate,
    isEarlyOut,
    isAbsent,
    nineHourWaiver,
  };
}

// Calculate leave deductions based on attendance summary
export interface LeaveCalculation {
  absent: number; // 1 absent = 1 leave
  lateAndEarlyOut: number; // 3 combined = 1 leave
  totalLeavesDeducted: number;
}

export function calculateLeaveDeductions(
  lateCount: number,
  earlyOutCount: number,
  absentCount: number
): LeaveCalculation {
  const absent = absentCount; // 1 absent = 1 leave
  const combinedViolations = lateCount + earlyOutCount;
  const lateAndEarlyOut = Math.floor(combinedViolations / 3); // 3 combined = 1 leave

  return {
    absent,
    lateAndEarlyOut,
    totalLeavesDeducted: absent + lateAndEarlyOut,
  };
}

// Calculate salary deduction
export function calculateSalaryDeduction(
  baseSalary: number,
  totalLeavesDeducted: number
): number {
  return (baseSalary / 30) * totalLeavesDeducted;
}
