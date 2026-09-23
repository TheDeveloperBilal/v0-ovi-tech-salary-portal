import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function authenticateAdmin(request: NextRequest) {
  const supabase = await createClient()
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Unauthorized', status: 401 }
  }
  const token = authHeader.substring(7)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return { error: 'Unauthorized', status: 401 }
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) {
    return { error: 'Admin access required', status: 403 }
  }
  return { supabase, user }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { supabase, user } = auth

    const body = await request.json()
    const { action, entity_type, entity_id, details } = body

    if (!action || !entity_type) {
      return NextResponse.json({ error: 'action and entity_type are required' }, { status: 400 })
    }

    const { error } = await supabase.from('audit_logs').insert({
      user_email: user.email || null,
      action,
      entity_type,
      entity_id: entity_id || null,
      details: details || {},
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to write audit log' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { supabase } = auth

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

    const { data, error, count } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return NextResponse.json({ data, count })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}
