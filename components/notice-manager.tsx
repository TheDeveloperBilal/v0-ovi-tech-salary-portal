"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  Megaphone, Plus, Trash2, Clock, Users, User, AlertTriangle,
  Bell, Loader2, CheckCircle,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { logAudit } from "@/lib/audit"

const PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  normal: { bg: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-400', label: 'Normal' },
  important: { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400', label: 'Important' },
  urgent: { bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-400', label: 'Urgent' },
}

export function NoticeManager() {
  const [notices, setNotices] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '',
    content: '',
    priority: 'normal',
    target_type: 'all',
    target_employee_ids: [] as string[],
    duration_days: 3,
  })

  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchNotices()
    fetchEmployees()
  }, [])

  async function fetchNotices() {
    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/notices', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (res.ok) setNotices(data.notices || [])
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchEmployees() {
    const { data } = await supabase
      .from('employees')
      .select('id, first_name, last_name, department')
      .order('first_name')
    setEmployees(data || [])
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch('/api/notices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }

      logAudit({
        action: 'create_notice',
        entity_type: 'company_notice',
        details: { title: form.title, target: form.target_type, duration: form.duration_days },
      })

      toast({ title: 'Notice Created', description: `"${form.title}" published successfully.` })
      setIsFormOpen(false)
      setForm({ title: '', content: '', priority: 'normal', target_type: 'all', target_employee_ids: [], duration_days: 3 })
      fetchNotices()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(notice: any) {
    if (!confirm(`Delete notice "${notice.title}"?`)) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/notices', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id: notice.id }),
      })

      if (!res.ok) throw new Error('Failed to delete')

      logAudit({
        action: 'delete_notice',
        entity_type: 'company_notice',
        entity_id: notice.id,
        details: { title: notice.title },
      })

      toast({ title: 'Deleted', description: 'Notice removed.' })
      fetchNotices()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  function isExpired(notice: any) {
    return new Date(notice.expires_at) < new Date()
  }

  function timeLeft(notice: any) {
    const diff = new Date(notice.expires_at).getTime() - Date.now()
    if (diff <= 0) return 'Expired'
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days}d ${hours % 24}h left`
    return `${hours}h left`
  }

  function toggleEmployee(empId: string) {
    setForm(prev => ({
      ...prev,
      target_employee_ids: prev.target_employee_ids.includes(empId)
        ? prev.target_employee_ids.filter(id => id !== empId)
        : [...prev.target_employee_ids, empId],
    }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-purple-400" />
            Company Notices
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Publish announcements visible to all or specific employees
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Notice
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card border-l-4 border-l-emerald-500">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Active</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {notices.filter(n => !isExpired(n)).length}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card border-l-4 border-l-gray-500">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Expired</p>
            <p className="text-2xl font-bold text-gray-400 mt-1">
              {notices.filter(n => isExpired(n)).length}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card border-l-4 border-l-purple-500">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
            <p className="text-2xl font-bold text-purple-400 mt-1">{notices.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Notices List */}
      {notices.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <Megaphone className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No notices yet. Create your first announcement.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notices.map(notice => {
            const expired = isExpired(notice)
            const pStyle = PRIORITY_STYLES[notice.priority] || PRIORITY_STYLES.normal
            return (
              <Card key={notice.id} className={`glass-card ${expired ? 'opacity-50' : ''}`}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3 className="font-semibold text-foreground">{notice.title}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${pStyle.bg} ${pStyle.text}`}>
                          {pStyle.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          notice.target_type === 'all'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        }`}>
                          {notice.target_type === 'all' ? (
                            <><Users className="w-3 h-3 inline mr-1" />All Employees</>
                          ) : (
                            <><User className="w-3 h-3 inline mr-1" />Specific</>
                          )}
                        </span>
                        <span className={`text-xs ${expired ? 'text-red-400' : 'text-muted-foreground'}`}>
                          <Clock className="w-3 h-3 inline mr-1" />
                          {timeLeft(notice)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{notice.content}</p>
                      <p className="text-xs text-muted-foreground/60 mt-2">
                        Created {new Date(notice.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        {' · '}{notice.duration_days} day{notice.duration_days > 1 ? 's' : ''} duration
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(notice)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Notice Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-purple-400" />
              New Notice
            </DialogTitle>
            <DialogDescription>
              Create an announcement for your employees
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                placeholder="e.g. Office Closed for Eid"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Content *</Label>
              <textarea
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Write your announcement here..."
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="important">Important</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Duration (days)</Label>
                <Select value={String(form.duration_days)} onValueChange={v => setForm({ ...form, duration_days: Number(v) })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 5, 7, 14, 30].map(d => (
                      <SelectItem key={d} value={String(d)}>
                        {d} day{d > 1 ? 's' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Target Audience</Label>
              <Select value={form.target_type} onValueChange={v => setForm({ ...form, target_type: v, target_employee_ids: [] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  <SelectItem value="specific">Specific Employees</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.target_type === 'specific' && (
              <div>
                <Label className="mb-2 block">Select Employees</Label>
                <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                  {employees.map(emp => (
                    <label
                      key={emp.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={form.target_employee_ids.includes(emp.id)}
                        onChange={() => toggleEmployee(emp.id)}
                        className="rounded border-input"
                      />
                      <span>{emp.first_name} {emp.last_name}</span>
                      {emp.department && (
                        <span className="text-xs text-muted-foreground ml-auto">{emp.department}</span>
                      )}
                    </label>
                  ))}
                </div>
                {form.target_employee_ids.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {form.target_employee_ids.length} employee{form.target_employee_ids.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Megaphone className="w-4 h-4 mr-2" />
              )}
              Publish Notice
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
