import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, isAuthError } from '@/lib/api-auth'
import { deleteAttendanceRecordSchema, parseBody } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, 'admin')
    if (isAuthError(auth)) return auth.response
    const { supabase } = auth

    const searchParams = request.nextUrl.searchParams
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    const employeeId = searchParams.get('employeeId')

    let query = supabase.from('attendance_records').select('*')

    if (month) query = query.eq('month', parseInt(month))
    if (year) query = query.eq('year', parseInt(year))
    if (employeeId) query = query.eq('employee_id', employeeId)

    const { data, error } = await query.order('attendance_date', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, 'admin')
    if (isAuthError(auth)) return auth.response
    const { supabase } = auth

    const body = await request.json()
    const parsed = parseBody(deleteAttendanceRecordSchema, body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const { error } = await supabase
      .from('attendance_records')
      .delete()
      .eq('id', parsed.data.recordId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete attendance record' }, { status: 500 })
  }
}
