import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, isAuthError } from '@/lib/api-auth'
import { deletePolicySchema, parseBody } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (isAuthError(auth)) return auth.response
    const { supabase, user, role } = auth

    const isAdmin = role === 'admin'

    let query = supabase
      .from('company_policies')
      .select('*')
      .order('created_at', { ascending: false })

    if (!isAdmin) {
      query = query.eq('is_active', true)
    }

    const { data: policies, error } = await query
    if (error) throw error

    if (isAdmin) {
      const policiesWithStats = await Promise.all(
        (policies || []).map(async (policy) => {
          const { count } = await supabase
            .from('policy_signatures')
            .select('*', { count: 'exact', head: true })
            .eq('policy_id', policy.id)

          return { ...policy, signature_count: count || 0 }
        })
      )

      const { count: empCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })

      return NextResponse.json({
        policies: policiesWithStats,
        total_employees: empCount || 0,
      })
    }

    const { data: employee } = await supabase
      .from('employees')
      .select('id')
      .eq('email', user.email)
      .single()

    if (!employee) {
      return NextResponse.json({ policies: policies || [], signatures: [] })
    }

    const { data: signatures } = await supabase
      .from('policy_signatures')
      .select('*')
      .eq('employee_id', employee.id)

    return NextResponse.json({
      policies: policies || [],
      signatures: signatures || [],
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch policies' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, 'admin')
    if (isAuthError(auth)) return auth.response
    const { supabase, user } = auth

    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const requiresSignature = formData.get('requires_signature') === 'true'

    if (!file || !title) {
      return NextResponse.json({ error: 'Title and file are required' }, { status: 400 })
    }

    if (title.length > 200) {
      return NextResponse.json({ error: 'Title must be under 200 characters' }, { status: 400 })
    }

    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('policies')
      .upload(fileName, fileBuffer, {
        contentType: file.type || 'application/pdf',
        upsert: false,
      })

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage
      .from('policies')
      .getPublicUrl(fileName)

    const { data, error } = await supabase
      .from('company_policies')
      .insert({
        title,
        description: description || null,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
        requires_signature: requiresSignature,
        is_active: true,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ policy: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to upload policy' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, 'admin')
    if (isAuthError(auth)) return auth.response
    const { supabase } = auth

    const body = await request.json()
    const parsed = parseBody(deletePolicySchema, body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const { data: policy } = await supabase
      .from('company_policies')
      .select('file_url')
      .eq('id', parsed.data.id)
      .single()

    if (policy?.file_url) {
      const filePath = policy.file_url.split('/policies/')[1]
      if (filePath) {
        await supabase.storage.from('policies').remove([filePath])
      }
    }

    const { error } = await supabase
      .from('company_policies')
      .delete()
      .eq('id', parsed.data.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete policy' }, { status: 500 })
  }
}
