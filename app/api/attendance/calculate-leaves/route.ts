// app/api/attendance/calculate-leaves/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const { month, year, employeeId } = await request.json()

    if (!month || !year) {
      return NextResponse.json({ error: 'Month and year are required' }, { status: 400 })
    }

    // Get all attendance records for the month
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const { data: records, error: recordError } = await supabase
      .from('attendance_records')
      .select('*')
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)
      .eq('employee_name', employeeId)

    if (recordError) {
      return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 })
    }

    // Calculate leaves deducted based on business rules
    let leavesDeducted = 0
    const absences = (records || []).filter(r => r.is_absent).length
    const violations = (records || []).filter(r => (r.is_late || r.is_early_out) && !r.nine_hour_waiver).length

    // 1 absent = 1 leave
    leavesDeducted += absences

    // 3 combined (late + early out) = 1 leave
    leavesDeducted += Math.floor(violations / 3)

    // Update employee's leaves_taken
    const { data: employee, error: fetchError } = await supabase
      .from('employees')
      .select('leaves_taken')
      .eq('employee_id', employeeId)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const newLeavesTaken = (employee?.leaves_taken || 0) + leavesDeducted

    const { error: updateError } = await supabase
      .from('employees')
      .update({ leaves_taken: newLeavesTaken })
      .eq('employee_id', employeeId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update leaves' }, { status: 500 })
    }

    // Store summary for the month
    const { error: summaryError } = await supabase
      .from('attendance_summary')
      .upsert({
        employee_id: employeeId,
        month,
        year,
        total_days: records?.length || 0,
        present_days: (records || []).filter(r => !r.is_absent).length,
        late_count: (records || []).filter(r => r.is_late && !r.nine_hour_waiver).length,
        early_out_count: (records || []).filter(r => r.is_early_out).length,
        absent_count: absences,
        leaves_deducted: leavesDeducted,
      }, {
        onConflict: 'employee_id,month,year',
      })

    if (summaryError) {
      console.error('Summary update error:', summaryError)
    }

    return NextResponse.json({
      success: true,
      leavesDeducted,
      newLeavesTaken,
      message: `Updated leaves for ${employeeId}. ${leavesDeducted} leaves deducted.`,
    })
  } catch (error) {
    console.error('Error calculating leaves:', error)
    return NextResponse.json(
      { error: 'Failed to calculate leaves' },
      { status: 500 }
    )
  }
}
