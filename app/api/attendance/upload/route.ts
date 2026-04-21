// app/api/attendance/upload/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { processAttendanceRecord } from '@/lib/attendance-calculations'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ParsedRow {
  [key: string]: any
}

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

    // Read file
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json(sheet) as ParsedRow[]

    if (data.length === 0) {
      return NextResponse.json({ error: 'No data found in file' }, { status: 400 })
    }

    // Parse and process attendance records
    const records = []
    const errors = []

    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i]

        // Map CSV columns (adjust based on your file format)
        const employeeName = row['Employee Name'] || row['Name'] || row['employee_name']
        const date = row['Date'] || row['date']
        const checkIn = row['Check In'] || row['check_in'] || null
        const checkOut = row['Check Out'] || row['check_out'] || null

        if (!employeeName || !date) {
          errors.push(`Row ${i + 1}: Missing employee name or date`)
          continue
        }

        // Get employee from database
        const { data: employee } = await supabase
          .from('employees')
          .select('id')
          .ilike('first_name', `%${employeeName}%`)
          .or(`last_name.ilike.%${employeeName}%`)
          .single()

        if (!employee) {
          errors.push(`Row ${i + 1}: Employee "${employeeName}" not found`)
          continue
        }

        // Process attendance
        const processed = processAttendanceRecord({
          employeName: employeeName,
          employeeId: employee.id,
          date: formatDate(date),
          checkIn: formatTime(checkIn),
          checkOut: formatTime(checkOut),
        })

        records.push({
          employee_id: employee.id,
          employee_name: employeeName,
          attendance_date: processed.date,
          check_in: processed.checkIn,
          check_out: processed.checkOut,
          work_hours: processed.workHours,
          status: processed.status,
          is_late: processed.isLate,
          is_early_out: processed.isEarlyOut,
          is_absent: processed.isAbsent,
          nine_hour_waiver: processed.nineHourWaiver,
          month,
          year,
        })
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    if (records.length === 0) {
      return NextResponse.json(
        { error: 'No valid records to process', details: errors },
        { status: 400 }
      )
    }

    // Upsert records to database
    const { error: upsertError } = await supabase
      .from('attendance_records')
      .upsert(records, {
        onConflict: 'employee_id,attendance_date',
      })

    if (upsertError) {
      console.error('Upsert error:', upsertError)
      return NextResponse.json({ error: 'Failed to save records', details: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      recordsProcessed: records.length,
      errors: errors.length > 0 ? errors : null,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Helper functions
function formatDate(date: any): string {
  if (!date) return ''
  if (typeof date === 'number') {
    // Excel serial number
    const excelDate = new Date((date - 25569) * 86400 * 1000)
    return excelDate.toISOString().split('T')[0]
  }
  if (typeof date === 'string') {
    return date.split('T')[0] // ISO format
  }
  return ''
}

function formatTime(time: any): string | null {
  if (!time) return null
  if (typeof time === 'string') {
    // Already formatted
    return time.match(/^\d{2}:\d{2}/) ? time.substring(0, 5) : null
  }
  if (typeof time === 'number') {
    // Excel time serial (fraction of 24 hours)
    const hours = Math.floor(time * 24)
    const minutes = Math.floor((time * 24 - hours) * 60)
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }
  return null
}
