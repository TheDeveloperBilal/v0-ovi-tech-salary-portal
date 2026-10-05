import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, isAuthError } from '@/lib/api-auth'
import { createNoticeSchema, deleteNoticeSchema, parseBody } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (isAuthError(auth)) return auth.response
    const { supabase, user, role } = auth

    if (role === 'admin') {
      const { data, error } = await supabase
        .from('company_notices')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return NextResponse.json({ notices: data })
    }

    const { data: employee } = await supabase
      .from('employees')
      .select('id')
      .eq('email', user.email)
      .single()

    const employeeId = employee?.id

    const { data, error } = await supabase
      .from('company_notices')
      .select('id, title, content, priority, target_type, created_at, expires_at')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) throw error

    const filtered = (data || []).filter(n =>
      n.target_type === 'all' || (employeeId && n.target_type === 'specific')
    )

    if (employeeId) {
      const specificNoticeIds = filtered
        .filter(n => n.target_type === 'specific')
        .map(n => n.id)

      if (specificNoticeIds.length > 0) {
        const { data: targetedNotices } = await supabase
          .from('company_notices')
          .select('id')
          .in('id', specificNoticeIds)
          .contains('target_employee_ids', [employeeId])

        const targetedIds = new Set((targetedNotices || []).map(n => n.id))
        const result = filtered.filter(n =>
          n.target_type === 'all' || targetedIds.has(n.id)
        )
        return NextResponse.json({ notices: result })
      }
    }

    const result = filtered.filter(n => n.target_type === 'all')
    return NextResponse.json({ notices: result })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch notices' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, 'admin')
    if (isAuthError(auth)) return auth.response
    const { supabase, user } = auth

    const body = await request.json()
    const parsed = parseBody(createNoticeSchema, body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const { title, content, priority, target_type, target_employee_ids, duration_days } = parsed.data

    const startsAt = new Date()
    const expiresAt = new Date(startsAt.getTime() + (duration_days || 1) * 24 * 60 * 60 * 1000)

    const { data, error } = await supabase
      .from('company_notices')
      .insert({
        title,
        content,
        priority: priority || 'normal',
        target_type: target_type || 'all',
        target_employee_ids: target_employee_ids || [],
        duration_days: duration_days || 1,
        starts_at: startsAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ notice: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create notice' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, 'admin')
    if (isAuthError(auth)) return auth.response
    const { supabase } = auth

    const body = await request.json()
    const parsed = parseBody(deleteNoticeSchema, body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const { error } = await supabase
      .from('company_notices')
      .delete()
      .eq('id', parsed.data.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete notice' }, { status: 500 })
  }
}
