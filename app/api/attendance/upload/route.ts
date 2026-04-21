// app/api/attendance/upload/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { processAttendanceRecord } from '@/lib/attendance-calculations'

interface ParsedRow {
  [key: string]: any
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const month = parseInt(formData.get('month') as string)
    const year = parseInt(formData.get('year') as string)

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!month || !year) {
      return NextResponse.json({ error: 'Month and year are required' }, { status: 400 })
    }

    // Read file as text to handle tab-separated format
    const text = await file.text()
    const lines = text.trim().split('\n')

    if (lines.length === 0) {
      return NextResponse.json({ error: 'No data found in file' }, { status: 400 })
    }

    // Parse tab-separated records
    const records = []
    const errors = []
    const employeeCache: { [key: string]: any } = {}

    for (let i = 0; i < lines.length; i++) {
      try {
        const line = lines[i].trim()
        if (!line) continue

        const columns = line.split('\t')
        
        // Extract columns based on file structure:
        // Col 0: Index, Col 1: Employee ID, Col 2: DateTime, Col 3: Terminal, Col 4: Code, Col 5: Employee Name, Col 6: I/O Type
        const rawEmployeeId = columns[1]?.trim()
        const dateTime = columns[2]?.trim()
        const ioType = columns[6]?.trim()

        if (!rawEmployeeId || !dateTime || !ioType) {
          errors.push(`Row ${i + 1}: Missing required fields (ID: ${rawEmployeeId}, DateTime: ${dateTime}, Type: ${ioType})`)
          continue
        }

        // Parse datetime
        const [datePart, timePart] = dateTime.split(' ')
        const attendanceDate = datePart

        // Check if this is for the correct month/year
        const dateObj = new Date(attendanceDate)
        if (dateObj.getMonth() + 1 !== month || dateObj.getFullYear() !== year) {
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
            errors.push(`Row ${i + 1}: Employee ID "${rawEmployeeId}" not found in database`)
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
        errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    if (records.length === 0) {
      console.error('[v0] No records processed. Total lines: ' + lines.length + ', Errors: ' + errors.length)
      console.error('[v0] First 10 errors:', errors.slice(0, 10))
      return NextResponse.json(
        { 
          error: 'No valid records to process', 
          details: errors.length > 0 ? errors.slice(0, 10) : 'No matching records found for the selected month',
          totalLines: lines.length,
          totalErrors: errors.length
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
      return NextResponse.json({ error: 'Failed to save records', details: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      recordsProcessed: processedRecords.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : null,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
