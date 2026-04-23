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

/**
 * Intelligently detect which columns contain the required data by analyzing the first few rows
 */
function detectColumnStructure(firstRows: string[][]): { employeeIdCol: number; dateTimeCol: number; ioTypeCol: number } {
  // Look for datetime pattern (YYYY-MM-DD HH:MM:SS)
  const dateTimePattern = /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/

  // Look for I/O type (should be 'I' or 'O')
  const ioTypePattern = /^[IO]$/

  let employeeIdCol = -1
  let dateTimeCol = -1
  let ioTypeCol = -1

  // Analyze columns from first row
  if (firstRows.length > 0) {
    const firstRow = firstRows[0]
    
    for (let i = 0; i < firstRow.length; i++) {
      const value = firstRow[i]?.trim() || ''
      
      // DateTime is usually a number (2-4 digits like "2026-03-03")
      if (dateTimePattern.test(value)) {
        dateTimeCol = i
      }
      
      // I/O type is 'I' or 'O'
      if (ioTypePattern.test(value)) {
        ioTypeCol = i
      }

      // Employee ID is typically numeric (low number like 1-100)
      if (i === 1 && !isNaN(Number(value))) {
        employeeIdCol = i
      }
    }
  }

  // Fallback to standard positions if detection failed
  if (employeeIdCol === -1) employeeIdCol = 1
  if (dateTimeCol === -1) dateTimeCol = 2
  if (ioTypeCol === -1) ioTypeCol = 6

  console.log(`[v0] Detected columns: Employee ID=${employeeIdCol}, DateTime=${dateTimeCol}, I/O Type=${ioTypeCol}`)

  return { employeeIdCol, dateTimeCol, ioTypeCol }
}

/**
 * Validate datetime format
 */
