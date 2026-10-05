import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, isAuthError } from '@/lib/api-auth'
import { createLeaveRequestSchema, deleteLeaveRequestSchema, parseBody } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (isAuthError(auth)) return auth.response
    const { supabase, user } = auth

    const { data: employee } = await supabase
      .from('employees')
      .select('id')
      .eq('email', user.email)
      .single()

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('employee_id', employee.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Leave requests fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch leave requests' }, { status: 500 })
    }

    return NextResponse.json({ leave_requests: data || [] })
  } catch (err) {
    console.error('Leave requests GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (isAuthError(auth)) return auth.response
    const { supabase, user } = auth

    const { data: employee } = await supabase
      .from('employees')
      .select('id, leaves_taken')
      .eq('email', user.email)
      .single()

    if (!employee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = parseBody(createLeaveRequestSchema, body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const { leave_type, start_date, end_date, reason } = parsed.data

    if (end_date < start_date) {
      return NextResponse.json({ error: 'End date cannot be before start date' }, { status: 400 })
    }

    const start = new Date(start_date + 'T00:00:00')
    const end = new Date(end_date + 'T00:00:00')
    let requestedDays = 0
    const d = new Date(start)
    while (d <= end) {
      if (d.getDay() >= 1 && d.getDay() <= 5) requestedDays++
      d.setDate(d.getDate() + 1)
    }

    if (leave_type !== 'work_from_home') {
      const remaining = Math.max(0, 14 - (employee.leaves_taken || 0))
      if (requestedDays > remaining) {
        return NextResponse.json({
          error: `Insufficient leave balance. You have ${remaining} leave(s) remaining but requested ${requestedDays} day(s).`
        }, { status: 400 })
      }
    }

    const { data: leaveRequest, error: insertError } = await supabase
      .from('leave_requests')
      .insert({
        employee_id: employee.id,
        leave_type,
        start_date,
        end_date,
        reason: reason || null,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Leave request insert error:', insertError)
      return NextResponse.json({ error: 'Failed to submit leave request' }, { status: 500 })
    }

    return NextResponse.json({ leave_request: leaveRequest })
  } catch (err) {
    console.error('Leave request API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (isAuthError(auth)) return auth.response
    const { supabase, user } = auth

    const { data: employee } = await supabase
      .from('employees')
      .select('id')
      .eq('email', user.email)
      .single()

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = parseBody(deleteLeaveRequestSchema, body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const { id } = parsed.data

    const { data: leaveRequest } = await supabase
      .from('leave_requests')
      .select('id, employee_id, status')
      .eq('id', id)
      .single()

    if (!leaveRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
    }

    if (leaveRequest.employee_id !== employee.id) {
      return NextResponse.json({ error: 'You can only cancel your own leave requests' }, { status: 403 })
    }

    if (leaveRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending requests can be cancelled' }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('leave_requests')
      .delete()
      .eq('id', id)
      .eq('employee_id', employee.id)

    if (deleteError) {
      console.error('Leave cancel error:', deleteError)
      return NextResponse.json({ error: 'Failed to cancel leave request' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Leave cancel API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
