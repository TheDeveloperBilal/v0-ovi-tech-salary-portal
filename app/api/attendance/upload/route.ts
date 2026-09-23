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
 * Match a ZKTeco biometric record to a portal employee.
 *
 * Primary key: biometricId (ZKTeco Account ID) = employee_id on portal.
 * Fallback: name-based matching for any entries that don't match by ID.
 *
 * Strategy (in priority order):
 * 1. Employee ID match — biometricId matches employee_id on portal
 * 2. Exact name match on first_name or last_name (case-insensitive)
 * 3. Partial name match (DB name contains bio name, or vice versa)
 */
function matchEmployee(
  biometricId: string,
  bioName: string,
  employees: { id: string; employee_id: string; first_name: string; last_name: string }[]
): { id: string; employee_id: string; first_name: string; last_name: string } | null {
  // 1. PRIMARY: Match on employee_id (ZKTeco Account ID = portal Employee ID)
  const idMatch = employees.find(e => e.employee_id === biometricId.trim())
  if (idMatch) return idMatch

  // Fallback: name-based matching
  const lower = bioName.toLowerCase().trim()
  if (!lower) return null

  // 2. Exact match on first_name or last_name
  let match = employees.find(
    e =>
      e.first_name?.toLowerCase() === lower ||
      e.last_name?.toLowerCase() === lower
  )
  if (match) return match

  // 3. Partial name match
  match = employees.find(
    e =>
      (e.first_name?.toLowerCase().includes(lower) && lower.length >= 3) ||
      (e.last_name?.toLowerCase().includes(lower) && lower.length >= 3) ||
      (lower.includes(e.first_name?.toLowerCase() || '___') && (e.first_name?.length || 0) >= 3) ||
      (lower.includes(e.last_name?.toLowerCase() || '___') && (e.last_name?.length || 0) >= 3)
  )
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

    // ── Match biometric IDs to portal employees ──
    // Primary: ZKTeco Account ID (biometricId) = portal Employee ID
    const idToEmployee = new Map<string, typeof employees[0]>()
    const unmatchedIds = new Set<string>()
    const uniqueBioIds = [...new Set(processedRecords.map(r => r.biometricId))]

    for (const bioId of uniqueBioIds) {
      // Find the name from the first record with this ID (fallback for name-matching)
      const bioName = processedRecords.find(r => r.biometricId === bioId)?.employeeName || bioId
      const matched = matchEmployee(bioId, bioName, employees)
      if (matched) {
        idToEmployee.set(bioId, matched)
      } else {
        unmatchedIds.add(`${bioId} (${bioName})`)
      }
    }

    if (idToEmployee.size === 0) {
      return NextResponse.json<UploadResponse>(
        {
          success: false,
          error: 'No employees matched. Unmatched IDs: ' + [...unmatchedIds].join(', '),
          employeesUnmatched: [...unmatchedIds]
        },
        { status: 400 }
      )
    }

    // ── Build DB records — employee name comes from portal, not biometric file ──
    const recordsToSave = processedRecords
      .filter(r => idToEmployee.has(r.biometricId))
      .map(r => {
        const emp = idToEmployee.get(r.biometricId)!
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
          year,
          source: 'biometric',
        }
      })

    // Deduplicate by employee_id + attendance_date
    const deduped = Array.from(
      new Map(recordsToSave.map(r => [`${r.employee_id}_${r.attendance_date}`, r])).values()
    )

    // ── Delete existing biometric records for this month/year before inserting ──
    // Only removes source='biometric' so WFH self-service records survive re-uploads
    const matchedEmployeeIds = [...new Set(deduped.map(r => r.employee_id))]
    for (const empId of matchedEmployeeIds) {
      await supabase
        .from('attendance_records')
        .delete()
        .eq('employee_id', empId)
        .eq('month', month)
        .eq('year', year)
        .eq('source', 'biometric')
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
      employeesMatched: idToEmployee.size,
      employeesUnmatched: [...unmatchedIds]
    })
  } catch (error) {
    return NextResponse.json<UploadResponse>(
      {
        success: false,
        error: 'Failed to process attendance upload'
      },
      { status: 500 }
    )
  }
}
