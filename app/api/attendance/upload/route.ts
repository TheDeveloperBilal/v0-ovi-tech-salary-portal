import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { parseZKTecoFile, processScans } from '@/lib/attendance-calculations'

interface UploadResponse {
  success: boolean
  recordsProcessed?: number
  employeesMatched?: number
  employeesUnmatched?: string[]
  error?: string
}

/**
 * Match a biometric name (e.g. "Shariq", "Kaif", "27") to a DB employee.
 *
 * Strategy:
 * 1. Exact match on first_name or last_name (case-insensitive)
 * 2. first_name or last_name contains the biometric name
 * 3. Biometric name contains first_name or last_name
 * 4. Match on employee_id field (handles "27" → employee_id "27")
 */
function matchEmployee(
  bioName: string,
  employees: { id: string; employee_id: string; first_name: string; last_name: string }[]
): { id: string; employee_id: string; first_name: string; last_name: string } | null {
  const lower = bioName.toLowerCase().trim()
  if (!lower) return null

  // 1. Exact match on first_name or last_name
  let match = employees.find(
    e =>
      e.first_name?.toLowerCase() === lower ||
      e.last_name?.toLowerCase() === lower
  )
  if (match) return match

  // 2. DB name contains bio name (e.g. "Muhammad Kaif" contains "Kaif")
  match = employees.find(
    e =>
      (e.first_name?.toLowerCase().includes(lower) && lower.length >= 3) ||
      (e.last_name?.toLowerCase().includes(lower) && lower.length >= 3)
  )
  if (match) return match

  // 3. Bio name contains DB name (e.g. "Syed Shariq Shah" contains "Shariq")
  match = employees.find(
    e =>
      (lower.includes(e.first_name?.toLowerCase() || '___') && (e.first_name?.length || 0) >= 3) ||
      (lower.includes(e.last_name?.toLowerCase() || '___') && (e.last_name?.length || 0) >= 3)
  )
  if (match) return match

  // 4. Match on employee_id (handles "27" → employee_id "27")
  match = employees.find(e => e.employee_id === bioName.trim())
  if (match) return match

  return null
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    const supabase = await createClient()

    // ── Auth: verify Bearer token + admin check ──
    const authHeader = request.headers.get('authorization')
    let currentUser = null

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user } } = await supabase.auth.getUser(token)
      currentUser = user
    }

    if (!currentUser) {
      return NextResponse.json<UploadResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', currentUser.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json<UploadResponse>(
        { success: false, error: 'Only admins can upload attendance data' },
        { status: 403 }
      )
    }

    // ── Parse request ──
    const formData = await request.formData()
    const file = formData.get('file') as File
    const month = parseInt(formData.get('month') as string)
    const year = parseInt(formData.get('year') as string)

    if (!file) {
      return NextResponse.json<UploadResponse>(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!month || !year || month < 1 || month > 12) {
      return NextResponse.json<UploadResponse>(
        { success: false, error: 'Invalid month or year' },
        { status: 400 }
      )
    }

    // ── Parse the ZKTeco file ──
    const content = await file.text()
    const rawScans = parseZKTecoFile(content)

    if (rawScans.length === 0) {
      return NextResponse.json<UploadResponse>(
        { success: false, error: 'No valid attendance scans found in file. Check file format.' },
        { status: 400 }
      )
    }

    // ── Process scans into daily records ──
    const processedRecords = processScans(rawScans, month, year)

    if (processedRecords.length === 0) {
      return NextResponse.json<UploadResponse>(
        { success: false, error: `No records found for ${month}/${year}. Check if file contains data for this month.` },
        { status: 400 }
      )
    }

    // ── Fetch employees from DB ──
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, employee_id, first_name, last_name')

    if (empError || !employees || employees.length === 0) {
      return NextResponse.json<UploadResponse>(
        { success: false, error: 'No employees found in database' },
        { status: 400 }
      )
    }

    // ── Match biometric names to DB employees ──
    const nameToEmployee = new Map<string, typeof employees[0]>()
    const unmatchedNames = new Set<string>()
    const uniqueBioNames = [...new Set(processedRecords.map(r => r.employeeName))]

    for (const bioName of uniqueBioNames) {
      const matched = matchEmployee(bioName, employees)
      if (matched) {
        nameToEmployee.set(bioName, matched)
      } else {
        unmatchedNames.add(bioName)
      }
    }

    if (nameToEmployee.size === 0) {
      return NextResponse.json<UploadResponse>(
        {
          success: false,
          error: 'No employee names matched. Unmatched: ' + [...unmatchedNames].join(', '),
          employeesUnmatched: [...unmatchedNames]
        },
        { status: 400 }
      )
    }

    // ── Build DB records ──
    const recordsToSave = processedRecords
      .filter(r => nameToEmployee.has(r.employeeName))
      .map(r => {
        const emp = nameToEmployee.get(r.employeeName)!
        return {
          employee_id: emp.id,
          employee_name: `${emp.first_name} ${emp.last_name}`,
          attendance_date: r.date,
          check_in: r.checkIn,
          check_out: r.checkOut,
          work_hours: r.workHours,
          status: r.status,
          is_late: r.isLate,
          is_early_out: r.isEarlyOut,
          is_absent: r.isAbsent,
          nine_hour_waiver: r.nineHourWaiver,
          month,
          year
        }
      })

    // Deduplicate by employee_id + attendance_date
    const deduped = Array.from(
      new Map(recordsToSave.map(r => [`${r.employee_id}_${r.attendance_date}`, r])).values()
    )

    // ── Delete existing records for this month/year before inserting ──
    // This ensures a clean re-upload replaces old data
    const matchedEmployeeIds = [...new Set(deduped.map(r => r.employee_id))]
    for (const empId of matchedEmployeeIds) {
      await supabase
        .from('attendance_records')
        .delete()
        .eq('employee_id', empId)
        .eq('month', month)
        .eq('year', year)
    }

    // ── Batch insert (Supabase max 1000 per upsert) ──
    const BATCH_SIZE = 500
    let totalSaved = 0

    for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
      const batch = deduped.slice(i, i + BATCH_SIZE)
      const { error: saveError } = await supabase
        .from('attendance_records')
        .insert(batch)

      if (saveError) {
        return NextResponse.json<UploadResponse>(
          { success: false, error: `Failed to save records (batch ${Math.floor(i / BATCH_SIZE) + 1}): ${saveError.message}` },
          { status: 500 }
        )
      }
      totalSaved += batch.length
    }

    return NextResponse.json<UploadResponse>({
      success: true,
      recordsProcessed: totalSaved,
      employeesMatched: nameToEmployee.size,
      employeesUnmatched: [...unmatchedNames]
    })
  } catch (error) {
    return NextResponse.json<UploadResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}
