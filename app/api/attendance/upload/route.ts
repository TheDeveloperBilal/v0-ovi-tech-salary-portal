// app/api/attendance/upload/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { processAttendanceRecord } from '@/lib/attendance-calculations'

// Standardized response interface for consistency
interface UploadResponse {
  success: boolean
  recordsProcessed?: number
  errors?: string[]
  error?: string
  details?: {
    totalLines: number
    totalErrors: number
    sampleErrors?: string[]
  }
}

interface ParsedRow {
  [key: string]: any
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Input validation function
function validateInput(month: number, year: number, file: File): { valid: boolean; error?: string } {
  // Validate month
  if (month < 1 || month > 12) {
    return { valid: false, error: 'Month must be between 1 and 12' }
  }

  // Validate year
  const currentYear = new Date().getFullYear()
  if (year < 2020 || year > currentYear + 1) {
    return { valid: false, error: `Year must be between 2020 and ${currentYear + 1}` }
  }

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: 'File size exceeds 10MB limit' }
  }

  // Validate file type
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

    // Validate inputs
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

    // Validate inputs before processing
    const validation = validateInput(month, year, file)
    if (!validation.valid) {
      return NextResponse.json<UploadResponse>(
        { success: false, error: validation.error!, errors: [] },
        { status: 400 }
      )
    }

    // Read file as text to handle tab-separated format
    const text = await file.text()
    // Handle different line endings (CRLF, LF, CR)
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const lines = normalizedText.trim().split('\n').filter(line => line.trim().length > 0)

    console.log(`[v0] File parsing - Total lines: ${lines.length}`)
    console.log(`[v0] First line raw: "${lines[0]}"`)
    if (lines[0]) {
      const firstColumns = lines[0].split('\t')
      console.log(`[v0] First line columns count: ${firstColumns.length}`)
      console.log(`[v0] First line columns:`, firstColumns.map((c, i) => `[${i}]="${c}"`))
    }

    if (lines.length === 0) {
      return NextResponse.json<UploadResponse>(
        { 
          success: false, 
          error: 'No data found in file', 
          errors: [],
          details: { totalLines: 0, totalErrors: 0 }
        },
        { status: 400 }
      )
    }

    // Parse tab-separated records
    const records = []
    const errors: string[] = []
    const employeeCache: { [key: string]: any } = {}
    const errorCategories = { notFound: 0, parseError: 0, wrongDate: 0, missingFields: 0 }
    const MAX_ERRORS = 1000 // Prevent memory issues from huge error lists

    for (let i = 0; i < lines.length; i++) {
      try {
        const line = lines[i].trim()
        if (!line) continue

        const columns = line.split('\t')
        
        // If no tabs found, try space-separated
        let parsedColumns = columns
        if (columns.length < 5) {
          const spaceColumns = line.split(/\s+/)
          if (spaceColumns.length > columns.length) {
            parsedColumns = spaceColumns
            if (i < 3) {
              console.log(`[v0] Row ${i + 1}: Using space-separated parsing (found ${spaceColumns.length} columns)`)
            }
          }
        }
        
        // Debug first few rows
        if (i < 3) {
          console.log(`[v0] Row ${i + 1}: columns.length=${parsedColumns.length}, raw="${line.substring(0, 100)}"`)
          console.log(`[v0] Row ${i + 1} columns:`, parsedColumns.map((c, idx) => `[${idx}]="${c}"`))
        }
        
        // Extract columns based on file structure:
        // Col 0: Index, Col 1: Employee ID, Col 2: DateTime, Col 3: Terminal, Col 4: Code, Col 5: Employee Name, Col 6: I/O Type
        const rawEmployeeId = parsedColumns[1]?.trim()
        const dateTime = parsedColumns[2]?.trim()
        const ioType = parsedColumns[6]?.trim()

        if (!rawEmployeeId || !dateTime || !ioType) {
          if (errors.length < MAX_ERRORS) {
            errors.push(`Row ${i + 1}: Missing required fields (ID: ${rawEmployeeId}, DateTime: ${dateTime}, Type: ${ioType})`)
          }
          errorCategories.missingFields++
          continue
        }

        // Parse datetime
        const [datePart, timePart] = dateTime.split(' ')
        const attendanceDate = datePart

        // Check if this is for the correct month/year
        const dateObj = new Date(attendanceDate)
        if (dateObj.getMonth() + 1 !== month || dateObj.getFullYear() !== year) {
          errorCategories.wrongDate++
          continue
        }

        // Try to get employee from cache first, then database using employee_id
        let employeeData = employeeCache[rawEmployeeId]

        if (!employeeData) {
          const { data: employee, error: queryError } = await supabase
            .from('employees')
            .select('id, employee_id, first_name, last_name')
            .eq('employee_id', rawEmployeeId)
            .single()

          if (queryError || !employee) {
            if (errors.length < MAX_ERRORS) {
              errors.push(`Row ${i + 1}: Employee ID "${rawEmployeeId}" not found in database`)
            }
            errorCategories.notFound++
            continue
          }

          employeeData = employee
          employeeCache[rawEmployeeId] = employee
        }

        // Aggregate check-in and check-out for the day
        const employeeName = `${employeeData.first_name} ${employeeData.last_name}`
        const existingRecord = records.find(
          r => r.employee_id === employeeData.id && r.attendance_date === attendanceDate
        )

        if (existingRecord) {
          if (ioType === 'I' && !existingRecord.check_in) {
            existingRecord.check_in = timePart
          } else if (ioType === 'O' && !existingRecord.check_out) {
            existingRecord.check_out = timePart
          }
        } else {
          records.push({
            employee_id: employeeData.id,
            employee_name: employeeName,
            attendance_date: attendanceDate,
            check_in: ioType === 'I' ? timePart : null,
            check_out: ioType === 'O' ? timePart : null,
            status: 'pending',
            month,
            year,
          })
        }
      } catch (error) {
        if (errors.length < MAX_ERRORS) {
          errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown parsing error'}`)
        }
        errorCategories.parseError++
      }
    }

    if (records.length === 0) {
      console.error('[v0] No records processed. Total lines:', lines.length, 'Total errors:', errors.length)
      console.error('[v0] Error categories:', errorCategories)
      console.error('[v0] First 10 errors:', errors.slice(0, 10))
      return NextResponse.json<UploadResponse>(
        { 
          success: false,
          error: 'No valid records to process', 
          errors: errors,
          details: { 
            totalLines: lines.length, 
            totalErrors: errors.length,
            sampleErrors: errors.slice(0, 5)
          }
        },
        { status: 400 }
      )
    }

    // Process records with calculations
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

    // Upsert records to database
    const { error: upsertError } = await supabase
      .from('attendance_records')
      .upsert(processedRecords, {
        onConflict: 'employee_id,attendance_date',
      })

    if (upsertError) {
      console.error('Upsert error:', upsertError)
      return NextResponse.json<UploadResponse>(
        { 
          success: false,
          error: 'Failed to save records to database', 
          errors: [upsertError.message]
        },
        { status: 500 }
      )
    }

    console.log('[v0] Upload successful. Records processed:', processedRecords.length)
    return NextResponse.json<UploadResponse>({
      success: true,
      recordsProcessed: processedRecords.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : [],
      details: {
        totalLines: lines.length,
        totalErrors: errors.length,
        sampleErrors: errors.slice(0, 3)
      }
    })
  } catch (error) {
    console.error('[v0] Upload error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json<UploadResponse>(
      { 
        success: false,
        error: 'Failed to process file', 
        errors: [errorMessage]
      },
      { status: 500 }
    )
  }
}
