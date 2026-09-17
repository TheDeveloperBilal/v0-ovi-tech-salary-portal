"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CheckCircle, XCircle, Clock, Loader2, CalendarDays, Inbox,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const LEAVE_TYPE_LABELS: Record<string, string> = {
  casual_leave: 'Casual Leave',
  sick_leave: 'Sick Leave',
  work_from_home: 'Work From Home',
  half_day: 'Half Day',
  early_out: 'Early Out',
  other: 'Other',
}

// Map leave_type to attendance_exception type for auto-creating exceptions
const LEAVE_TO_EXCEPTION: Record<string, string> = {
  casual_leave: 'approved_leave',
  sick_leave: 'approved_leave',
  work_from_home: 'work_from_home',
  half_day: 'half_day',
  early_out: 'approved_early_out',
  other: 'approved_leave',
}

export function LeaveRequestManager() {
  const [requests, setRequests] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [remarks, setRemarks] = useState<Record<string, string>>({})
  const [processingId, setProcessingId] = useState<string | null>(null)

  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchRequests()
  }, [filter])

  async function fetchRequests() {
    setIsLoading(true)
    try {
      let query = supabase
        .from("leave_requests")
        .select("*, employees(id, first_name, last_name, employee_id, department, designation)")
        .order("created_at", { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query.limit(100)
      if (error) throw error
      setRequests(data || [])
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  // Get all weekdays between start and end date
  function getDatesBetween(start: string, end: string): string[] {
    const dates: string[] = []
    const current = new Date(start + 'T00:00:00')
    const endDate = new Date(end + 'T00:00:00')

    while (current <= endDate) {
      const dow = current.getDay()
      if (dow >= 1 && dow <= 5) { // Mon-Fri only
        const y = current.getFullYear()
        const m = String(current.getMonth() + 1).padStart(2, '0')
        const d = String(current.getDate()).padStart(2, '0')
        dates.push(`${y}-${m}-${d}`)
      }
      current.setDate(current.getDate() + 1)
    }
    return dates
  }

  async function handleApprove(request: any) {
    const emp = request.employees || {}
    const label = LEAVE_TYPE_LABELS[request.leave_type] || request.leave_type
    if (!confirm(`Approve ${label} for ${emp.first_name} ${emp.last_name}?\n\n${request.start_date} → ${request.end_date}`)) return
    setProcessingId(request.id)
    try {
      // 1. Update leave request status
      const { error: updateError } = await supabase
        .from("leave_requests")
        .update({
          status: 'approved',
          admin_remarks: remarks[request.id] || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", request.id)

      if (updateError) throw updateError

      // 2. Create attendance exceptions for each day in the range
      const exceptionType = LEAVE_TO_EXCEPTION[request.leave_type] || 'approved_leave'
      const dates = getDatesBetween(request.start_date, request.end_date)

      if (dates.length > 0) {
        const exceptions = dates.map(date => ({
          employee_id: request.employee_id,
          exception_date: date,
          type: exceptionType,
          reason: `Leave request: ${LEAVE_TYPE_LABELS[request.leave_type] || request.leave_type}${request.reason ? ` - ${request.reason}` : ''}`,
        }))

        // Insert, ignoring duplicates (unique constraint will prevent doubles)
        for (const exc of exceptions) {
          await supabase.from("attendance_exceptions").upsert(exc, {
            onConflict: 'employee_id,exception_date,type',
          })
        }
      }

      toast({
        title: "Approved",
        description: `Leave request approved. ${dates.length} attendance exception(s) created.`,
      })

      fetchRequests()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setProcessingId(null)
    }
  }

  async function handleReject(request: any) {
    const emp = request.employees || {}
    const label = LEAVE_TYPE_LABELS[request.leave_type] || request.leave_type
    if (!confirm(`Reject ${label} for ${emp.first_name} ${emp.last_name}?\n\n${request.start_date} → ${request.end_date}`)) return
    setProcessingId(request.id)
    try {
      const { error } = await supabase
        .from("leave_requests")
        .update({
          status: 'rejected',
          admin_remarks: remarks[request.id] || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", request.id)

      if (error) throw error

      toast({ title: "Rejected", description: "Leave request rejected." })
      fetchRequests()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setProcessingId(null)
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PK', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Inbox className="w-5 h-5 text-purple-400" />
                Leave Requests
                {filter === 'pending' && pendingCount > 0 && (
                  <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    {pendingCount} pending
                  </span>
                )}
              </CardTitle>
              <CardDescription>Review and manage employee leave requests</CardDescription>
            </div>
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />Loading...
            </div>
          ) : requests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {filter === 'pending' ? 'No pending leave requests.' : `No ${filter} requests found.`}
            </p>
          ) : (
            <div className="space-y-4">
              {requests.map(req => {
                const emp = req.employees || {}
                const isSingleDay = req.start_date === req.end_date
                const isPending = req.status === 'pending'
                const isProcessing = processingId === req.id

                return (
                  <div
                    key={req.id}
                    className={`p-4 rounded-lg border ${
                      isPending ? 'border-amber-500/30 bg-amber-500/5' :
                      req.status === 'approved' ? 'border-emerald-500/20' :
                      'border-red-500/20'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground">
                            {emp.first_name} {emp.last_name}
                          </span>
                          <span className="text-xs text-muted-foreground">({emp.employee_id})</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${
                            isPending ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                            req.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                            'bg-red-500/10 border-red-500/20 text-red-400'
                          }`}>
                            {isPending ? <Clock className="w-3 h-3" /> :
                             req.status === 'approved' ? <CheckCircle className="w-3 h-3" /> :
                             <XCircle className="w-3 h-3" />}
                            {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          <span className="font-medium text-foreground">{LEAVE_TYPE_LABELS[req.leave_type] || req.leave_type}</span>
                          {' — '}
                          {isSingleDay ? formatDate(req.start_date) : `${formatDate(req.start_date)} → ${formatDate(req.end_date)}`}
                        </p>
                        {req.reason && (
                          <p className="text-sm text-muted-foreground mt-1">Reason: {req.reason}</p>
                        )}
                        {req.admin_remarks && (
                          <p className="text-sm mt-1">
                            <span className="text-muted-foreground">Remarks: </span>
                            <span className="text-foreground">{req.admin_remarks}</span>
                          </p>
                        )}
                      </div>

                      {isPending && (
                        <div className="flex flex-col gap-2 lg:w-64">
                          <Input
                            placeholder="Remarks (optional)"
                            value={remarks[req.id] || ''}
                            onChange={e => setRemarks({ ...remarks, [req.id]: e.target.value })}
                            className="text-sm"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(req)}
                              disabled={isProcessing}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                            >
                              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(req)}
                              disabled={isProcessing}
                              className="flex-1"
                            >
                              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />}
                              Reject
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
