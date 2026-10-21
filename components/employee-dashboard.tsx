'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Eye, Calendar, Clock, CalendarDays, Plus,
  CheckCircle, XCircle, Loader2, FileText, AlertCircle, Send, Trash2,
  Home, Briefcase, Play, Square, Megaphone, ShieldCheck, Download, Info,
} from 'lucide-react'
import { SalarySlipPreview } from './salary-slip-preview'
import { SignatureCanvas } from './signature-canvas'
import { useToast } from '@/hooks/use-toast'

const LEAVE_TYPES = [
  { value: 'casual_leave', label: 'Casual Leave' },
  { value: 'sick_leave', label: 'Sick Leave' },
  { value: 'work_from_home', label: 'Work From Home' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'early_out', label: 'Early Out' },
  { value: 'other', label: 'Other' },
]

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: any }> = {
  pending: { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400', icon: Clock },
  approved: { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', icon: CheckCircle },
  rejected: { bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-400', icon: XCircle },
}


export function EmployeeDashboard({ userId, activeView = 'overview' }: { userId: string; activeView?: string }) {
  const [salarySlips, setSalarySlips] = useState<any[]>([])
  const [employeeData, setEmployeeData] = useState<any>(null)
  const [selectedSlip, setSelectedSlip] = useState<any>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const [attMonth, setAttMonth] = useState(new Date().getMonth() + 1)
  const [attYear, setAttYear] = useState(new Date().getFullYear())
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([])
  const [isLoadingAtt, setIsLoadingAtt] = useState(false)
  const [holidays, setHolidays] = useState<Map<string, string>>(new Map())
  const [exceptions, setExceptions] = useState<Map<string, { type: string; reason: string }[]>>(new Map())

  const [leaveRequests, setLeaveRequests] = useState<any[]>([])
  const [isLeaveFormOpen, setIsLeaveFormOpen] = useState(false)
  const [leaveForm, setLeaveForm] = useState({
    leave_type: 'casual_leave',
    start_date: '',
    end_date: '',
    reason: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [wfhStatus, setWfhStatus] = useState<{
    is_wfh_today: boolean
    record: { check_in: string; check_out: string | null; work_hours: number; status: string; is_late: boolean; is_early_out: boolean } | null
  } | null>(null)
  const [isClocking, setIsClocking] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)

  const [notices, setNotices] = useState<any[]>([])
  const [policies, setPolicies] = useState<any[]>([])
  const [policySigs, setPolicySigs] = useState<any[]>([])
  const [signingPolicyId, setSigningPolicyId] = useState<string | null>(null)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [isSigningPolicy, setIsSigningPolicy] = useState(false)

  const supabase = createClient()
  const { toast } = useToast()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetchEmployeeData()
    fetchNotices()
    fetchPolicies()
  }, [userId])

  useEffect(() => {
    if (employeeData?.id) {
      fetchLeaveRequests()
    }
  }, [employeeData?.id])

  useEffect(() => {
    if (employeeData?.id && activeView === 'attendance') {
      fetchAttendance()
    }
  }, [employeeData?.id, attMonth, attYear, activeView])

  useEffect(() => {
    if (wfhStatus?.record?.check_in && !wfhStatus?.record?.check_out) {
      const checkInTime = parseTimeToMs(wfhStatus.record.check_in)
      const updateElapsed = () => {
        const now = new Date()
        const nowMs = now.getHours() * 3600000 + now.getMinutes() * 60000 + now.getSeconds() * 1000
        setElapsedTime(Math.max(0, Math.floor((nowMs - checkInTime) / 1000)))
      }
      updateElapsed()
      timerRef.current = setInterval(updateElapsed, 1000)
      return () => { if (timerRef.current) clearInterval(timerRef.current) }
    } else {
      setElapsedTime(0)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [wfhStatus?.record?.check_in, wfhStatus?.record?.check_out])

  const parseTimeToMs = (time: string): number => {
    const [h, m, s] = time.split(':').map(Number)
    return h * 3600000 + m * 60000 + (s || 0) * 1000
  }

  const formatElapsed = (totalSeconds: number): { hours: string; minutes: string; seconds: string } => {
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    return {
      hours: String(h).padStart(2, '0'),
      minutes: String(m).padStart(2, '0'),
      seconds: String(s).padStart(2, '0'),
    }
  }

  const fetchEmployeeData = async () => {
    try {
      setIsLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) throw new Error('User not authenticated')

      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('email', user.email)
        .single()
      if (empError) throw empError
      setEmployeeData(employee)

      const { data: slips } = await supabase
        .from('salary_slips')
        .select('*')
        .eq('employee_id', employee.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
      setSalarySlips(slips || [])
    } catch {
      toast({ title: 'Error', description: 'Failed to load your data. Please try refreshing the page.', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAttendance = async () => {
    if (!employeeData?.id) return
    setIsLoadingAtt(true)
    try {
      const firstDay = `${attYear}-${String(attMonth).padStart(2, '0')}-01`
      const lastDay = new Date(attYear, attMonth, 0).toISOString().split('T')[0]

      const [attRes, holRes, excRes] = await Promise.all([
        supabase
          .from('attendance_records')
          .select('*')
          .eq('employee_id', employeeData.id)
          .eq('month', attMonth)
          .eq('year', attYear)
          .order('attendance_date', { ascending: true }),
        supabase
          .from('company_holidays')
          .select('holiday_date, name')
          .gte('holiday_date', firstDay)
          .lte('holiday_date', lastDay),
        supabase
          .from('attendance_exceptions')
          .select('employee_id, exception_date, type, reason')
          .eq('employee_id', employeeData.id)
          .gte('exception_date', firstDay)
          .lte('exception_date', lastDay),
      ])

      if (attRes.error) throw attRes.error
      setAttendanceRecords(attRes.data || [])

      const holMap = new Map<string, string>()
      for (const h of (holRes.data || [])) holMap.set(h.holiday_date, h.name)
      setHolidays(holMap)

      const excMap = new Map<string, { type: string; reason: string }[]>()
      for (const ex of (excRes.data || [])) {
        const key = `${ex.employee_id}|${ex.exception_date}`
        const arr = excMap.get(key) || []
        arr.push({ type: ex.type, reason: ex.reason || '' })
        excMap.set(key, arr)
      }
      setExceptions(excMap)
    } catch {
      toast({ title: 'Error', description: 'Failed to load attendance records.', variant: 'destructive' })
    } finally {
      setIsLoadingAtt(false)
    }
  }

  const fetchLeaveRequests = async () => {
    if (!employeeData?.id) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const res = await fetch('/api/leave-requests', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const result = await res.json()
        setLeaveRequests(result.leave_requests || [])
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load leave requests.', variant: 'destructive' })
    }
  }

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeData?.id) return

    if (leaveForm.end_date < leaveForm.start_date) {
      toast({ title: 'Error', description: 'End date cannot be before start date', variant: 'destructive' })
      return
    }

    const currentRemaining = Math.max(0, 14 - (employeeData?.leaves_taken || 0))
    const start = new Date(leaveForm.start_date + 'T00:00:00')
    const end = new Date(leaveForm.end_date + 'T00:00:00')
    let requestedDays = 0
    const d = new Date(start)
    while (d <= end) {
      const dow = d.getDay()
      if (dow >= 1 && dow <= 5) requestedDays++
      d.setDate(d.getDate() + 1)
    }

    const quotaTypes = ['casual_leave', 'sick_leave']
    if (quotaTypes.includes(leaveForm.leave_type) && requestedDays > currentRemaining) {
      toast({
        title: 'Insufficient Leave Balance',
        description: `You have ${currentRemaining} leave(s) remaining but requested ${requestedDays} day(s). Please reduce the duration or contact admin.`,
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Not authenticated')

      const res = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          leave_type: leaveForm.leave_type,
          start_date: leaveForm.start_date,
          end_date: leaveForm.end_date,
          reason: leaveForm.reason || null,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to submit')

      toast({ title: 'Leave request submitted', description: 'Your request has been sent to admin for approval.' })
      setLeaveForm({ leave_type: 'casual_leave', start_date: '', end_date: '', reason: '' })
      setIsLeaveFormOpen(false)
      fetchLeaveRequests()
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to submit leave request. Please try again or contact admin.', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelRequest = async (id: string) => {
    if (!confirm('Cancel this leave request?')) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Not authenticated')

      const res = await fetch('/api/leave-requests', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to cancel')

      setLeaveRequests(leaveRequests.filter(r => r.id !== id))
      toast({ title: 'Cancelled', description: 'Leave request cancelled.' })
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to cancel leave request.', variant: 'destructive' })
    }
  }

  const fetchNotices = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const res = await fetch('/api/notices', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setNotices(data.notices || [])
      }
    } catch {}
  }

  const fetchPolicies = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const res = await fetch('/api/policies', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setPolicies(data.policies || [])
        setPolicySigs(data.signatures || [])
      }
    } catch {}
  }

  const handleSignPolicy = async (policyId: string) => {
    if (!signatureData) {
      toast({ title: 'Error', description: 'Please draw your signature', variant: 'destructive' })
      return
    }
    setIsSigningPolicy(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Not authenticated')

      const res = await fetch('/api/policies/sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ policy_id: policyId, signature_text: signatureData }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast({ title: 'Policy Signed', description: data.message })
      setSigningPolicyId(null)
      setSignatureData(null)
      fetchPolicies()
    } catch {
      toast({ title: 'Error', description: 'Failed to sign policy. Please try again.', variant: 'destructive' })
    } finally {
      setIsSigningPolicy(false)
    }
  }

  const fetchWfhStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const res = await fetch('/api/wfh/clock', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        setWfhStatus(await res.json())
      }
    } catch {
      // not critical
    }
  }

  const handleWfhClock = async () => {
    setIsClocking(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Not authenticated')
      const res = await fetch('/api/wfh/clock', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: data.action === 'check_in' ? 'Checked In' : 'Checked Out', description: data.message })
      fetchWfhStatus()
    } catch {
      toast({ title: 'Error', description: 'Failed to record WFH clock. Please try again.', variant: 'destructive' })
    } finally {
      setIsClocking(false)
    }
  }

  useEffect(() => { fetchWfhStatus() }, [employeeData])

  const handleViewSlip = (slip: any) => {
    const summary = slip.attendance_summary || {}
    setSelectedSlip({
      basic_salary: slip.basic_salary,
      baseSalary: slip.basic_salary,
      net_salary: slip.net_salary,
      month: slip.month,
      year: slip.year,
      employee_name: `${employeeData?.first_name} ${employeeData?.last_name}`,
      employee_id: employeeData?.employee_id,
      email: employeeData?.email,
      department: employeeData?.department,
      designation: employeeData?.designation,
      position: employeeData?.designation,
      joinDate: employeeData?.date_of_joining,
      is_probation: slip.is_probation || employeeData?.is_probation || false,
      probation_end_date: employeeData?.probation_end_date || null,
      working_days: slip.working_days,
      present_days: slip.present_days,
      absent_days: slip.absent_days,
      leaves_deducted: slip.leaves_deducted,
      total_deductions: slip.total_deductions,
      lateDays: summary.lateDays || 0,
      earlyOutDays: summary.earlyOutDays || 0,
      violationDeductions: summary.violationDeductions || 0,
      leavesUsed: summary.leavesUsed || 0,
      absentSalaryDays: summary.absentSalaryDays || 0,
      remainingLeaves: summary.remainingLeaves || 0,
      dailyRate: summary.dailyRate || 0,
      incomeTax: summary.incomeTax || slip.income_tax || 0,
      allowances: slip.allowances || {},
      deductions: slip.deductions || {},
    })
    setIsPreviewOpen(true)
  }

  const getMonthName = (m: number) => {
    return new Date(2024, m - 1).toLocaleDateString('en-US', { month: 'long' })
  }

  const getStatusBadge = (status: string) => {
    const s = STATUS_STYLES[status] || STATUS_STYLES.pending
    const Icon = s.icon
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.bg} ${s.text}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const formatTime12h = (time: string | null): string => {
    if (!time) return '—'
    const [h, m] = time.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 || 12
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
  }

  const EXCEPTION_LABELS: Record<string, { label: string; color: string }> = {
    approved_leave: { label: 'Approved Leave', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/25' },
    approved_late: { label: 'Approved Late', color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/25' },
    approved_early_out: { label: 'Approved Early Out', color: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-indigo-500/25' },
    half_day: { label: 'Half Day', color: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-400 dark:border-violet-500/25' },
    work_from_home: { label: 'WFH', color: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-400 dark:border-cyan-500/25' },
  }

  const getDateBadges = (date: string, employeeId: string) => {
    const badges: React.ReactElement[] = []
    const holidayName = holidays.get(date)
    if (holidayName) {
      badges.push(
        <span key="holiday" className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 border border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/25">
          {holidayName}
        </span>
      )
    }
    const excKey = `${employeeId}|${date}`
    const excs = exceptions.get(excKey)
    if (excs) {
      for (const exc of excs) {
        const style = EXCEPTION_LABELS[exc.type] || { label: exc.type.replace(/_/g, ' '), color: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-500/15 dark:text-gray-400 dark:border-gray-500/25' }
        badges.push(
          <span key={exc.type} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${style.color}`}>
            {style.label}
          </span>
        )
      }
    }
    return badges.length > 0 ? <div className="flex flex-wrap gap-1 mt-0.5">{badges}</div> : null
  }

  const getAttStatusColor = (record: any) => {
    if (record.is_absent) return 'text-[var(--ep-error)]'
    if (record.is_late && record.is_early_out) return 'text-amber-500 dark:text-amber-400'
    if (record.is_late) return 'text-amber-500 dark:text-amber-400'
    if (record.is_early_out) return 'text-amber-500 dark:text-amber-400'
    return 'text-[var(--ep-tertiary)] dark:text-[var(--ep-tertiary)]'
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PK', {
      weekday: 'short', day: 'numeric', month: 'short',
    })
  }

  const formatDateFull = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PK', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  const attPresent = attendanceRecords.filter(r => !r.is_absent).length
  const attAbsent = attendanceRecords.filter(r => r.is_absent).length
  const attLate = attendanceRecords.filter(r => r.is_late && !r.is_absent).length
  const attEarlyOut = attendanceRecords.filter(r => r.is_early_out && !r.is_absent).length
  const pendingRequests = leaveRequests.filter(r => r.status === 'pending').length
  const remainingLeaves = Math.max(0, 14 - (employeeData?.leaves_taken || 0))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: 'var(--ep-primary)' }} />
          <p className="text-[var(--ep-on-surface-variant)] font-display text-sm">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  const elapsed = formatElapsed(elapsedTime)
  const leavePercent = employeeData?.is_probation ? 0 : Math.round((remainingLeaves / 14) * 100)
  const leaveStrokeDash = (leavePercent / 100) * 226

  return (
    <div className="space-y-6 font-display">

      {/* ─── Profile Banner ─── */}
      <div className="ep-card-white p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-[0.04]" style={{ background: 'var(--ep-primary)', filter: 'blur(80px)' }} />
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 relative">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--ep-primary), var(--ep-primary-container))' }}>
            {(employeeData?.first_name?.[0] || '').toUpperCase()}{(employeeData?.last_name?.[0] || '').toUpperCase()}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-extrabold text-[var(--ep-on-surface)] tracking-tight">
                {employeeData?.first_name} {employeeData?.last_name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide"
                style={{
                  background: employeeData?.is_probation ? 'rgba(180,130,0,0.1)' : 'rgba(0,82,55,0.08)',
                  color: employeeData?.is_probation ? 'var(--ep-error)' : 'var(--ep-tertiary)',
                  border: `1px solid ${employeeData?.is_probation ? 'rgba(180,130,0,0.2)' : 'rgba(0,82,55,0.15)'}`,
                }}>
                {employeeData?.is_probation ? 'PROBATION' : 'CONFIRMED'}
              </span>
            </div>
            <p className="text-sm text-[var(--ep-on-surface-variant)] mt-1">
              {employeeData?.designation || 'Employee'} &middot; {employeeData?.department || 'N/A'} &middot; ID: {employeeData?.employee_id}
            </p>
            {employeeData?.date_of_joining && (
              <p className="text-xs text-[var(--ep-outline)] mt-0.5">
                Joined {new Date(employeeData.date_of_joining + 'T00:00:00').toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>

          {/* Leave Gauge */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="relative w-20 h-20">
              <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
                <circle cx="40" cy="40" r="36" fill="none" strokeWidth="5" className="stroke-[var(--ep-surface-container)]" />
                <circle cx="40" cy="40" r="36" fill="none" strokeWidth="5" strokeLinecap="round"
                  style={{
                    stroke: 'var(--ep-tertiary)',
                    strokeDasharray: `${leaveStrokeDash} 226`,
                    transition: 'stroke-dasharray 0.6s ease',
                  }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-extrabold text-[var(--ep-on-surface)]">{employeeData?.is_probation ? '—' : remainingLeaves}</span>
                <span className="text-[9px] font-semibold text-[var(--ep-outline)] uppercase tracking-wider">of 14</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── WFH Timer Clock ─── */}
      {wfhStatus?.is_wfh_today && (
        <div className="ep-card-white overflow-hidden" style={{ borderLeft: '4px solid var(--ep-secondary)' }}>
          <div className="p-6" style={{ background: 'linear-gradient(135deg, rgba(0,88,190,0.04), rgba(100,0,189,0.04))' }}>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1 flex flex-col items-center md:items-start gap-3">
                <div className="flex items-center gap-2">
                  <Home className="w-5 h-5" style={{ color: 'var(--ep-secondary)' }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--ep-secondary)' }}>Work From Home</span>
                </div>

                {!wfhStatus.record ? (
                  <div className="text-center md:text-left">
                    <div className="flex items-baseline gap-1 font-mono">
                      <span className="text-5xl font-extrabold text-[var(--ep-on-surface)]/20">00</span>
                      <span className="text-3xl font-bold text-[var(--ep-outline)]">:</span>
                      <span className="text-5xl font-extrabold text-[var(--ep-on-surface)]/20">00</span>
                      <span className="text-3xl font-bold text-[var(--ep-outline)]">:</span>
                      <span className="text-5xl font-extrabold text-[var(--ep-on-surface)]/20">00</span>
                    </div>
                    <p className="text-sm text-[var(--ep-on-surface-variant)] mt-2">Ready to start your work day</p>
                  </div>
                ) : !wfhStatus.record.check_out ? (
                  <div className="text-center md:text-left">
                    <div className="flex items-baseline gap-1 font-mono">
                      <span className="text-5xl font-extrabold text-[var(--ep-on-surface)]">{elapsed.hours}</span>
                      <span className="text-3xl font-bold animate-pulse" style={{ color: 'var(--ep-primary)' }}>:</span>
                      <span className="text-5xl font-extrabold text-[var(--ep-on-surface)]">{elapsed.minutes}</span>
                      <span className="text-3xl font-bold animate-pulse" style={{ color: 'var(--ep-primary)' }}>:</span>
                      <span className="text-5xl font-extrabold text-[var(--ep-on-surface)]">{elapsed.seconds}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-[var(--ep-on-surface-variant)]">
                      <span>Checked in at <span className="text-[var(--ep-on-surface)] font-semibold">{formatTime12h(wfhStatus.record.check_in)}</span></span>
                      {wfhStatus.record.is_late && <span className="text-amber-600 dark:text-amber-400 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10">Late</span>}
                    </div>
                  </div>
                ) : (
                  <div className="text-center md:text-left">
                    <div className="flex items-baseline gap-1 font-mono">
                      <span className="text-5xl font-extrabold" style={{ color: 'var(--ep-tertiary)' }}>{String(Math.floor(wfhStatus.record.work_hours)).padStart(2, '0')}</span>
                      <span className="text-3xl font-bold" style={{ color: 'var(--ep-tertiary-dim)' }}>:</span>
                      <span className="text-5xl font-extrabold" style={{ color: 'var(--ep-tertiary)' }}>{String(Math.round((wfhStatus.record.work_hours % 1) * 60)).padStart(2, '0')}</span>
                      <span className="text-3xl font-bold" style={{ color: 'var(--ep-tertiary-dim)' }}>:</span>
                      <span className="text-5xl font-extrabold" style={{ color: 'var(--ep-tertiary)' }}>00</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-[var(--ep-on-surface-variant)]">
                      <span>{formatTime12h(wfhStatus.record.check_in)} — {formatTime12h(wfhStatus.record.check_out)}</span>
                      {wfhStatus.record.is_early_out && <span className="text-amber-600 dark:text-amber-400 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10">Early Out</span>}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center gap-2">
                {!wfhStatus.record ? (
                  <button
                    onClick={handleWfhClock}
                    disabled={isClocking}
                    className="w-20 h-20 rounded-full text-white flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                    style={{ background: 'var(--ep-tertiary)', boxShadow: '0 8px 24px rgba(0,82,55,0.25)' }}
                  >
                    {isClocking ? <Loader2 className="w-8 h-8 animate-spin" /> : <Play className="w-8 h-8 ml-1" />}
                  </button>
                ) : !wfhStatus.record.check_out ? (
                  <button
                    onClick={handleWfhClock}
                    disabled={isClocking}
                    className="w-20 h-20 rounded-full text-white flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                    style={{ background: 'var(--ep-error)', boxShadow: '0 8px 24px rgba(186,26,26,0.25)' }}
                  >
                    {isClocking ? <Loader2 className="w-8 h-8 animate-spin" /> : <Square className="w-7 h-7" />}
                  </button>
                ) : (
                  <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,82,55,0.08)', border: '2px solid var(--ep-tertiary-dim)' }}>
                    <CheckCircle className="w-8 h-8" style={{ color: 'var(--ep-tertiary)' }} />
                  </div>
                )}
                <span className="text-xs text-[var(--ep-on-surface-variant)] font-semibold">
                  {!wfhStatus.record ? 'Check In' : !wfhStatus.record.check_out ? 'Check Out' : 'Completed'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ OVERVIEW TAB ═══════ */}
      {activeView === 'overview' && (
        <div className="space-y-6">
          {/* KPI Stat Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {/* Leaves Left */}
            <div className="ep-card-white p-5 relative overflow-hidden" style={{ borderLeft: '4px solid var(--ep-tertiary)' }}>
              <p className="text-[11px] font-bold text-[var(--ep-on-surface-variant)] uppercase tracking-widest">Leave Quota</p>
              <p className="text-3xl font-extrabold text-[var(--ep-on-surface)] mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {employeeData?.is_probation ? 'N/A' : remainingLeaves}
              </p>
              {!employeeData?.is_probation && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--ep-surface-container)' }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${leavePercent}%`, background: 'var(--ep-tertiary)' }} />
                  </div>
                  <span className="text-[10px] font-bold" style={{ color: 'var(--ep-tertiary)' }}>{leavePercent}%</span>
                </div>
              )}
            </div>

            {/* Pending Requests */}
            <div className="ep-card-white p-5 relative overflow-hidden" style={{ borderLeft: '4px solid var(--ep-secondary)' }}>
              <p className="text-[11px] font-bold text-[var(--ep-on-surface-variant)] uppercase tracking-widest">Pending</p>
              <p className="text-3xl font-extrabold mt-1" style={{ color: pendingRequests > 0 ? 'var(--ep-secondary)' : 'var(--ep-on-surface)', fontVariantNumeric: 'tabular-nums' }}>
                {pendingRequests}
              </p>
              <p className="text-xs text-[var(--ep-outline)] mt-2 font-medium">
                {pendingRequests === 0 ? 'All Clear' : `${pendingRequests} awaiting review`}
              </p>
            </div>

            {/* Monthly Net Pay */}
            <div className="ep-card-white p-5 relative overflow-hidden" style={{ borderLeft: '4px solid var(--ep-primary)' }}>
              <p className="text-[11px] font-bold text-[var(--ep-on-surface-variant)] uppercase tracking-widest">Net Pay</p>
              <p className="text-2xl font-extrabold text-[var(--ep-on-surface)] mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {salarySlips.length > 0 ? `PKR ${(salarySlips[0].net_salary || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}` : '—'}
              </p>
              {salarySlips.length > 0 && (
                <p className="text-xs text-[var(--ep-outline)] mt-2 font-medium">{getMonthName(salarySlips[0].month)} {salarySlips[0].year}</p>
              )}
            </div>

            {/* Salary Slips */}
            <div className="ep-card-white p-5 relative overflow-hidden" style={{ borderLeft: '4px solid var(--ep-on-surface)' }}>
              <p className="text-[11px] font-bold text-[var(--ep-on-surface-variant)] uppercase tracking-widest">Salary Slips</p>
              <p className="text-3xl font-extrabold text-[var(--ep-on-surface)] mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {salarySlips.length}
              </p>
              <p className="text-xs text-[var(--ep-outline)] mt-2 font-medium">
                {salarySlips.length > 0 ? 'Generated' : 'No slips yet'}
              </p>
            </div>
          </div>

          {/* Two-Column Workspace */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left Column */}
            <div className="lg:col-span-8 space-y-6">

              {/* Latest Salary Statement */}
              <div className="ep-card-white overflow-hidden">
                <div className="p-5 text-white" style={{ background: 'linear-gradient(135deg, var(--ep-primary), var(--ep-primary-container))' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest opacity-80">Latest Salary Statement</p>
                      {salarySlips.length > 0 && (
                        <p className="text-3xl font-extrabold mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          PKR {(salarySlips[0].net_salary || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}
                        </p>
                      )}
                    </div>
                    {salarySlips.length > 0 && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-sm">
                        {getMonthName(salarySlips[0].month)} {salarySlips[0].year}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-5">
                  {salarySlips.length > 0 ? (
                    <>
                      <div className="space-y-0 divide-y divide-[var(--ep-surface-container)]">
                        <div className="flex justify-between items-center py-3">
                          <span className="text-sm text-[var(--ep-on-surface-variant)]">Base Salary</span>
                          <span className="text-sm font-bold text-[var(--ep-on-surface)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            PKR {(salarySlips[0].basic_salary || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-3">
                          <span className="text-sm text-[var(--ep-on-surface-variant)]">Total Deductions</span>
                          <span className="text-sm font-bold" style={{ color: 'var(--ep-error)', fontVariantNumeric: 'tabular-nums' }}>
                            - PKR {(salarySlips[0].total_deductions || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-3">
                          <span className="text-sm font-bold text-[var(--ep-on-surface)]">Net Salary</span>
                          <span className="text-base font-extrabold" style={{ color: 'var(--ep-primary)', fontVariantNumeric: 'tabular-nums' }}>
                            PKR {(salarySlips[0].net_salary || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>

                      {/* Recent slips */}
                      {salarySlips.length > 1 && (
                        <div className="mt-4 pt-4 border-t border-[var(--ep-surface-container)]">
                          <p className="text-[11px] font-bold text-[var(--ep-on-surface-variant)] uppercase tracking-widest mb-3">Payment History</p>
                          <div className="flex gap-2 flex-wrap">
                            {salarySlips.slice(0, 6).map(s => (
                              <button key={s.id} onClick={() => handleViewSlip(s)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                style={{ background: 'var(--ep-surface-container)', color: 'var(--ep-on-surface-variant)' }}>
                                {getMonthName(s.month).slice(0, 3)} {s.year}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button onClick={() => handleViewSlip(salarySlips[0])} variant="outline" size="sm" className="w-full mt-4 cursor-pointer">
                        <Eye className="w-4 h-4 mr-2" /> View Full Slip
                      </Button>
                    </>
                  ) : (
                    <p className="text-center text-[var(--ep-outline)] py-6">No salary slips available yet</p>
                  )}
                </div>
              </div>

              {/* Leave & Attendance Policy Guidelines */}
              <div className="ep-card-white p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Info className="w-4 h-4" style={{ color: 'var(--ep-secondary)' }} />
                  <h3 className="text-sm font-bold text-[var(--ep-on-surface)] uppercase tracking-wide">Leave & Attendance Policy</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl p-4" style={{ background: 'var(--ep-surface)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: 'var(--ep-tertiary)' }} />
                      <span className="text-xs font-bold text-[var(--ep-on-surface)]">Casual & Sick Leave</span>
                    </div>
                    <p className="text-xs text-[var(--ep-on-surface-variant)] leading-relaxed">Deducts 1 day per leave from the 14-day annual quota</p>
                  </div>
                  <div className="rounded-xl p-4" style={{ background: 'var(--ep-surface)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: 'var(--ep-secondary)' }} />
                      <span className="text-xs font-bold text-[var(--ep-on-surface)]">Half Day</span>
                    </div>
                    <p className="text-xs text-[var(--ep-on-surface-variant)] leading-relaxed">3 half days = 1 leave day deducted from quota</p>
                  </div>
                  <div className="rounded-xl p-4" style={{ background: 'var(--ep-surface)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: 'var(--ep-primary)' }} />
                      <span className="text-xs font-bold text-[var(--ep-on-surface)]">Work From Home</span>
                    </div>
                    <p className="text-xs text-[var(--ep-on-surface-variant)] leading-relaxed">Does not deduct from leave quota (requires admin approval)</p>
                  </div>
                  <div className="rounded-xl p-4" style={{ background: 'var(--ep-surface)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-xs font-bold text-[var(--ep-on-surface)]">Early Out & Other</span>
                    </div>
                    <p className="text-xs text-[var(--ep-on-surface-variant)] leading-relaxed">Does not deduct from leave quota (employee worked that day)</p>
                  </div>
                </div>
                <div className="mt-3 rounded-xl p-3 flex items-start gap-2" style={{ background: 'rgba(186,26,26,0.05)', border: '1px solid rgba(186,26,26,0.1)' }}>
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--ep-error)' }} />
                  <p className="text-xs text-[var(--ep-on-surface-variant)] leading-relaxed">
                    <span className="font-bold" style={{ color: 'var(--ep-error)' }}>Punctuality Rule:</span> Every 3 violations (late arrival or early departure) = 1 leave deducted from quota
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-4 space-y-6">
              {/* Employment Profile */}
              <div className="ep-card-white p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase className="w-4 h-4" style={{ color: 'var(--ep-secondary)' }} />
                  <h3 className="text-sm font-bold text-[var(--ep-on-surface)] uppercase tracking-wide">Employment Profile</h3>
                </div>
                <div className="space-y-0 divide-y divide-[var(--ep-surface-container)]">
                  {[
                    { label: 'Email', value: employeeData?.email },
                    { label: 'Department', value: employeeData?.department || 'N/A' },
                    { label: 'Designation', value: employeeData?.designation || 'N/A' },
                    { label: 'Join Date', value: employeeData?.date_of_joining ? new Date(employeeData.date_of_joining + 'T00:00:00').toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A' },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between items-center py-3 gap-2">
                      <span className="text-xs font-semibold text-[var(--ep-outline)] uppercase tracking-wide shrink-0">{row.label}</span>
                      <span className="text-sm font-semibold text-[var(--ep-on-surface)] text-right truncate">{row.value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center py-3">
                    <span className="text-xs font-semibold text-[var(--ep-outline)] uppercase tracking-wide">Status</span>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold"
                      style={{
                        background: employeeData?.is_probation ? 'rgba(186,26,26,0.08)' : 'rgba(0,82,55,0.08)',
                        color: employeeData?.is_probation ? 'var(--ep-error)' : 'var(--ep-tertiary)',
                      }}>
                      {employeeData?.is_probation ? 'Probation' : 'Confirmed'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="ep-card-white p-5">
                <h3 className="text-sm font-bold text-[var(--ep-on-surface)] uppercase tracking-wide mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: CalendarDays, label: 'Apply Leave', action: () => setIsLeaveFormOpen(true), color: 'var(--ep-primary)' },
                    { icon: Calendar, label: 'Attendance', action: () => {/* handled by sidebar */}, color: 'var(--ep-secondary)' },
                    { icon: FileText, label: 'Salary Slips', action: () => {/* handled by sidebar */}, color: 'var(--ep-tertiary)' },
                    { icon: ShieldCheck, label: 'Policies', action: () => {/* handled by sidebar */}, color: 'var(--ep-on-surface-variant)' },
                  ].map(item => (
                    <button key={item.label} onClick={item.action}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                      style={{ background: 'var(--ep-surface)' }}>
                      <item.icon className="w-5 h-5" style={{ color: item.color }} />
                      <span className="text-[11px] font-bold text-[var(--ep-on-surface-variant)] text-center">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Company Notices */}
          {notices.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4" style={{ color: 'var(--ep-primary)' }} />
                <h3 className="text-sm font-bold text-[var(--ep-on-surface)] uppercase tracking-wide">Company Notices</h3>
              </div>
              {notices.map((notice: any) => (
                <div key={notice.id} className="ep-card-white overflow-hidden"
                  style={{
                    borderLeft: `4px solid ${
                      notice.priority === 'urgent' ? 'var(--ep-error)' :
                      notice.priority === 'important' ? '#B89630' : 'var(--ep-secondary)'
                    }`,
                  }}>
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg shrink-0 mt-0.5"
                        style={{
                          background: notice.priority === 'urgent' ? 'rgba(186,26,26,0.06)' :
                            notice.priority === 'important' ? 'rgba(184,150,48,0.06)' : 'rgba(0,88,190,0.06)',
                        }}>
                        <Megaphone className="w-4 h-4" style={{
                          color: notice.priority === 'urgent' ? 'var(--ep-error)' :
                            notice.priority === 'important' ? '#B89630' : 'var(--ep-secondary)',
                        }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-[var(--ep-on-surface)]">{notice.title}</h4>
                          {notice.priority !== 'normal' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                              style={{
                                background: notice.priority === 'urgent' ? 'rgba(186,26,26,0.08)' : 'rgba(184,150,48,0.08)',
                                color: notice.priority === 'urgent' ? 'var(--ep-error)' : '#B89630',
                                border: `1px solid ${notice.priority === 'urgent' ? 'rgba(186,26,26,0.15)' : 'rgba(184,150,48,0.15)'}`,
                              }}>
                              {notice.priority}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[var(--ep-on-surface-variant)] mt-1 whitespace-pre-wrap">{notice.content}</p>
                        <p className="text-xs text-[var(--ep-outline)] mt-2">
                          {new Date(notice.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════ SALARY SLIPS TAB ═══════ */}
      {activeView === 'slips' && (
        <div>
          <h2 className="text-xl font-extrabold mb-5 text-[var(--ep-on-surface)] tracking-tight">My Salary Slips</h2>
          {salarySlips.length === 0 ? (
            <div className="ep-card-white p-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--ep-outline)' }} />
              <p className="text-[var(--ep-on-surface-variant)] font-medium">No salary slips yet. Please contact HR.</p>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {salarySlips.map((slip) => (
                <div key={slip.id} className="ep-card-white p-5 transition-all hover:shadow-lg group cursor-pointer" onClick={() => handleViewSlip(slip)}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-[var(--ep-on-surface)]">
                      {getMonthName(slip.month)} {slip.year}
                    </h3>
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ background: 'var(--ep-surface-container)' }}>
                      <Eye className="w-4 h-4" style={{ color: 'var(--ep-primary)' }} />
                    </span>
                  </div>
                  <div className="space-y-0 divide-y divide-[var(--ep-surface-container)]">
                    <div className="flex justify-between text-xs sm:text-sm py-2.5">
                      <span className="text-[var(--ep-on-surface-variant)]">Base Salary</span>
                      <span className="font-bold text-[var(--ep-on-surface)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        PKR {(slip.basic_salary || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm py-2.5">
                      <span className="text-[var(--ep-on-surface-variant)]">Deductions</span>
                      <span className="font-bold" style={{ color: 'var(--ep-error)', fontVariantNumeric: 'tabular-nums' }}>
                        PKR {(slip.total_deductions || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm py-2.5">
                      <span className="font-bold text-[var(--ep-on-surface-variant)]">Net Salary</span>
                      <span className="font-extrabold" style={{ color: 'var(--ep-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        PKR {(slip.net_salary || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════ ATTENDANCE TAB ═══════ */}
      {activeView === 'attendance' && (
        <div className="space-y-4">
          <div className="ep-card-white p-5">
            <div className="flex items-center gap-2 mb-5">
              <Calendar className="w-5 h-5" style={{ color: 'var(--ep-primary)' }} />
              <h2 className="text-lg font-bold text-[var(--ep-on-surface)] tracking-tight">My Attendance</h2>
            </div>

            <div className="flex flex-wrap gap-3 mb-5">
              <Select value={String(attMonth)} onValueChange={v => setAttMonth(parseInt(v))}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{getMonthName(i + 1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(attYear)} onValueChange={v => setAttYear(parseInt(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 3 }, (_, i) => {
                    const y = new Date().getFullYear() - 1 + i
                    return <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  })}
                </SelectContent>
              </Select>
            </div>

            {attendanceRecords.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(0,82,55,0.06)', border: '1px solid rgba(0,82,55,0.12)' }}>
                  <p className="text-2xl font-extrabold" style={{ color: 'var(--ep-tertiary)', fontVariantNumeric: 'tabular-nums' }}>{attPresent}</p>
                  <p className="text-[11px] font-bold text-[var(--ep-on-surface-variant)] uppercase tracking-wider mt-1">Present</p>
                </div>
                <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(186,26,26,0.06)', border: '1px solid rgba(186,26,26,0.12)' }}>
                  <p className="text-2xl font-extrabold" style={{ color: 'var(--ep-error)', fontVariantNumeric: 'tabular-nums' }}>{attAbsent}</p>
                  <p className="text-[11px] font-bold text-[var(--ep-on-surface-variant)] uppercase tracking-wider mt-1">Absent</p>
                </div>
                <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(184,150,48,0.06)', border: '1px solid rgba(184,150,48,0.12)' }}>
                  <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400" style={{ fontVariantNumeric: 'tabular-nums' }}>{attLate}</p>
                  <p className="text-[11px] font-bold text-[var(--ep-on-surface-variant)] uppercase tracking-wider mt-1">Late</p>
                </div>
                <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(184,150,48,0.06)', border: '1px solid rgba(184,150,48,0.12)' }}>
                  <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400" style={{ fontVariantNumeric: 'tabular-nums' }}>{attEarlyOut}</p>
                  <p className="text-[11px] font-bold text-[var(--ep-on-surface-variant)] uppercase tracking-wider mt-1">Early Out</p>
                </div>
              </div>
            )}

            {isLoadingAtt ? (
              <div className="text-center py-12">
                <Loader2 className="w-6 h-6 animate-spin inline mr-2" style={{ color: 'var(--ep-primary)' }} />
                <span className="text-[var(--ep-on-surface-variant)]">Loading...</span>
              </div>
            ) : attendanceRecords.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--ep-outline)' }} />
                <p className="text-[var(--ep-on-surface-variant)] font-medium">
                  No attendance records for {getMonthName(attMonth)} {attYear}.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--ep-surface-container)' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'var(--ep-surface)' }}>
                      <th className="text-left p-3 text-[var(--ep-on-surface-variant)] font-bold text-xs uppercase tracking-wider">Date</th>
                      <th className="text-left p-3 text-[var(--ep-on-surface-variant)] font-bold text-xs uppercase tracking-wider">Check In</th>
                      <th className="text-left p-3 text-[var(--ep-on-surface-variant)] font-bold text-xs uppercase tracking-wider">Check Out</th>
                      <th className="text-right p-3 text-[var(--ep-on-surface-variant)] font-bold text-xs uppercase tracking-wider">Hours</th>
                      <th className="text-left p-3 text-[var(--ep-on-surface-variant)] font-bold text-xs uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.map(r => (
                      <tr key={r.id} className="transition-colors hover:bg-[var(--ep-surface)]" style={{ borderBottom: '1px solid var(--ep-surface-container)' }}>
                        <td className="p-3 text-[var(--ep-on-surface)] font-medium">
                          <div>{formatDate(r.attendance_date)}</div>
                          {getDateBadges(r.attendance_date, r.employee_id || employeeData?.id)}
                        </td>
                        <td className={`p-3 font-medium ${r.is_late ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--ep-on-surface)]'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {formatTime12h(r.check_in)}
                        </td>
                        <td className={`p-3 font-medium ${r.is_early_out ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--ep-on-surface)]'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {formatTime12h(r.check_out)}
                        </td>
                        <td className="p-3 text-right text-[var(--ep-on-surface)] font-medium" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {r.work_hours ? `${r.work_hours}h` : '—'}
                        </td>
                        <td className={`p-3 font-bold text-xs uppercase tracking-wide ${getAttStatusColor(r)}`}>
                          {r.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ LEAVE REQUESTS TAB ═══════ */}
      {activeView === 'leaves' && (
        <div className="space-y-4">
          <div className="ep-card-white p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5" style={{ color: 'var(--ep-primary)' }} />
                  <h2 className="text-lg font-bold text-[var(--ep-on-surface)] tracking-tight">Leave Requests</h2>
                </div>
                <p className="text-sm text-[var(--ep-on-surface-variant)] mt-1">Apply for leave and track your request status</p>
              </div>
              <Button onClick={() => setIsLeaveFormOpen(true)} className="cursor-pointer"
                style={{ background: 'var(--ep-primary)', color: 'white' }}>
                <Plus className="w-4 h-4 mr-2" />
                Apply for Leave
              </Button>
            </div>

            {leaveRequests.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDays className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--ep-outline)' }} />
                <p className="text-[var(--ep-on-surface-variant)] font-medium">
                  No leave requests yet. Click &quot;Apply for Leave&quot; to submit one.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {leaveRequests.map(req => {
                  const lt = LEAVE_TYPES.find(t => t.value === req.leave_type)
                  const startDate = formatDateFull(req.start_date)
                  const endDate = formatDateFull(req.end_date)
                  const isSingleDay = req.start_date === req.end_date

                  return (
                    <div key={req.id} className="p-4 rounded-xl transition-all"
                      style={{ background: 'var(--ep-surface)', border: '1px solid var(--ep-surface-container)' }}>
                      <div className="flex flex-col sm:flex-row justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[var(--ep-on-surface)]">{lt?.label || req.leave_type}</span>
                            {getStatusBadge(req.status)}
                          </div>
                          <p className="text-sm text-[var(--ep-on-surface-variant)] mt-1">
                            {isSingleDay ? startDate : `${startDate} → ${endDate}`}
                          </p>
                          {req.reason && (
                            <p className="text-sm text-[var(--ep-outline)] mt-1">Reason: {req.reason}</p>
                          )}
                          {req.admin_remarks && (
                            <p className="text-sm mt-1">
                              <span className="text-[var(--ep-outline)]">Admin: </span>
                              <span className="text-[var(--ep-on-surface)] font-medium">{req.admin_remarks}</span>
                            </p>
                          )}
                        </div>
                        {req.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelRequest(req.id)}
                            className="self-start cursor-pointer"
                            style={{ color: 'var(--ep-error)' }}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <Dialog open={isLeaveFormOpen} onOpenChange={setIsLeaveFormOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Apply for Leave</DialogTitle>
                <DialogDescription>
                  Submit a leave request. Admin will review and approve or reject.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitLeave} className="space-y-4">
                <div>
                  <Label>Leave Type *</Label>
                  <Select
                    value={leaveForm.leave_type}
                    onValueChange={v => setLeaveForm({ ...leaveForm, leave_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAVE_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start Date *</Label>
                    <Input
                      type="date"
                      value={leaveForm.start_date}
                      onChange={e => setLeaveForm({ ...leaveForm, start_date: e.target.value, end_date: leaveForm.end_date || e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>End Date *</Label>
                    <Input
                      type="date"
                      value={leaveForm.end_date}
                      onChange={e => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                      min={leaveForm.start_date}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label>Reason</Label>
                  <Input
                    placeholder="e.g. Doctor appointment, family event"
                    value={leaveForm.reason}
                    onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  />
                </div>
                {!employeeData?.is_probation && (
                  <p className="text-xs text-[var(--ep-on-surface-variant)]">
                    Remaining leave quota: {remainingLeaves} / 14
                  </p>
                )}
                {employeeData?.is_probation && (
                  <p className="text-xs" style={{ color: 'var(--ep-error)' }}>
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    Probation employees have no paid leave. Absences will be deducted from salary.
                  </p>
                )}
                <Button type="submit" className="w-full cursor-pointer" disabled={isSubmitting}
                  style={{ background: 'var(--ep-primary)', color: 'white' }}>
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Submit Request
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ═══════ OFFICE POLICIES TAB ═══════ */}
      {activeView === 'policies' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" style={{ color: 'var(--ep-primary)' }} />
            <h2 className="text-xl font-extrabold text-[var(--ep-on-surface)] tracking-tight">Office Policies</h2>
          </div>

          {policies.length === 0 ? (
            <div className="ep-card-white p-12 text-center">
              <ShieldCheck className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--ep-outline)' }} />
              <p className="text-[var(--ep-on-surface-variant)] font-medium">No policies available at the moment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {policies.map((policy: any) => {
                const mySig = policySigs.find((s: any) => s.policy_id === policy.id)
                const isSigned = !!mySig
                return (
                  <div key={policy.id} className="ep-card-white overflow-hidden"
                    style={{
                      borderLeft: `4px solid ${
                        isSigned ? 'var(--ep-tertiary)' :
                        policy.requires_signature ? '#B89630' : 'var(--ep-primary)'
                      }`,
                    }}>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <FileText className="w-5 h-5 shrink-0" style={{ color: 'var(--ep-primary)' }} />
                            <h3 className="font-bold text-[var(--ep-on-surface)] text-lg">{policy.title}</h3>
                          </div>
                          {policy.description && (
                            <p className="text-sm text-[var(--ep-on-surface-variant)] mb-3">{policy.description}</p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-[var(--ep-outline)]">
                            <span>{policy.file_name}</span>
                            <span>
                              Uploaded {new Date(policy.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>

                          {policy.requires_signature && (
                            <div className="mt-4">
                              {isSigned ? (
                                <div className="p-3 rounded-lg" style={{ background: 'rgba(0,82,55,0.04)', border: '1px solid rgba(0,82,55,0.12)' }}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle className="w-5 h-5 shrink-0" style={{ color: 'var(--ep-tertiary)' }} />
                                    <div>
                                      <p className="text-sm font-bold" style={{ color: 'var(--ep-tertiary)' }}>Signed & Accepted</p>
                                      <p className="text-xs text-[var(--ep-outline)]">
                                        Signed on {new Date(mySig.signed_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                    </div>
                                  </div>
                                  {mySig.signature_text?.startsWith('data:image') ? (
                                    <div className="bg-white rounded-md p-2 inline-block" style={{ border: '1px solid var(--ep-surface-container)' }}>
                                      <img src={mySig.signature_text} alt="Signature" className="h-12 w-auto" />
                                    </div>
                                  ) : (
                                    <p className="text-xs text-[var(--ep-outline)] italic">
                                      Signature: &ldquo;{mySig.signature_text}&rdquo;
                                    </p>
                                  )}
                                </div>
                              ) : signingPolicyId === policy.id ? (
                                <div className="p-4 rounded-lg space-y-3" style={{ background: 'rgba(100,0,189,0.03)', border: '1px solid rgba(100,0,189,0.1)' }}>
                                  <p className="text-sm text-[var(--ep-on-surface)] font-medium">
                                    By signing below, I acknowledge that I have read, understood, and agree to comply with this policy.
                                  </p>
                                  <div>
                                    <Label className="text-xs text-[var(--ep-on-surface-variant)] mb-2 block">Draw your signature</Label>
                                    <SignatureCanvas
                                      onSignatureChange={setSignatureData}
                                      height={160}
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={() => handleSignPolicy(policy.id)}
                                      disabled={isSigningPolicy || !signatureData}
                                      size="sm"
                                      className="gap-1 cursor-pointer"
                                      style={{ background: 'var(--ep-primary)', color: 'white' }}
                                    >
                                      {isSigningPolicy ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <CheckCircle className="w-3 h-3" />
                                      )}
                                      Sign & Accept
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => { setSigningPolicyId(null); setSignatureData(null) }}
                                      className="cursor-pointer"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSigningPolicyId(policy.id)}
                                  className="gap-2 cursor-pointer"
                                  style={{ borderColor: 'rgba(184,150,48,0.3)', color: '#B89630' }}
                                >
                                  <ShieldCheck className="w-4 h-4" />
                                  Sign & Accept Policy
                                </Button>
                              )}
                            </div>
                          )}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(policy.file_url, '_blank')}
                          className="shrink-0 gap-2 cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          View PDF
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Salary Slip Details</DialogTitle>
            <DialogDescription>View your salary slip information</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {selectedSlip && <SalarySlipPreview employee={selectedSlip} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
