import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

interface UploadResponse {
  success: boolean
  recordsProcessed?: number
  error?: string
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
function parseAnyDate(input: any): Date | null {
  if (input instanceof Date) return input
  if (typeof input === 'string') {
    const parsed = new Date(input)
    return isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

// Detect columns from first row
function detectColumns(firstRow: string[]): { timestamp: number; date: number; time: number; name: number; valid: boolean } {
  let result = { timestamp: -1, date: -1, time: -1, name: -1, valid: false }

  // Pattern 1: Space-separated Date/Time (YYYY-MM-DD HH:MM:SS)
  if (
    firstRow.length >= 6 &&
    /^\d{4}-\d{2}-\d{2}$/.test(firstRow[1]) &&
    /^\d{1,2}:\d{2}:\d{2}$/.test(firstRow[2])
  ) {
    console.log('[v0] Format: Space-separated Date/Time')
    return { timestamp: -1, date: 1, time: 2, name: 4, valid: true }
  }

  // Pattern 2: Combined timestamp (YYYY-MM-DD HH:MM:SS in single column)
  if (firstRow.length >= 5 && /^\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}:\d{2}$/.test(firstRow[1])) {
    console.log('[v0] Format: Combined timestamp')
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

    const content = await file.text()
    const rows = parseTxt(content)

    console.log(`[v0] File parsed: ${rows.length} rows`)

    if (rows.length < 2) {
      return NextResponse.json<UploadResponse>(
        { success: false, error: 'File appears empty' },
        { status: 400 }
      )
    }

    // Detect columns
    const colMap = detectColumns(rows[0])
    console.log('[v0] Column mapping:', colMap)

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
      console.error('[v0] Employee fetch error:', empError)
      return NextResponse.json<UploadResponse>(
        { success: false, error: `Database error: ${empError.message}` },
        { status: 500 }
      )
    }

    if (!employees || employees.length === 0) {
      console.error('[v0] No employees found')
      return NextResponse.json<UploadResponse>(
        { success: false, error: 'No employees found in database' },
        { status: 400 }
      )
    }

    console.log(`[v0] Loaded ${employees.length} employees`)

    // Group attendance by employee and date
    const grouped: { [key: string]: any } = {}

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length === 0) continue

      // Extract name
      let name = colMap.name !== -1 ? String(row[colMap.name]).trim() : null
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

      // Filter by month/year
      if (jsDate.getMonth() + 1 !== month || jsDate.getFullYear() !== year) continue

      const dateKey = jsDate.toLocaleDateString()
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

    console.log(`[v0] Grouped records: ${Object.keys(grouped).length}`)

    // Process and save records
    const recordsToSave: any[] = []

    for (const entry of Object.values(grouped) as any[]) {
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
        console.log(`[v0] Employee not found: "${entry.name}"`)
        continue
      }

      const scans = (entry.scans as Date[]).sort((a, b) => a.getTime() - b.getTime())
      const firstScan = scans[0]
      const lastScan = scans[scans.length - 1]

      recordsToSave.push({
        employee_id: employee.id,
        employee_name: `${employee.first_name} ${employee.last_name}`,
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
            : null,
        month: month,
        year: year
      })
    }

    console.log(`[v0] Records to save: ${recordsToSave.length}`)

    if (recordsToSave.length === 0) {
      return NextResponse.json<UploadResponse>(
        {
          success: false,
          error: 'No valid attendance records found. Check if employee names match database.'
        },
        { status: 400 }
      )
    }

    // Save to database
    const { error: saveError } = await supabase.from('attendance_records').insert(recordsToSave)

    if (saveError) {
      console.error('[v0] Database save error:', saveError)
      return NextResponse.json<UploadResponse>(
        { success: false, error: `Failed to save records: ${saveError.message}` },
        { status: 500 }
      )
    }

    console.log(`[v0] Successfully saved ${recordsToSave.length} records`)

    return NextResponse.json<UploadResponse>({
      success: true,
      recordsProcessed: recordsToSave.length
    })
  } catch (error) {
    console.error('[v0] Upload error:', error)
    return NextResponse.json<UploadResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}
