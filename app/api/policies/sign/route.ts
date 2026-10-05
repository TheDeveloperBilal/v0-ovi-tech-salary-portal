import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, isAuthError } from '@/lib/api-auth'
import { signPolicySchema, parseBody } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (isAuthError(auth)) return auth.response
    const { supabase, user } = auth

    const { data: employee } = await supabase
      .from('employees')
      .select('id, first_name, last_name')
      .eq('email', user.email)
      .single()

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = parseBody(signPolicySchema, body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const { policy_id, signature_text } = parsed.data

    const { data: policy } = await supabase
      .from('company_policies')
      .select('id, title, requires_signature')
      .eq('id', policy_id)
      .single()

    if (!policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 })
    }

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
  } catch {
    return NextResponse.json({ error: 'Failed to sign policy' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, 'admin')
    if (isAuthError(auth)) return auth.response
    const { supabase } = auth

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

    const { data: allEmployees } = await supabase
      .from('employees')
      .select('id, first_name, last_name, email, department, designation')
      .order('first_name')

    const signedIds = new Set((signatures || []).map((s: any) => s.employee_id))
    const unsigned = (allEmployees || []).filter(e => !signedIds.has(e.id))

    return NextResponse.json({ signed: signatures || [], unsigned })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch signature data' }, { status: 500 })
  }
}
