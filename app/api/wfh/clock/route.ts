import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  OFFICE_START,
  OFFICE_END,
  GRACE_MINUTES,
  MIN_HOURS_FOR_WAIVER,
} from '@/lib/attendance-calculations'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth: verify Bearer token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get employee record for this auth user
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, employee_id, first_name, last_name')
      .eq('user_id', user.id)
      .single()

    if (empError || !employee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 })
    }

    // Today's date in YYYY-MM-DD (Pakistan timezone UTC+5)
    const now = new Date()
    const pkOffset = 5 * 60 * 60 * 1000
    const pkNow = new Date(now.getTime() + pkOffset)
    const today = pkNow.toISOString().split('T')[0]
    const currentHour = pkNow.getUTCHours()
    const currentMinute = pkNow.getUTCMinutes()
    const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}:00`
    const month = pkNow.getUTCMonth() + 1
    const year = pkNow.getUTCFullYear()

    // Check if today has an approved WFH exception
    const { data: wfhException } = await supabase
      .from('attendance_exceptions')
      .select('id')
      .eq('employee_id', employee.id)
      .eq('exception_date', today)
      .eq('type', 'work_from_home')
      .limit(1)

    if (!wfhException || wfhException.length === 0) {
      return NextResponse.json(
        { error: 'No approved WFH for today' },
        { status: 403 }
      )
    }

    // Check for existing WFH record today
    const { data: existing } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('attendance_date', today)
      .eq('source', 'wfh_portal')
      .limit(1)

    const existingRecord = existing?.[0]
    const employeeName = `${employee.first_name} ${employee.last_name}`

    if (!existingRecord) {
      // CHECK-IN
      const graceEnd = OFFICE_START.hour * 60 + OFFICE_START.minute + GRACE_MINUTES
      const currentMinutes = currentHour * 60 + currentMinute
      const isLate = currentMinutes > graceEnd

      const { error: insertError } = await supabase
        .from('attendance_records')
        .insert({
          employee_id: employee.id,
          employee_name: employeeName,
          attendance_date: today,
          check_in: timeStr,
          check_out: null,
          work_hours: 0,
          status: isLate ? 'Late' : 'On Time',
          is_late: isLate,
          is_early_out: false,
          is_absent: false,
          nine_hour_waiver: false,
          month,
          year,
          source: 'wfh_portal',
        })

      if (insertError) {
        return NextResponse.json(
          { error: `Check-in failed: ${insertError.message}` },
          { status: 500 }
        )
      }

      return NextResponse.json({
        action: 'check_in',
        time: timeStr,
        is_late: isLate,
        message: isLate
          ? `Checked in at ${formatTime(currentHour, currentMinute)} (Late)`
          : `Checked in at ${formatTime(currentHour, currentMinute)}`,
      })
    }

    if (existingRecord.check_out) {
      return NextResponse.json(
        { error: 'Already checked in and out for today' },
        { status: 400 }
      )
    }

    // CHECK-OUT
    const checkInParts = existingRecord.check_in.split(':').map(Number)
    const checkInMinutes = checkInParts[0] * 60 + checkInParts[1]
    const currentMinutes = currentHour * 60 + currentMinute
    const workedMinutes = Math.max(0, currentMinutes - checkInMinutes)
    const workedHours = +(workedMinutes / 60).toFixed(2)

    const officeEndMinutes = OFFICE_END.hour * 60 + OFFICE_END.minute
    const isEarlyOut = currentMinutes < officeEndMinutes
    const nineHourWaiver = workedHours >= MIN_HOURS_FOR_WAIVER

    // Recalculate late status with 9-hour waiver
    const graceEnd = OFFICE_START.hour * 60 + OFFICE_START.minute + GRACE_MINUTES
    const wasLate = checkInMinutes > graceEnd
    const isLate = wasLate && !nineHourWaiver

    let status = 'On Time'
    if (isLate && isEarlyOut) status = 'Late & Early Out'
    else if (isLate) status = 'Late'
    else if (isEarlyOut) status = 'Early Out'

    const { error: updateError } = await supabase
      .from('attendance_records')
      .update({
        check_out: timeStr,
        work_hours: workedHours,
        is_early_out: isEarlyOut,
        is_late: isLate,
        nine_hour_waiver: nineHourWaiver,
        status,
      })
      .eq('id', existingRecord.id)

    if (updateError) {
      return NextResponse.json(
        { error: `Check-out failed: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      action: 'check_out',
      time: timeStr,
      work_hours: workedHours,
      is_early_out: isEarlyOut,
      status,
      message: `Checked out at ${formatTime(currentHour, currentMinute)} — ${workedHours}h worked`,
    })
  } catch (error) {
    console.error('WFH clock error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function formatTime(h: number, m: number): string {
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

// GET: fetch today's WFH status for the authenticated employee
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: employee } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const now = new Date()
    const pkOffset = 5 * 60 * 60 * 1000
    const pkNow = new Date(now.getTime() + pkOffset)
    const today = pkNow.toISOString().split('T')[0]

    // Check WFH exception
    const { data: wfhException } = await supabase
      .from('attendance_exceptions')
      .select('id')
      .eq('employee_id', employee.id)
      .eq('exception_date', today)
      .eq('type', 'work_from_home')
      .limit(1)

    if (!wfhException || wfhException.length === 0) {
      return NextResponse.json({ is_wfh_today: false })
    }

    // Get today's WFH record
    const { data: record } = await supabase
      .from('attendance_records')
      .select('check_in, check_out, work_hours, status, is_late, is_early_out')
      .eq('employee_id', employee.id)
      .eq('attendance_date', today)
      .eq('source', 'wfh_portal')
      .limit(1)

    return NextResponse.json({
      is_wfh_today: true,
      record: record?.[0] || null,
    })
  } catch (error) {
    console.error('WFH status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
