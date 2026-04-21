// app/api/attendance/upload/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { processAttendanceRecord } from '@/lib/attendance-calculations'

// Standardized response interface
interface UploadResponse {
  success: boolean
  recordsProcessed?: number
  error?: string
  errors?: string[]
  details?: {
    totalLines: number
    totalErrors: number
    sampleErrors?: string[]
    delimiters?: {
      detected: string
      tabCount: number
      pipeCount: number
      commaCount: number
      spaceCount: number
    }
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Phase 1: Diagnostic Helper - Detect file delimiter
function detectDelimiter(line: string): { delimiter: string; count: number } {
  const tabCount = (line.match(/\t/g) || []).length
  const pipeCount = (line.match(/\|/g) || []).length
  const commaCount = (line.match(/,/g) || []).length
  const spaceCount = (line.match(/ {2,}/g) || []).length // Multiple spaces

  console.log(`[v0] Delimiter detection - Tabs: ${tabCount}, Pipes: ${pipeCount}, Commas: ${commaCount}, Multi-space: ${spaceCount}`)

  // Prefer tabs, then pipes, then commas, then spaces
  if (tabCount >= 5) return { delimiter: '\t', count: tabCount }
  if (pipeCount >= 5) return { delimiter: '|', count: pipeCount }
  if (commaCount >= 5) return { delimiter: ',', count: commaCount }
  if (spaceCount >= 5) return { delimiter: ' ', count: spaceCount }
  
  // Default to tab
  return { delimiter: '\t', count: tabCount }
}

// Phase 1: Diagnostic Helper - Log file bytes for debugging
function logFileBytes(text: string, maxChars: number = 200): void {
  const firstLine = text.split('\n')[0]
  console.log(`[v0] First line length: ${firstLine.length}`)
  console.log(`[v0] First line (first 200 chars): "${firstLine.substring(0, 200)}"`)
  
  // Log character codes for debugging
  const chars = firstLine.substring(0, 50).split('').map((c, i) => {
    const code = c.charCodeAt(0)
    if (code === 9) return `[${i}]=TAB`
    if (code === 32) return `[${i}]=SPACE`
    if (code === 124) return `[${i}]=PIPE`
    if (code === 44) return `[${i}]=COMMA`
    return `[${i}]="${c}"(${code})`
  })
  console.log(`[v0] Character breakdown: ${chars.slice(0, 15).join(', ')}...`)
}

// Phase 1 & 3: Input validation function
function validateInput(month: number, year: number, file: File): { valid: boolean; error?: string } {
  if (!month || !year) {
    return { valid: false, error: 'Month and year are required' }
  }
  
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
  if (!validTypes.some(ext => fileName.endsWith(ext))) {
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

    console.log(`[v0] Upload started - File: ${file?.name}, Size: ${file?.size}, Month: ${month}, Year: ${year}`)

    // Phase 3: Input validation
    if (!file) {
      return NextResponse.json<UploadResponse>(
        { success: false, error: 'No file provided', errors: [] },
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

    // Phase 1: Read and diagnose file
    const text = await file.text()
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const lines = normalizedText.trim().split('\n').filter(line => line.trim().length > 0)

    console.log(`[v0] File read complete - Total lines: ${lines.length}`)
    logFileBytes(text)

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

    // Phase 1: Auto-detect delimiter
    const { delimiter, count: delimCount } = detectDelimiter(lines[0])
    console.log(`[v0] Detected delimiter: "${delimiter === '\t' ? 'TAB' : delimiter}" (count: ${delimCount})`)

    // Parse records with multi-delimiter support
    const records = []
    const errors: string[] = []
    const employeeCache: { [key: string]: any } = {}
    const MAX_ERRORS = 100 // Show first 100 errors
    const MAX_DETAILED_ERRORS = 5 // Show first 5 detailed error messages

    for (let i = 0; i < lines.length; i++) {
      try {
        const line = lines[i].trim()
        if (!line) continue

        // Phase 2: Parse with detected delimiter
        const columns = line.split(delimiter).map(c => c.trim())
        
        // Log first 3 rows for debugging
        if (i < 3) {
          console.log(`[v0] Row ${i + 1}: Found ${columns.length} columns`)
          console.log(`[v0] Row ${i + 1} data: Col[0]="${columns[0]}", Col[1]="${columns[1]}", Col[2]="${columns[2]}", Col[6]="${columns[6]}"`)
        }

        // Extract columns: Col 1 = Employee ID, Col 2 = DateTime, Col 6 = I/O Type
        const rawEmployeeId = columns[1]?.trim()
        const dateTime = columns[2]?.trim()
        const ioType = columns[6]?.trim()

        if (!rawEmployeeId || !dateTime || !ioType) {
          if (errors.length < MAX_ERRORS) {
            errors.push(
              `Row ${i + 1}: Missing fields - ID: "${rawEmployeeId || 'EMPTY'}", DateTime: "${dateTime || 'EMPTY'}", Type: "${ioType || 'EMPTY'}" (${columns.length} total columns)`
            )
          }
          continue
        }

        // Validate date format
        const [datePart, timePart] = dateTime.split(' ')
        if (!datePart || !timePart) {
          if (errors.length < MAX_ERRORS) {
            errors.push(`Row ${i + 1}: Invalid datetime format "${dateTime}"`)
          }
          continue
        }

        const dateObj = new Date(datePart)
        if (isNaN(dateObj.getTime())) {
          if (errors.length < MAX_ERRORS) {
            errors.push(`Row ${i + 1}: Invalid date "${datePart}"`)
          }
          continue
        }

        // Check month/year match
        if (dateObj.getMonth() + 1 !== month || dateObj.getFullYear() !== year) {
          continue // Skip records from wrong month (don't count as error)
        }

        // Get employee from cache or database
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
            continue
          }

          employeeData = employee
          employeeCache[rawEmployeeId] = employee
        }

        // Aggregate check-in and check-out for the day
        const employeeName = `${employeeData.first_name} ${employeeData.last_name}`
        const existingRecord = records.find(
          r => r.employee_id === employeeData.id && r.attendance_date === datePart
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
            attendance_date: datePart,
            check_in: ioType === 'I' ? timePart : null,
            check_out: ioType === 'O' ? timePart : null,
            status: 'pending',
            month,
            year,
          })
        }
      } catch (error) {
        if (errors.length < MAX_ERRORS) {
          errors.push(`Row ${i + 1}: Parsing error - ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
    }

    console.log(`[v0] Parsing complete - Records created: ${records.length}, Errors: ${errors.length}`)

    if (records.length === 0) {
      return NextResponse.json<UploadResponse>(
        {
          success: false,
          error: `No valid records found. Total lines: ${lines.length}, Errors: ${errors.length}`,
          errors: errors,
          details: {
            totalLines: lines.length,
            totalErrors: errors.length,
            sampleErrors: errors.slice(0, MAX_DETAILED_ERRORS),
            delimiters: {
              detected: delimiter === '\t' ? 'TAB' : delimiter,
              tabCount: (lines[0].match(/\t/g) || []).length,
              pipeCount: (lines[0].match(/\|/g) || []).length,
              commaCount: (lines[0].match(/,/g) || []).length,
              spaceCount: (lines[0].match(/ {2,}/g) || []).length,
            }
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
      console.error('[v0] Upsert failed:', upsertError)
      return NextResponse.json<UploadResponse>(
        {
          success: false,
          error: 'Failed to save records to database',
          errors: [upsertError.message]
        },
        { status: 500 }
      )
    }

    console.log(`[v0] Upload successful - ${processedRecords.length} records saved`)
    return NextResponse.json<UploadResponse>({
      success: true,
      recordsProcessed: processedRecords.length,
      errors: errors.length > 0 ? errors.slice(0, MAX_DETAILED_ERRORS) : [],
      details: {
        totalLines: lines.length,
        totalErrors: errors.length,
        sampleErrors: errors.slice(0, MAX_DETAILED_ERRORS)
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
