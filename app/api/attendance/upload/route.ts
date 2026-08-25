import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface UploadResponse {
  success: boolean
  recordsProcessed?: number
  error?: string
}

// Parse text file into rows
function parseTxt(content: string): string[][] {
  const lines = content.split(/\r?\n/)
  return lines
    .map(line => {
      line = line.trim()
      if (!line) return []
      if (line.includes('\t')) {
        return line.split('\t').map(c => c.trim())
      }
      return line.split(/\s+/)
    })
    .filter(r => r.length > 3)
}

// Parse any date format
function parseAnyDate(input: unknown): Date | null {
  if (input instanceof Date) return input
  if (typeof input === 'string') {
    const parsed = new Date(input)
    return isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

// Detect columns from first row
function detectColumns(firstRow: string[]): { timestamp: number; date: number; time: number; name: number; valid: boolean } {
  const result = { timestamp: -1, date: -1, time: -1, name: -1, valid: false }

  // Pattern 1: Space-separated Date/Time (YYYY-MM-DD HH:MM:SS)
  if (
    firstRow.length >= 6 &&
    /^\d{4}-\d{2}-\d{2}$/.test(firstRow[1]) &&
    /^\d{1,2}:\d{2}:\d{2}$/.test(firstRow[2])
  ) {
    return { timestamp: -1, date: 1, time: 2, name: 4, valid: true }
  }

  // Pattern 2: Combined timestamp (YYYY-MM-DD HH:MM:SS in single column)
  if (firstRow.length >= 5 && /^\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}:\d{2}$/.test(firstRow[1])) {
    return { timestamp: 1, date: -1, time: -1, name: 4, valid: true }
  }

  // Pattern 3: Smart detection - look for date/time patterns
  let dateCol = -1
  let timeCol = -1
  let timestampCol = -1

  firstRow.forEach((cell, idx) => {
    const s = String(cell).trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) dateCol = idx
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(s)) timeCol = idx
    if (/^\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}:\d{2}$/.test(s)) timestampCol = idx
  })

  if (timestampCol !== -1) {
    let nameCol = -1
    firstRow.forEach((cell, idx) => {
      const s = String(cell).trim()
      if (idx !== timestampCol && isNaN(parseFloat(s)) && s.length > 2 && s.length < 50) {
        if (nameCol === -1) nameCol = idx
      }
    })
    if (nameCol === -1) nameCol = timestampCol + 1
    return { timestamp: timestampCol, date: -1, time: -1, name: nameCol, valid: true }
  }

  if (dateCol !== -1 && timeCol !== -1) {
    let nameCol = -1
    firstRow.forEach((cell, idx) => {
      const s = String(cell).trim()
      if (idx !== dateCol && idx !== timeCol && isNaN(parseFloat(s)) && s.length > 2) {
        if (nameCol === -1) nameCol = idx
      }
    })
    return { timestamp: -1, date: dateCol, time: timeCol, name: nameCol, valid: true }
  }

  return result
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    const supabase = await createClient()

    // Verify Bearer token — only authenticated admins can upload attendance
    const authHeader = request.headers.get('authorization')
    let currentUser = null

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7)
        const { data: { user } } = await supabase.auth.getUser(token)
        currentUser = user
      } catch {
      }
    }

    if (!currentUser) {
      return NextResponse.json<UploadResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
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

    const formData = await request.formData()
    const file = formData.get('file') as File
    // month and year are provided in the form but not used for filtering here
    // (records are processed based on actual dates in the file)
    void formData.get('month')
    void formData.get('year')

    if (!file) {
      return NextResponse.json<UploadResponse>(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    const content = await file.text()
    const rows = parseTxt(content)


    if (rows.length < 2) {
      return NextResponse.json<UploadResponse>(
        { success: false, error: 'File appears empty' },
        { status: 400 }
      )
    }

    // Detect columns
    const colMap = detectColumns(rows[0])

    if (!colMap.valid) {
      return NextResponse.json<UploadResponse>(
        { success: false, error: 'Could not detect date/name columns in file' },
        { status: 400 }
      )
    }

    // Fetch all employees
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, employee_id, first_name, last_name')

    if (empError) {
      return NextResponse.json<UploadResponse>(
        { success: false, error: `Database error: ${empError.message}` },
        { status: 500 }
      )
    }

    if (!employees || employees.length === 0) {
      return NextResponse.json<UploadResponse>(
        { success: false, error: 'No employees found in database' },
        { status: 400 }
      )
    }


    // Group attendance by employee and date
    const grouped: { [key: string]: { name: string; date: string; dateObj: Date; scans: Date[] } } = {}

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length === 0) continue

      // Extract name
      const name = colMap.name !== -1 ? String(row[colMap.name]).trim() : null
      if (!name) continue

      // Extract and parse date/time
      let jsDate: Date | null = null

      if (colMap.timestamp !== -1 && row[colMap.timestamp]) {
        jsDate = parseAnyDate(row[colMap.timestamp])
      } else if (colMap.date !== -1 && colMap.time !== -1) {
        const dateStr = String(row[colMap.date]).trim()
        const timeStr = String(row[colMap.time]).trim()
        jsDate = parseAnyDate(`${dateStr} ${timeStr}`)
      }

      if (!jsDate || isNaN(jsDate.getTime())) continue

      // Store date in consistent YYYY-MM-DD format to avoid locale issues
      const dateYear = jsDate.getFullYear()
      const dateMonth = String(jsDate.getMonth() + 1).padStart(2, '0')
      const day = String(jsDate.getDate()).padStart(2, '0')
      const dateKey = `${dateYear}-${dateMonth}-${day}`
      const uniqueKey = `${name}_${dateKey}`

      if (!grouped[uniqueKey]) {
        grouped[uniqueKey] = {
          name: name,
          date: dateKey,
          dateObj: jsDate,
          scans: []
        }
      }
      grouped[uniqueKey].scans.push(jsDate)
    }


    // Process and save records
    const recordsToSave: { employee_id: string; attendance_date: string; check_in: string; check_out: string | null }[] = []

    for (const entry of Object.values(grouped)) {
      // Find matching employee
      const employee = employees.find(
        e =>
          e.first_name?.toLowerCase() === entry.name.toLowerCase() ||
          e.last_name?.toLowerCase() === entry.name.toLowerCase() ||
          e.first_name?.toLowerCase().includes(entry.name.toLowerCase()) ||
          e.last_name?.toLowerCase().includes(entry.name.toLowerCase()) ||
          entry.name.toLowerCase().includes(e.first_name?.toLowerCase() || '') ||
          entry.name.toLowerCase().includes(e.last_name?.toLowerCase() || '')
      )

      if (!employee) {
        continue
      }

      const scans = entry.scans.sort((a, b) => a.getTime() - b.getTime())
      const firstScan = scans[0]
      const lastScan = scans[scans.length - 1]

      recordsToSave.push({
        employee_id: employee.id,
        attendance_date: entry.date,
        check_in: firstScan.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        check_out:
          scans.length > 1
            ? lastScan.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })
            : null
      })
    }


    if (recordsToSave.length === 0) {
      return NextResponse.json<UploadResponse>(
        {
          success: false,
          error: 'No valid attendance records found. Check if employee names match database.'
        },
        { status: 400 }
      )
    }

    // Deduplicate records by employee_id and attendance_date to avoid "duplicate key" error
    const deduplicatedRecords = Array.from(
      new Map(recordsToSave.map(r => [`${r.employee_id}_${r.attendance_date}`, r])).values()
    )


    // Save to database using upsert to handle duplicate entries
    const { error: saveError } = await supabase.from('attendance_records').upsert(deduplicatedRecords, {
      onConflict: 'employee_id,attendance_date'
    })

    if (saveError) {
      return NextResponse.json<UploadResponse>(
        { success: false, error: `Failed to save records: ${saveError.message}` },
        { status: 500 }
      )
    }


    return NextResponse.json<UploadResponse>({
      success: true,
      recordsProcessed: recordsToSave.length
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
