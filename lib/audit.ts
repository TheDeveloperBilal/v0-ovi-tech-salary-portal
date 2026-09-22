export async function logAudit(params: {
  action: string
  entity_type: string
  entity_id?: string
  details?: Record<string, any>
  user_email?: string
}) {
  try {
    await fetch('/api/audit-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
  } catch {
    // fire-and-forget
  }
}
