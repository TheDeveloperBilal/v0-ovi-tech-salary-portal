"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Shield, Loader2, ChevronLeft, ChevronRight } from "lucide-react"

interface AuditLog {
  id: string
  user_email: string | null
  action: string
  entity_type: string
  entity_id: string | null
  details: Record<string, any>
  created_at: string
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  approve_leave: { label: 'Approved Leave', color: 'text-emerald-400' },
  reject_leave: { label: 'Rejected Leave', color: 'text-red-400' },
  upload_attendance: { label: 'Uploaded Attendance', color: 'text-blue-400' },
  generate_salary_slip: { label: 'Generated Salary Slip', color: 'text-purple-400' },
  delete_salary_slip: { label: 'Deleted Salary Slip', color: 'text-red-400' },
  add_employee: { label: 'Added Employee', color: 'text-emerald-400' },
  delete_employee: { label: 'Deleted Employee', color: 'text-red-400' },
  update_settings: { label: 'Updated Settings', color: 'text-amber-400' },
  add_holiday: { label: 'Added Holiday', color: 'text-cyan-400' },
  delete_holiday: { label: 'Deleted Holiday', color: 'text-red-400' },
  add_exception: { label: 'Added Exception', color: 'text-cyan-400' },
  reset_password: { label: 'Reset Password', color: 'text-amber-400' },
}

const PAGE_SIZE = 20

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [filterAction, setFilterAction] = useState<string>('all')

  useEffect(() => {
    fetchLogs()
  }, [page])

  async function fetchLogs() {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/audit-log?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      const json = await res.json()
      if (json.data) {
        setLogs(json.data)
        setTotal(json.count || 0)
      }
    } catch {
      // silently handle
    } finally {
      setIsLoading(false)
    }
  }

  const filteredLogs = filterAction === 'all' ? logs : logs.filter(l => l.action === filterAction)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-PK', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-400" />
              Audit Log
            </CardTitle>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {Object.entries(ACTION_LABELS).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />Loading...
            </div>
          ) : filteredLogs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {total === 0 ? 'No audit logs yet. Actions will be recorded here once the migration is run.' : 'No matching logs.'}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map(log => {
                const meta = ACTION_LABELS[log.action] || { label: log.action, color: 'text-foreground' }
                return (
                  <div key={log.id} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2 px-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                    <span className="text-xs text-muted-foreground whitespace-nowrap min-w-[140px]">
                      {formatDate(log.created_at)}
                    </span>
                    <span className={`text-sm font-medium ${meta.color} min-w-[160px]`}>
                      {meta.label}
                    </span>
                    <span className="text-sm text-muted-foreground truncate flex-1">
                      {log.entity_type}
                      {log.entity_id && ` #${log.entity_id.substring(0, 8)}`}
                      {log.details?.employee_name && ` — ${log.details.employee_name}`}
                      {log.details?.reason && ` (${log.details.reason})`}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {log.user_email || 'system'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages} ({total} entries)
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
