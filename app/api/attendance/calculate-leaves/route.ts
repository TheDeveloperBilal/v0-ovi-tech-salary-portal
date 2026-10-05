import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, isAuthError } from '@/lib/api-auth'
import { calculateLeavesSchema, parseBody } from '@/lib/validations'
import { applySandwichRule } from '@/lib/attendance-calculations'

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, 'admin')
    if (isAuthError(auth)) return auth.response
    const { supabase } = auth

    const body = await request.json()
    const parsed = parseBody(calculateLeavesSchema, body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const { month, year, employeeId } = parsed.data

    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const { data: records, error: recordError } = await supabase
      .from('attendance_records')
      .select('*')
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)
      .eq('employee_id', employeeId)

    if (recordError) {
      return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 })
    }

    let leavesDeducted = 0
    const absentDates = new Set(
      (records || []).filter((r: any) => r.is_absent).map((r: any) => r.attendance_date)
    )
    const absences = applySandwichRule(absentDates)
    const violations = (records || []).filter((r: any) => (r.is_late || r.is_early_out)).length

    leavesDeducted += absences
    leavesDeducted += Math.floor(violations / 3)

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

    const { error: summaryError } = await supabase
      .from('attendance_summary')
      .upsert({
        employee_id: employeeId,
        month,
        year,
        total_days: records?.length || 0,
        present_days: (records || []).filter((r: any) => !r.is_absent).length,
        late_count: (records || []).filter((r: any) => r.is_late).length,
        early_out_count: (records || []).filter((r: any) => r.is_early_out).length,
        absent_count: absences,
        leaves_deducted: leavesDeducted,
      }, { onConflict: 'employee_id,month,year' })

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
    return NextResponse.json({ error: 'Failed to calculate leaves' }, { status: 500 })
  }
}
