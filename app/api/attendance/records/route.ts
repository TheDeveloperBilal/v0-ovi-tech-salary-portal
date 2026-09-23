// app/api/attendance/records/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Verify the Bearer token and check admin status.
 * Returns the authenticated Supabase client or a JSON error response.
 */
async function authenticateAdmin(request: NextRequest) {
  const supabase = await createClient()

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
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', currentUser.id)
    .single()

  if (!profile?.is_admin) {
    return { error: NextResponse.json({ error: 'Only admins can access attendance records' }, { status: 403 }) }
  }

  return { supabase }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdmin(request)
    if ('error' in auth) return auth.error
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
    return NextResponse.json(
      { error: 'Failed to fetch attendance records' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateAdmin(request)
    if ('error' in auth) return auth.error
    const { supabase } = auth

    const { recordId } = await request.json()

    const { error } = await supabase
      .from('attendance_records')
      .delete()
      .eq('id', recordId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete attendance record' },
      { status: 500 }
    )
  }
}
