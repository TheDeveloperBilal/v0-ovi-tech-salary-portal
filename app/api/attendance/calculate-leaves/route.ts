// app/api/attendance/calculate-leaves/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify Bearer token — only authenticated admins can calculate leaves
    const authHeader = request.headers.get('authorization')
    let currentUser = null

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7)
        const { data: { user } } = await supabase.auth.getUser(token)
        currentUser = user
      } catch (err) {
      }
    }

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', currentUser.id)
      .single()

    if (!adminProfile?.is_admin) {
      return NextResponse.json(
        { error: 'Only admins can calculate leaves' },
        { status: 403 }
      )
    }

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
      .eq('employee_id', employeeId)

    if (recordError) {
      return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 })
    }

    // Calculate leaves deducted based on business rules
    let leavesDeducted = 0
    const absences = (records || []).filter((r: any) => r.is_absent).length
    const violations = (records || []).filter((r: any) => (r.is_late || r.is_early_out) && !r.nine_hour_waiver).length

    // 1 absent = 1 leave
    leavesDeducted += absences

    // 3 combined (late + early out) = 1 leave
    leavesDeducted += Math.floor(violations / 3)

    // Store summary for the month (upsert so re-runs overwrite, not accumulate)
    const { error: summaryError } = await supabase
      .from('attendance_summary')
      .upsert({
        employee_id: employeeId,
        month,
        year,
        total_days: records?.length || 0,
        present_days: (records || []).filter((r: any) => !r.is_absent).length,
        late_count: (records || []).filter((r: any) => r.is_late && !r.nine_hour_waiver).length,
        early_out_count: (records || []).filter((r: any) => r.is_early_out).length,
        absent_count: absences,
        leaves_deducted: leavesDeducted,
      }, {
        onConflict: 'employee_id,month,year',
      })

    if (summaryError) {
      console.error('Summary update error:', summaryError)
    }

    // Recompute total leaves_taken from ALL summary records (idempotent)
    const { data: allSummaries } = await supabase
      .from('attendance_summary')
      .select('leaves_deducted')
      .eq('employee_id', employeeId)

    const totalLeaves = (allSummaries || []).reduce(
      (sum: number, s: any) => sum + (s.leaves_deducted || 0), 0
    )

    const { error: updateError } = await supabase
      .from('employees')
      .update({ leaves_taken: totalLeaves })
      .eq('employee_id', employeeId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update leaves' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      leavesDeducted,
      newLeavesTaken: totalLeaves,
      message: `Updated leaves for ${employeeId}. ${leavesDeducted} leaves deducted this month. Total: ${totalLeaves}.`,
    })
  } catch (error) {
    console.error('Error calculating leaves:', error)
    return NextResponse.json(
      { error: 'Failed to calculate leaves' },
      { status: 500 }
    )
  }
}
