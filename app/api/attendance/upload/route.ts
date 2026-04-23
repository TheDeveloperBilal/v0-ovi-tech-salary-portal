import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { processAttendanceRecord } from '@/lib/attendance-calculations'

interface UploadResponse {
  success: boolean
  recordsProcessed?: number
  error?: string
  errors?: string[]
  details?: {
    totalLines: number
    totalErrors: number
    sampleErrors?: string[]
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const month = parseInt(formData.get('month') as string)
    const year = parseInt(formData.get('year') as string)

    if (!file) {
      return NextResponse.json<UploadResponse>(
        { success: false, error: 'No file provided', errors: [] },
        { status: 400 }
      )
    }

    if (!month || !year) {
      return NextResponse.json<UploadResponse>(
        { success: false, error: 'Month and year required', errors: [] },
        { status: 400 }
      )
    }

    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim().length > 0)

    if (lines.length === 0) {
      return NextResponse.json<UploadResponse>(
        { success: false, error: 'No data in file', errors: [], details: { totalLines: 0, totalErrors: 0 } },
        { status: 400 }
      )
    }

    const records: any[] = []
    const errors: string[] = []
    const employeeCache: { [key: string]: any } = {}
    const MAX_ERRORS = 100

    for (let i = 0; i < lines.length; i++) {
      try {
        const line = lines[i].trim()
        if (!line) continue

        // Split by tabs first, then by multiple spaces
        let columns = line.split('\t')
        if (columns.length < 5) {
          columns = line.split(/\s+/)
        }

        // EXACT COLUMN MAPPING (0-indexed, tab-separated):
        // Index 0: Internal ID (ignored)
        // Index 1: TIMESTAMP (e.g., "2026-03-03 09:58:09") - MUST SPLIT into date and time
        // Index 2: Numeric code (ignored) - e.g., 101
        // Index 3: Numeric code (ignored) - e.g., 1
        // Index 4: EMPLOYEE NAME (e.g., "Hamza", "Bilal")
        // Index 5: PUNCH TYPE (e.g., "I" for In, "O" for Out)

        const rawTimestamp = columns[1]?.trim()
        const employeeName = columns[4]?.trim()
        const punchType = columns[5]?.trim()

        // Split the combined timestamp into date and time
        let dateOnly = ''
        let timeOnly = ''
        if (rawTimestamp) {
          const timestampParts = rawTimestamp.split(' ')
          dateOnly = timestampParts[0] || ''
          timeOnly = timestampParts[1] || ''
        }

        // Validate required fields
        if (!dateOnly || !timeOnly || !employeeName || !punchType) {
          if (errors.length < MAX_ERRORS) {
            errors.push(`Row ${i + 1}: Missing required fields - Timestamp: ${rawTimestamp}, Name: ${employeeName}, Type: ${punchType}`)
          }
          continue
        }

        // Validate date format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
          if (errors.length < MAX_ERRORS) {
            errors.push(`Row ${i + 1}: Invalid date format "${dateOnly}" - expected YYYY-MM-DD`)
          }
          continue
        }

        // Validate time format (HH:MM:SS)
        if (!/^\d{2}:\d{2}:\d{2}$/.test(timeOnly)) {
          if (errors.length < MAX_ERRORS) {
            errors.push(`Row ${i + 1}: Invalid time format "${timeOnly}" - expected HH:MM:SS`)
          }
          continue
        }

        // Validate I/O type
        if (!['I', 'O'].includes(punchType)) {
          if (errors.length < MAX_ERRORS) {
            errors.push(`Row ${i + 1}: Invalid punch type "${punchType}" - must be I or O`)
          }
          continue
        }

        // Parse and validate date
        const dateParts = dateOnly.split('-').map(Number)
        const dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2])
        
        if (dateObj.getMonth() + 1 !== month || dateObj.getFullYear() !== year) {
          continue
        }

        // Combine date and time for attendance timestamp
        const attendanceTimestamp = `${dateOnly} ${timeOnly}`

        // Look up employee by name
        let employeeData = employeeCache[employeeName]

        if (!employeeData) {
          // Search for employee by name in database
          const { data: employee, error: queryError } = await supabase
            .from('employees')
            .select('id, employee_id, first_name, last_name')
            .or(`first_name.ilike.${employeeName},last_name.ilike.${employeeName}`)
            .limit(1)
            .maybeSingle()

          if (queryError || !employee) {
            if (errors.length < MAX_ERRORS) {
              errors.push(`Row ${i + 1}: Employee "${employeeName}" not found in database`)
            }
            continue
          }

          employeeData = employee
          employeeCache[employeeName] = employee
        }

        // Aggregate check-in/check-out for same day
        const existingRecord = records.find(
          r => r.employee_id === employeeData.id && r.attendance_date === dateOnly
        )

        if (existingRecord) {
          if (punchType === 'I' && !existingRecord.check_in) {
            existingRecord.check_in = timeOnly
          } else if (punchType === 'O' && !existingRecord.check_out) {
            existingRecord.check_out = timeOnly
          }
        } else {
          records.push({
            employee_id: employeeData.id,
            employee_name: `${employeeData.first_name} ${employeeData.last_name}`,
            attendance_date: dateOnly,
            check_in: punchType === 'I' ? timeOnly : null,
            check_out: punchType === 'O' ? timeOnly : null,
            month,
            year,
          })
        }
      } catch (error) {
        if (errors.length < MAX_ERRORS) {
          errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Parsing error'}`)
        }
      }
    }

    if (records.length === 0) {
      return NextResponse.json<UploadResponse>(
        {
          success: false,
          error: 'No valid records to process',
          errors: errors.slice(0, 10),
          details: { totalLines: lines.length, totalErrors: errors.length, sampleErrors: errors.slice(0, 3) }
        },
        { status: 400 }
      )
    }

    // Process records with attendance calculations
    const processedRecords = []
    for (const record of records) {
      const processed = processAttendanceRecord({
        employeName: record.employee_name,
        employeeId: record.employee_id,
        date: record.attendance_date,
        checkIn: record.check_in,
        checkOut: record.check_out,
      })

      processedRecords.push({
        employee_id: record.employee_id,
        employee_name: record.employee_name,
        attendance_date: record.attendance_date,
        check_in: record.check_in,
        check_out: record.check_out,
        work_hours: processed.workHours,
        status: processed.status,
        is_late: processed.isLate,
        is_early_out: processed.isEarlyOut,
        is_absent: processed.isAbsent,
        nine_hour_waiver: processed.nineHourWaiver,
        month: record.month,
        year: record.year,
      })
    }

    // Upsert to database
    const { error: upsertError } = await supabase
      .from('attendance_records')
      .upsert(processedRecords, { onConflict: 'employee_id,attendance_date' })

    if (upsertError) {
      return NextResponse.json<UploadResponse>(
        { success: false, error: 'Failed to save records', errors: [upsertError.message] },
        { status: 500 }
      )
    }

    console.log(`[v0] Upload successful: ${processedRecords.length} records`)
    return NextResponse.json<UploadResponse>({
      success: true,
      recordsProcessed: processedRecords.length,
      errors: errors.slice(0, 10),
      details: { totalLines: lines.length, totalErrors: errors.length, sampleErrors: errors.slice(0, 3) }
    })
  } catch (error) {
    console.error('[v0] Upload error:', error)
    return NextResponse.json<UploadResponse>(
      { success: false, error: 'File processing failed', errors: [error instanceof Error ? error.message : 'Unknown error'] },
      { status: 500 }
    )
  }
}
