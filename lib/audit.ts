import { createClient } from '@/lib/supabase/client'

export async function logAudit(params: {
  action: string
  entity_type: string
  entity_id?: string
  details?: Record<string, any>
}) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return

    await fetch('/api/audit-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(params),
    })
  } catch {
    // fire-and-forget
  }
}
