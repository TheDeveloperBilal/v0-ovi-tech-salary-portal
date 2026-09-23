import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (profile?.is_admin) {
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
      .eq('user_id', user.id)
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { title, content, priority, target_type, target_employee_ids, duration_days } = body

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

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

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await request.json()
    const { error } = await supabase
      .from('company_notices')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete notice' }, { status: 500 })
  }
}
