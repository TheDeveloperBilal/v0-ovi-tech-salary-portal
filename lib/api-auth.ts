import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

type Role = 'admin' | 'hr' | 'manager' | 'employee'

interface AuthResult {
  supabase: Awaited<ReturnType<typeof createClient>>
  user: { id: string; email: string }
  role: Role
}

interface AuthError {
  response: NextResponse
}

export async function authenticateRequest(
  request: NextRequest,
  requiredRole?: Role | Role[],
): Promise<AuthResult | AuthError> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { response: NextResponse.json({ error: 'No auth token provided' }, { status: 401 }) }
  }

  const token = authHeader.substring(7)

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const authClient = createSupabaseClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: { user }, error: authError } = await authClient.auth.getUser()

  if (authError || !user?.email) {
    console.error('Auth verification failed:', authError?.message || 'No email on user')
    return { response: NextResponse.json({ error: 'Invalid or expired session. Please log in again.' }, { status: 401 }) }
  }

  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, role')
    .eq('id', user.id)
    .single()

  const role: Role = profile?.role || (profile?.is_admin ? 'admin' : 'employee')

  if (role === 'employee') {
    const { data: inactive } = await supabase
      .from('employees')
      .select('id')
      .eq('email', user.email)
      .eq('is_active', false)
      .limit(1)
    if (inactive && inactive.length > 0) {
      return { response: NextResponse.json({ error: 'Your account has been deactivated. Please contact HR.' }, { status: 403 }) }
    }
  }

  if (requiredRole) {
    const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    if (!allowed.includes(role)) {
      return {
        response: NextResponse.json(
          { error: `Access denied. Required role: ${allowed.join(' or ')}` },
          { status: 403 },
        ),
      }
    }
  }

  return { supabase, user: { id: user.id, email: user.email }, role }
}

export function isAuthError(result: AuthResult | AuthError): result is AuthError {
  return 'response' in result
}
