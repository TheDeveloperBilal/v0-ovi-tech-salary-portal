import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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

    const { data: employee } = await supabase
      .from('employees')
      .select('id, first_name, last_name')
      .eq('user_id', user.id)
      .single()

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const { policy_id, signature_text } = await request.json()

    if (!policy_id || !signature_text) {
      return NextResponse.json({ error: 'Policy ID and signature are required' }, { status: 400 })
    }

    // Check policy exists and requires signature
    const { data: policy } = await supabase
      .from('company_policies')
      .select('id, title, requires_signature')
      .eq('id', policy_id)
      .single()

    if (!policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 })
    }

    // Check if already signed
    const { data: existing } = await supabase
      .from('policy_signatures')
      .select('id')
      .eq('policy_id', policy_id)
      .eq('employee_id', employee.id)
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'Policy already signed' }, { status: 400 })
    }

    const userAgent = request.headers.get('user-agent') || ''
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded?.split(',')[0]?.trim() || 'unknown'

    const { data, error } = await supabase
      .from('policy_signatures')
      .insert({
        policy_id,
        employee_id: employee.id,
        signature_text,
        ip_address: ip,
        user_agent: userAgent,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      signature: data,
      message: `Policy "${policy.title}" signed successfully`,
    }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

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

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const policyId = searchParams.get('policy_id')

    if (!policyId) {
      return NextResponse.json({ error: 'policy_id is required' }, { status: 400 })
    }

    const { data: signatures, error } = await supabase
      .from('policy_signatures')
      .select('*, employees(id, first_name, last_name, email, department, designation)')
      .eq('policy_id', policyId)
      .order('signed_at', { ascending: false })

    if (error) throw error

    // Get all employees for comparison
    const { data: allEmployees } = await supabase
      .from('employees')
      .select('id, first_name, last_name, email, department, designation')
      .order('first_name')

    const signedIds = new Set((signatures || []).map((s: any) => s.employee_id))
    const unsigned = (allEmployees || []).filter(e => !signedIds.has(e.id))

    return NextResponse.json({
      signed: signatures || [],
      unsigned,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
