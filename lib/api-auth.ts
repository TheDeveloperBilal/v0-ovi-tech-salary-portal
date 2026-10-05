import { createClient } from '@/lib/supabase/server'
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
  const supabase = await createClient()

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const token = authHeader.substring(7)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user?.email) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, role')
    .eq('id', user.id)
    .single()

  const role: Role = profile?.role || (profile?.is_admin ? 'admin' : 'employee')

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
