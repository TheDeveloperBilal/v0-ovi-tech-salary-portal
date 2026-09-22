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

    const isAdmin = profile?.is_admin === true

    // Fetch policies
    let query = supabase
      .from('company_policies')
      .select('*')
      .order('created_at', { ascending: false })

    if (!isAdmin) {
      query = query.eq('is_active', true)
    }

    const { data: policies, error } = await query
    if (error) throw error

    // For admin: fetch signature counts per policy
    if (isAdmin) {
      const { data: employees } = await supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })

      const totalEmployees = employees || 0

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

    // For employee: include their signature status
    const { data: employee } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
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

    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const requiresSignature = formData.get('requires_signature') === 'true'

    if (!file || !title) {
      return NextResponse.json({ error: 'Title and file are required' }, { status: 400 })
    }

    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = new Uint8Array(arrayBuffer)

    const { data: uploadData, error: uploadError } = await supabase.storage
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
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

    const { data: policy } = await supabase
      .from('company_policies')
      .select('file_url')
      .eq('id', id)
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
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