function isValidDateTime(dateStr: string): boolean {
  const pattern = /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/
  if (!pattern.test(dateStr)) return false
  
  const date = new Date(dateStr)
  return date instanceof Date && !isNaN(date.getTime())
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const month = parseInt(formData.get('month') as string)
    const year = parseInt(formData.get('year') as string)

    // Validate inputs
    if (!file) {
      return NextResponse.json<UploadResponse>(
        { success: false, error: 'No file provided', errors: [] },
        { status: 400 }
      )
    }

    if (!month || !year || month < 1 || month > 12) {
      return NextResponse.json<UploadResponse>(
        { success: false, error: 'Invalid month or year', errors: [] },
        { status: 400 }
      )
    }

    // Read file
    const text = await file.text()
    
    // Normalize line endings
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const lines = normalizedText.split('\n').filter(line => line.trim().length > 0)

    console.log(`[v0] File uploaded: ${file.name}, ${lines.length} lines, ${file.size} bytes`)

    if (lines.length < 1) {
      return NextResponse.json<UploadResponse>(
        { success: false, error: 'No data in file', errors: [], details: { totalLines: 0, totalErrors: 0 } },
        { status: 400 }
      )
    }

    // Parse first few rows to detect structure
    const firstRows: string[][] = []
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const cols = lines[i].split('\t')
      firstRows.push(cols)
    }

    // Detect column structure
    const { employeeIdCol, dateTimeCol, ioTypeCol } = detectColumnStructure(firstRows)

    console.log(`[v0] Sample first row columns: ${firstRows[0]?.length || 0}`)
    console.log(`[v0] First row: ${firstRows[0]?.slice(0, 8).map((c, i) => `[${i}]="${c?.substring(0, 20)}"`).join(' ')}`)

    // Parse all records
    const records = []
    const errors: string[] = []
    const employeeCache: { [key: string]: any } = {}
    const MAX_ERRORS = 100

    for (let i = 0; i < lines.length; i++) {
      try {
        const line = lines[i]
        if (!line || line.trim().length === 0) continue

        const columns = line.split('\t')

        // Extract values
        const employeeIdStr = columns[employeeIdCol]?.trim()
        const dateTimeStr = columns[dateTimeCol]?.trim()
        const ioTypeStr = columns[ioTypeCol]?.trim()

        // Validate required fields exist
        if (!employeeIdStr || !dateTimeStr || !ioTypeStr) {
          if (errors.length < MAX_ERRORS) {
            errors.push(
              `Row ${i + 1}: Missing required fields. ID="${employeeIdStr || 'MISSING'}" DateTime="${dateTimeStr || 'MISSING'}" Type="${ioTypeStr || 'MISSING'}"`,
            )
          }
          continue
        }

        // Validate datetime format
        if (!isValidDateTime(dateTimeStr)) {
          if (errors.length < MAX_ERRORS) {
            errors.push(`Row ${i + 1}: Invalid datetime format "${dateTimeStr}" - expected YYYY-MM-DD HH:MM:SS`)
          }
          continue
        }

        // Validate I/O type
        if (!['I', 'O'].includes(ioTypeStr)) {
          if (errors.length < MAX_ERRORS) {
            errors.push(`Row ${i + 1}: Invalid I/O type "${ioTypeStr}" - expected I or O`)
          }
          continue
        }

        // Extract date and time
        const [datePart, timePart] = dateTimeStr.split(' ')
        const attendanceDate = datePart

        // Check month/year match
        const dateObj = new Date(attendanceDate)
        if (dateObj.getMonth() + 1 !== month || dateObj.getFullYear() !== year) {
          continue
        }

        // Get employee from cache or database
        let employeeData = employeeCache[employeeIdStr]

        if (!employeeData) {
          const { data: emp, error: empError } = await supabase
            .from('employees')
            .select('id, employee_id, first_name, last_name')
            .eq('employee_id', employeeIdStr)
            .single()

          if (empError || !emp) {
            if (errors.length < MAX_ERRORS) {
              errors.push(`Row ${i + 1}: Employee ID "${employeeIdStr}" not found in database`)
            }
            continue
          }

          employeeData = emp
          employeeCache[employeeIdStr] = emp
        }

        // Aggregate by employee and date
        const employeeName = `${employeeData.first_name} ${employeeData.last_name}`
        const existingRecord = records.find(
          (r) => r.employee_id === employeeData.id && r.attendance_date === attendanceDate,
        )

        if (existingRecord) {
          if (ioTypeStr === 'I' && !existingRecord.check_in) {
            existingRecord.check_in = timePart
          } else if (ioTypeStr === 'O' && !existingRecord.check_out) {
            existingRecord.check_out = timePart
          }
        } else {
          records.push({
            employee_id: employeeData.id,
            employee_name: employeeName,
            attendance_date: attendanceDate,
            check_in: ioTypeStr === 'I' ? timePart : null,
            check_out: ioTypeStr === 'O' ? timePart : null,
            status: 'pending',
            month,
            year,
          })
        }
      } catch (error) {
        if (errors.length < MAX_ERRORS) {
          errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
    }

    console.log(`[v0] Parsed ${records.length} valid records, ${errors.length} errors`)

    if (records.length === 0) {
      return NextResponse.json<UploadResponse>(
        {
          success: false,
          error: 'No valid records found',
          errors: errors,
          details: {
            totalLines: lines.length,
            totalErrors: errors.length,
            sampleErrors: errors.slice(0, 5),
          },
        },
        { status: 400 },
      )
    }

    // Process and calculate work hours
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
      .upsert(processedRecords, {
        onConflict: 'employee_id,attendance_date',
      })

    if (upsertError) {
      console.error('[v0] Database error:', upsertError)
      return NextResponse.json<UploadResponse>(
        {
          success: false,
          error: 'Failed to save records to database',
          errors: [upsertError.message],
        },
        { status: 500 },
      )
    }

    console.log(`[v0] Successfully uploaded ${processedRecords.length} records`)

    return NextResponse.json<UploadResponse>({
      success: true,
      recordsProcessed: processedRecords.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : [],
      details: {
        totalLines: lines.length,
        totalErrors: errors.length,
        sampleErrors: errors.slice(0, 3),
      },
    })
  } catch (error) {
    console.error('[v0] Upload error:', error)
    return NextResponse.json<UploadResponse>(
      {
        success: false,
        error: 'Upload failed',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      },
      { status: 500 },
    )
  }
}
