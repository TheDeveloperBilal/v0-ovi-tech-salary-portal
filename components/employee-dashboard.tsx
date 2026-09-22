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
  Home, Briefcase, Play, Square, Megaphone, ShieldCheck, Download,
} from 'lucide-react'
import { SalarySlipPreview } from './salary-slip-preview'
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
  const [signatureText, setSignatureText] = useState('')
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
    if (employeeData?.id && activeView === 'attendance') {
      fetchAttendance()
    }
  }, [employeeData?.id, attMonth, attYear, activeView])

  useEffect(() => {
    if (employeeData?.id && activeView === 'leaves') {
      fetchLeaveRequests()
    }
  }, [employeeData?.id, activeView])

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
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
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
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setIsLoadingAtt(false)
    }
  }

  const fetchLeaveRequests = async () => {
    if (!employeeData?.id) return
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', employeeData.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setLeaveRequests(data || [])
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeData?.id) return

    if (leaveForm.end_date < leaveForm.start_date) {
      toast({ title: 'Error', description: 'End date cannot be before start date', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase.from('leave_requests').insert({
        employee_id: employeeData.id,
        leave_type: leaveForm.leave_type,
        start_date: leaveForm.start_date,
        end_date: leaveForm.end_date,
        reason: leaveForm.reason || null,
        status: 'pending',
      })
      if (error) throw error

      toast({ title: 'Leave request submitted', description: 'Your request has been sent to admin for approval.' })
      setLeaveForm({ leave_type: 'casual_leave', start_date: '', end_date: '', reason: '' })
      setIsLeaveFormOpen(false)
      fetchLeaveRequests()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelRequest = async (id: string) => {
    if (!confirm('Cancel this leave request?')) return
    try {
      const { error } = await supabase.from('leave_requests').delete().eq('id', id)
      if (error) throw error
      setLeaveRequests(leaveRequests.filter(r => r.id !== id))
      toast({ title: 'Cancelled', description: 'Leave request cancelled.' })
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
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
    if (!signatureText.trim()) {
      toast({ title: 'Error', description: 'Please type your full name as signature', variant: 'destructive' })
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
        body: JSON.stringify({ policy_id: policyId, signature_text: signatureText.trim() }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast({ title: 'Policy Signed', description: data.message })
      setSigningPolicyId(null)
      setSignatureText('')
      fetchPolicies()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
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
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
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
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${s.bg} ${s.text}`}>
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
    approved_leave: { label: 'Approved Leave', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    approved_late: { label: 'Approved Late', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    approved_early_out: { label: 'Approved Early Out', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    half_day: { label: 'Half Day', color: 'bg-violet-100 text-violet-700 border-violet-200' },
    work_from_home: { label: 'WFH', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  }

  const getDateBadges = (date: string, employeeId: string) => {
    const badges: React.ReactElement[] = []
    const holidayName = holidays.get(date)
    if (holidayName) {
      badges.push(
        <span key="holiday" className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 border border-red-200">
          {holidayName}
        </span>
      )
    }
    const excKey = `${employeeId}|${date}`
    const excs = exceptions.get(excKey)
    if (excs) {
      for (const exc of excs) {
        const style = EXCEPTION_LABELS[exc.type] || { label: exc.type.replace(/_/g, ' '), color: 'bg-gray-100 text-gray-700 border-gray-200' }
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
    if (record.is_absent) return 'text-red-400'
    if (record.is_late && record.is_early_out) return 'text-orange-400'
    if (record.is_late) return 'text-amber-400'
    if (record.is_early_out) return 'text-orange-400'
    return 'text-emerald-400'
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
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  const elapsed = formatElapsed(elapsedTime)

  return (
    <div className="space-y-6">
      {/* Employee Header Card */}
      <div className="glass-card rounded-2xl p-6 border border-border/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-purple-500/20">
            {(employeeData?.first_name?.[0] || '').toUpperCase()}{(employeeData?.last_name?.[0] || '').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground">
              {employeeData?.first_name} {employeeData?.last_name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {employeeData?.designation || 'Employee'} &middot; {employeeData?.department || 'N/A'} &middot; ID: {employeeData?.employee_id}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {employeeData?.is_probation ? (
              <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs text-amber-500 font-semibold">Probation</p>
                {employeeData?.probation_end_date && (
                  <p className="text-[10px] text-muted-foreground">
                    Ends: {new Date(employeeData.probation_end_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            ) : (
              <div className="px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
                <p className="text-2xl font-bold text-purple-500">{remainingLeaves}</p>
                <p className="text-[10px] text-muted-foreground">Leaves Left</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* WFH Timer Clock */}
      {wfhStatus?.is_wfh_today && (
        <div className="glass-card rounded-2xl border border-cyan-500/30 overflow-hidden">
          <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1 flex flex-col items-center md:items-start gap-3">
                <div className="flex items-center gap-2">
                  <Home className="w-5 h-5 text-cyan-400" />
                  <span className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">Work From Home</span>
                </div>

                {!wfhStatus.record ? (
                  <div className="text-center md:text-left">
                    <div className="flex items-baseline gap-1 font-mono">
                      <span className="text-5xl font-bold text-muted-foreground/30">00</span>
                      <span className="text-3xl font-bold text-muted-foreground/30">:</span>
                      <span className="text-5xl font-bold text-muted-foreground/30">00</span>
                      <span className="text-3xl font-bold text-muted-foreground/30">:</span>
                      <span className="text-5xl font-bold text-muted-foreground/30">00</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">Ready to start your work day</p>
                  </div>
                ) : !wfhStatus.record.check_out ? (
                  <div className="text-center md:text-left">
                    <div className="flex items-baseline gap-1 font-mono">
                      <span className="text-5xl font-bold text-foreground">{elapsed.hours}</span>
                      <span className="text-3xl font-bold text-purple-400 animate-pulse">:</span>
                      <span className="text-5xl font-bold text-foreground">{elapsed.minutes}</span>
                      <span className="text-3xl font-bold text-purple-400 animate-pulse">:</span>
                      <span className="text-5xl font-bold text-foreground">{elapsed.seconds}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>Checked in at <span className="text-foreground font-medium">{formatTime12h(wfhStatus.record.check_in)}</span></span>
                      {wfhStatus.record.is_late && <span className="text-amber-400 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10">Late</span>}
                    </div>
                  </div>
                ) : (
                  <div className="text-center md:text-left">
                    <div className="flex items-baseline gap-1 font-mono">
                      <span className="text-5xl font-bold text-emerald-500">{String(Math.floor(wfhStatus.record.work_hours)).padStart(2, '0')}</span>
                      <span className="text-3xl font-bold text-emerald-400">:</span>
                      <span className="text-5xl font-bold text-emerald-500">{String(Math.round((wfhStatus.record.work_hours % 1) * 60)).padStart(2, '0')}</span>
                      <span className="text-3xl font-bold text-emerald-400">:</span>
                      <span className="text-5xl font-bold text-emerald-500">00</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>{formatTime12h(wfhStatus.record.check_in)} — {formatTime12h(wfhStatus.record.check_out)}</span>
                      {wfhStatus.record.is_early_out && <span className="text-orange-400 text-xs font-medium px-2 py-0.5 rounded-full bg-orange-500/10">Early Out</span>}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center gap-2">
                {!wfhStatus.record ? (
                  <button
                    onClick={handleWfhClock}
                    disabled={isClocking}
                    className="w-20 h-20 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isClocking ? <Loader2 className="w-8 h-8 animate-spin" /> : <Play className="w-8 h-8 ml-1" />}
                  </button>
                ) : !wfhStatus.record.check_out ? (
                  <button
                    onClick={handleWfhClock}
                    disabled={isClocking}
                    className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-500/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isClocking ? <Loader2 className="w-8 h-8 animate-spin" /> : <Square className="w-7 h-7" />}
                  </button>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                  </div>
                )}
                <span className="text-xs text-muted-foreground font-medium">
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
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <div className="glass-card rounded-2xl p-4 border border-border/50 border-l-4 border-l-purple-500">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Salary Slips</p>
              <p className="text-3xl font-bold mt-1 text-foreground">{salarySlips.length}</p>
            </div>
            <div className="glass-card rounded-2xl p-4 border border-border/50 border-l-4 border-l-emerald-500">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Leaves Left</p>
              <p className="text-3xl font-bold mt-1 text-foreground">{employeeData?.is_probation ? 'N/A' : remainingLeaves}</p>
            </div>
            <div className="glass-card rounded-2xl p-4 border border-border/50 border-l-4 border-l-amber-500">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending</p>
              <p className={`text-3xl font-bold mt-1 ${pendingRequests > 0 ? 'text-amber-500' : 'text-foreground'}`}>{pendingRequests}</p>
            </div>
            <div className="glass-card rounded-2xl p-4 border border-border/50 border-l-4 border-l-blue-500">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Leaves Used</p>
              <p className="text-3xl font-bold mt-1 text-foreground">{employeeData?.leaves_taken || 0}</p>
            </div>
          </div>

          {/* Active Notices */}
          {notices.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-purple-400" />
                Company Notices
              </h3>
              {notices.map((notice: any) => (
                <Card key={notice.id} className={`glass-card border-l-4 ${
                  notice.priority === 'urgent' ? 'border-l-red-500' :
                  notice.priority === 'important' ? 'border-l-amber-500' : 'border-l-blue-500'
                }`}>
                  <CardContent className="py-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        notice.priority === 'urgent' ? 'bg-red-500/10' :
                        notice.priority === 'important' ? 'bg-amber-500/10' : 'bg-blue-500/10'
                      }`}>
                        <Megaphone className={`w-4 h-4 ${
                          notice.priority === 'urgent' ? 'text-red-400' :
                          notice.priority === 'important' ? 'text-amber-400' : 'text-blue-400'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-sm text-foreground">{notice.title}</h4>
                          {notice.priority !== 'normal' && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              notice.priority === 'urgent'
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {notice.priority}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{notice.content}</p>
                        <p className="text-xs text-muted-foreground/50 mt-2">
                          {new Date(notice.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  Latest Salary Slip
                </CardTitle>
              </CardHeader>
              <CardContent>
                {salarySlips.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">Period</span>
                      <span className="font-semibold text-foreground">{getMonthName(salarySlips[0].month)} {salarySlips[0].year}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">Base Salary</span>
                      <span className="font-semibold text-foreground">PKR {(salarySlips[0].basic_salary || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">Deductions</span>
                      <span className="font-semibold text-red-400">PKR {(salarySlips[0].total_deductions || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground font-semibold">Net Salary</span>
                      <span className="font-bold text-lg text-foreground">PKR {(salarySlips[0].net_salary || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}</span>
                    </div>
                    <Button onClick={() => handleViewSlip(salarySlips[0])} variant="outline" size="sm" className="w-full mt-2">
                      <Eye className="w-4 h-4 mr-2" /> View Full Slip
                    </Button>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">No salary slips yet</p>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-400" />
                  Employment Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Email</span>
                    <span className="text-sm font-medium text-foreground truncate ml-4">{employeeData?.email}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Department</span>
                    <span className="font-semibold text-foreground">{employeeData?.department || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Designation</span>
                    <span className="font-semibold text-foreground">{employeeData?.designation || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Join Date</span>
                    <span className="font-semibold text-foreground">{employeeData?.date_of_joining ? new Date(employeeData.date_of_joining).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      employeeData?.is_probation
                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    }`}>
                      {employeeData?.is_probation ? 'Probation' : 'Confirmed'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ═══════ SALARY SLIPS TAB ═══════ */}
      {activeView === 'slips' && (
        <div>
          <h2 className="text-xl font-bold mb-4 text-foreground">My Salary Slips</h2>
          {salarySlips.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 border border-dashed border-border/50 text-center">
              <p className="text-muted-foreground">No salary slips yet. Please contact HR.</p>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {salarySlips.map((slip) => (
                <Card key={slip.id} className="glass-card hover:border-purple-500/30 transition-all duration-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg">
                      {getMonthName(slip.month)} {slip.year}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">Base Salary</span>
                        <span className="font-semibold text-foreground">
                          PKR {(slip.basic_salary || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">Deductions</span>
                        <span className="font-semibold text-red-400">
                          PKR {(slip.total_deductions || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm border-t border-border pt-2">
                        <span className="text-muted-foreground font-semibold">Net Salary</span>
                        <span className="font-bold text-foreground">
                          PKR {(slip.net_salary || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                    <Button onClick={() => handleViewSlip(slip)} variant="outline" size="sm" className="w-full">
                      <Eye className="w-4 h-4 mr-2" /> View Slip
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════ ATTENDANCE TAB ═══════ */}
      {activeView === 'attendance' && (
        <div className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                My Attendance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 mb-4">
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="glass-card rounded-xl p-3 border border-emerald-500/20 text-center">
                    <p className="text-2xl font-bold text-emerald-400">{attPresent}</p>
                    <p className="text-xs text-muted-foreground">Present</p>
                  </div>
                  <div className="glass-card rounded-xl p-3 border border-red-500/20 text-center">
                    <p className="text-2xl font-bold text-red-400">{attAbsent}</p>
                    <p className="text-xs text-muted-foreground">Absent</p>
                  </div>
                  <div className="glass-card rounded-xl p-3 border border-amber-500/20 text-center">
                    <p className="text-2xl font-bold text-amber-400">{attLate}</p>
                    <p className="text-xs text-muted-foreground">Late</p>
                  </div>
                  <div className="glass-card rounded-xl p-3 border border-orange-500/20 text-center">
                    <p className="text-2xl font-bold text-orange-400">{attEarlyOut}</p>
                    <p className="text-xs text-muted-foreground">Early Out</p>
                  </div>
                </div>
              )}

              {isLoadingAtt ? (
                <p className="text-center text-muted-foreground py-8">
                  <Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading...
                </p>
              ) : attendanceRecords.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No attendance records for {getMonthName(attMonth)} {attYear}.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border/50">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left p-3 text-muted-foreground font-medium">Date</th>
                        <th className="text-left p-3 text-muted-foreground font-medium">Check In</th>
                        <th className="text-left p-3 text-muted-foreground font-medium">Check Out</th>
                        <th className="text-right p-3 text-muted-foreground font-medium">Hours</th>
                        <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceRecords.map(r => (
                        <tr key={r.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                          <td className="p-3 text-foreground">
                            <div>{formatDate(r.attendance_date)}</div>
                            {getDateBadges(r.attendance_date, r.employee_id || employeeData?.id)}
                          </td>
                          <td className={`p-3 ${r.is_late ? 'text-amber-500 font-medium' : 'text-foreground'}`}>{formatTime12h(r.check_in)}</td>
                          <td className={`p-3 ${r.is_early_out ? 'text-orange-500 font-medium' : 'text-foreground'}`}>{formatTime12h(r.check_out)}</td>
                          <td className="p-3 text-right text-foreground">{r.work_hours ? `${r.work_hours}h` : '—'}</td>
                          <td className={`p-3 font-medium ${getAttStatusColor(r)}`}>
                            {r.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════ LEAVE REQUESTS TAB ═══════ */}
      {activeView === 'leaves' && (
        <div className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-purple-400" />
                    Leave Requests
                  </CardTitle>
                  <CardDescription>
                    Apply for leave and track your request status
                  </CardDescription>
                </div>
                <Button onClick={() => setIsLeaveFormOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Apply for Leave
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {leaveRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No leave requests yet. Click &quot;Apply for Leave&quot; to submit one.
                </p>
              ) : (
                <div className="space-y-3">
                  {leaveRequests.map(req => {
                    const lt = LEAVE_TYPES.find(t => t.value === req.leave_type)
                    const startDate = formatDateFull(req.start_date)
                    const endDate = formatDateFull(req.end_date)
                    const isSingleDay = req.start_date === req.end_date

                    return (
                      <div key={req.id} className="p-4 rounded-xl border border-border/50 hover:border-border/80 glass-card transition-all">
                        <div className="flex flex-col sm:flex-row justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-foreground">{lt?.label || req.leave_type}</span>
                              {getStatusBadge(req.status)}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {isSingleDay ? startDate : `${startDate} → ${endDate}`}
                            </p>
                            {req.reason && (
                              <p className="text-sm text-muted-foreground mt-1">Reason: {req.reason}</p>
                            )}
                            {req.admin_remarks && (
                              <p className="text-sm mt-1">
                                <span className="text-muted-foreground">Admin: </span>
                                <span className="text-foreground">{req.admin_remarks}</span>
                              </p>
                            )}
                          </div>
                          {req.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelRequest(req.id)}
                              className="text-red-400 hover:text-red-300 self-start"
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
            </CardContent>
          </Card>

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
                  <p className="text-xs text-muted-foreground">
                    Remaining leave quota: {remainingLeaves} / 14
                  </p>
                )}
                {employeeData?.is_probation && (
                  <p className="text-xs text-amber-400">
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    Probation employees have no paid leave. Absences will be deducted from salary.
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={isSubmitting}>
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
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
              Office Policies
            </h2>
          </div>

          {policies.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <ShieldCheck className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No policies available at the moment.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {policies.map((policy: any) => {
                const mySig = policySigs.find((s: any) => s.policy_id === policy.id)
                const isSigned = !!mySig
                return (
                  <Card key={policy.id} className={`glass-card border-l-4 ${
                    isSigned ? 'border-l-emerald-500' :
                    policy.requires_signature ? 'border-l-amber-500' : 'border-l-purple-500'
                  }`}>
                    <CardContent className="py-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <FileText className="w-5 h-5 text-purple-400 shrink-0" />
                            <h3 className="font-semibold text-foreground text-lg">{policy.title}</h3>
                          </div>
                          {policy.description && (
                            <p className="text-sm text-muted-foreground mb-3">{policy.description}</p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground/60">
                            <span>{policy.file_name}</span>
                            <span>
                              Uploaded {new Date(policy.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>

                          {/* Signature status */}
                          {policy.requires_signature && (
                            <div className="mt-4">
                              {isSigned ? (
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                                  <div>
                                    <p className="text-sm font-medium text-emerald-400">Signed & Accepted</p>
                                    <p className="text-xs text-muted-foreground">
                                      Signed on {new Date(mySig.signed_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                      {' · Signature: "'}{mySig.signature_text}{'"'}
                                    </p>
                                  </div>
                                </div>
                              ) : signingPolicyId === policy.id ? (
                                <div className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/15 space-y-3">
                                  <p className="text-sm text-foreground font-medium">
                                    By signing below, I acknowledge that I have read, understood, and agree to comply with this policy.
                                  </p>
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Type your full name as electronic signature</Label>
                                    <Input
                                      placeholder={employeeData ? `${employeeData.first_name} ${employeeData.last_name}` : 'Your full name'}
                                      value={signatureText}
                                      onChange={e => setSignatureText(e.target.value)}
                                      className="mt-1"
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={() => handleSignPolicy(policy.id)}
                                      disabled={isSigningPolicy || !signatureText.trim()}
                                      size="sm"
                                      className="gap-1"
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
                                      onClick={() => { setSigningPolicyId(null); setSignatureText('') }}
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
                                  className="gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
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
                          className="shrink-0 gap-2"
                        >
                          <Download className="w-4 h-4" />
                          View PDF
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
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
