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
    delimiter?: string
    firstRowColumns?: number
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function validateInput(month: number, year: number, file: File): { valid: boolean; error?: string } {
  if (month < 1 || month > 12) {
    return { valid: false, error: 'Month must be between 1 and 12' }
  }

  const currentYear = new Date().getFullYear()
  if (year < 2020 || year > currentYear + 1) {
    return { valid: false, error: `Year must be between 2020 and ${currentYear + 1}` }
  }

  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: 'File size exceeds 10MB limit' }
  }

  const validTypes = ['.txt', '.csv']
  const fileName = file.name.toLowerCase()
  const hasValidExtension = validTypes.some(ext => fileName.endsWith(ext))
  if (!hasValidExtension) {
    return { valid: false, error: 'File must be .txt or .csv format' }
  }

  return { valid: true }
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const month = parseInt(formData.get('month') as string)
    const year = parseInt(formData.get('year') as string)

    console.log(`[v0] Upload started - File: ${file?.name}, Month: ${month}, Year: ${year}`)

    if (!file) {
      return NextResponse.json<UploadResponse>(
        { success: false, error: 'No file provided', errors: [] },
        { status: 400 }
      )
    }

    if (!month || !year) {
      return NextResponse.json<UploadResponse>(
        { success: false, error: 'Month and year are required', errors: [] },
        { status: 400 }
      )
    }

    const validation = validateInput(month, year, file)
    if (!validation.valid) {
      return NextResponse.json<UploadResponse>(
        { success: false, error: validation.error!, errors: [] },
        { status: 400 }
      )
    }

    // Read file
    const text = await file.text()
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const lines = normalizedText.trim().split('\n').filter(line => line.trim().length > 0)

    console.log(`[v0] File read - Total lines: ${lines.length}`)

    if (lines.length === 0) {
      return NextResponse.json<UploadResponse>(
        { success: false, error: 'No data found in file', errors: [], details: { totalLines: 0, totalErrors: 0 } },
        { status: 400 }
      )
    }

    // CRITICAL: Always use TAB as delimiter for this file format
    const delimiter = '\t'
    const firstRowColumns = lines[0].split(delimiter).length
    console.log(`[v0] Using TAB delimiter - First row has ${firstRowColumns} columns`)
    console.log(`[v0] First row: "${lines[0]}"`)
    console.log(`[v0] First row split result:`, lines[0].split(delimiter).map((c, i) => `[${i}]="${c}"`))

    const records = []
    const errors: string[] = []
    const employeeCache: { [key: string]: any } = {}
    const MAX_ERRORS = 100

    for (let i = 0; i < lines.length; i++) {
      try {
        let line = lines[i]
        
        // DON'T trim the line before splitting - trimming removes leading/trailing whitespace including tabs!
        if (!line || line.length === 0) continue
        
        // Only trim trailing whitespace, not leading tabs
        line = line.trimEnd()

        // Split by TAB
        const columns = line.split('\t')

        // Extract based on FIXED column positions
        // Col 0: Index, Col 1: Employee ID, Col 2: DateTime, Col 3: Terminal, Col 4: Code, Col 5: Name, Col 6: I/O Type
        const employeeIdStr = columns[1]?.trim()
        const dateTimeStr = columns[2]?.trim()
        const ioTypeStr = columns[6]?.trim()

        // Debug first 3 rows
        if (i < 3) {
          console.log(`[v0] Row ${i + 1}: ${columns.length} columns`)
          console.log(`[v0] Row ${i + 1} raw: "${line.substring(0, 100)}"`)
          console.log(`[v0] Row ${i + 1} details - [0]="${columns[0]}" [1]="${columns[1]}" [2]="${columns[2]}" [6]="${columns[6]}"`)
          console.log(`[v0] Row ${i + 1} parsed - ID="${employeeIdStr}" DateTime="${dateTimeStr}" Type="${ioTypeStr}"`)
        }

        if (!employeeIdStr || !dateTimeStr || !ioTypeStr) {
          if (errors.length < MAX_ERRORS) {
            errors.push(
              `Row ${i + 1}: Missing required fields. ID="${employeeIdStr || 'EMPTY'}" DateTime="${dateTimeStr || 'EMPTY'}" Type="${ioTypeStr || 'EMPTY'}" (${columns.length} cols)`
            )
          }
          continue
        }

        // Validate datetime format: must be YYYY-MM-DD HH:MM:SS
        const dateTimeParts = dateTimeStr.split(' ')
        if (dateTimeParts.length !== 2) {
          if (errors.length < MAX_ERRORS) {
            errors.push(`Row ${i + 1}: DateTime format invalid. Got "${dateTimeStr}" - expected "YYYY-MM-DD HH:MM:SS"`)
          }
          continue
        }

        const [datePart, timePart] = dateTimeParts
        const dateObj = new Date(datePart)
        if (isNaN(dateObj.getTime())) {
          if (errors.length < MAX_ERRORS) {
            errors.push(`Row ${i + 1}: Invalid date "${datePart}"`)
          }
          continue
        }

        // Check month/year
        if (dateObj.getMonth() + 1 !== month || dateObj.getFullYear() !== year) {
          continue
        }

        // Get employee from database
        let employeeData = employeeCache[employeeIdStr]
        if (!employeeData) {
          const { data: employee, error: queryError } = await supabase
            .from('employees')
            .select('id, employee_id, first_name, last_name')
            .eq('employee_id', employeeIdStr)
            .single()

          if (queryError || !employee) {
            if (errors.length < MAX_ERRORS) {
              errors.push(`Row ${i + 1}: Employee ID "${employeeIdStr}" not found`)
            }
            continue
          }

          employeeData = employee
          employeeCache[employeeIdStr] = employee
        }

        const employeeName = `${employeeData.first_name} ${employeeData.last_name}`
        const attendanceDate = datePart

        // Aggregate check-in and check-out
        const existingRecord = records.find(
          r => r.employee_id === employeeData.id && r.attendance_date === attendanceDate
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

    if (records.length === 0) {
      console.error(`[v0] No valid records. Total lines: ${lines.length}, Errors: ${errors.length}`)
      return NextResponse.json<UploadResponse>(
        {
          success: false,
          error: 'No valid records to process',
          errors: errors,
          details: {
            totalLines: lines.length,
            totalErrors: errors.length,
            sampleErrors: errors.slice(0, 5),
            delimiter: 'TAB',
            firstRowColumns: firstRowColumns
          }
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
      .upsert(processedRecords, {
        onConflict: 'employee_id,attendance_date',
      })

    if (upsertError) {
      console.error(`[v0] Upsert error: ${upsertError.message}`)
      return NextResponse.json<UploadResponse>(
        {
          success: false,
          error: 'Failed to save records to database',
          errors: [upsertError.message]
        },
        { status: 500 }
      )
    }

    console.log(`[v0] Upload successful - ${processedRecords.length} records processed`)
    return NextResponse.json<UploadResponse>({
      success: true,
      recordsProcessed: processedRecords.length,
      errors: errors.slice(0, 10),
      details: {
        totalLines: lines.length,
        totalErrors: errors.length,
        sampleErrors: errors.slice(0, 3),
        delimiter: 'TAB',
        firstRowColumns: firstRowColumns
      }
    })
  } catch (error) {
    console.error(`[v0] Upload error: ${error}`)
    return NextResponse.json<UploadResponse>(
      {
        success: false,
        error: 'Failed to process file',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      },
      { status: 500 }
    )
  }
}
