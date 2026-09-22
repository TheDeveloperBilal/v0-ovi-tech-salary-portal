"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileText, Inbox, Calendar, TrendingUp, Clock, UserCheck } from "lucide-react"
import { EmployeeManagement } from "./employee-management"
import { SalarySlipGenerator } from "./salary-slip-generator"
import { CompanySettings } from "./company-settings"
import { EmployeeDashboard } from "./employee-dashboard"
import { AttendanceManager } from "./attendance-manager"
import { HolidayManager } from "./holiday-manager"
import { LeaveRequestManager } from "./leave-request-manager"
import { AnalyticsDashboard } from "./analytics-dashboard"
import { AuditLogViewer } from "./audit-log-viewer"
import { NoticeManager } from "./notice-manager"
import { PolicyManager } from "./policy-manager"

interface DashboardContentProps {
  user: any
  activeView: string
}

export function DashboardContent({ user, activeView }: DashboardContentProps) {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalSalarySlips: 0,
    pendingLeaves: 0,
    totalAttendance: 0,
  })
  const supabase = createClient()
  const isAdmin = user?.is_admin === true

  useEffect(() => {
    if (!isAdmin) return
    const fetchStats = async () => {
      try {
        const now = new Date()
        const month = now.getMonth() + 1
        const year = now.getFullYear()

        const [empRes, slipRes, leaveRes, attRes] = await Promise.all([
          supabase.from("employees").select("*", { count: "exact", head: true }),
          supabase.from("salary_slips").select("*", { count: "exact", head: true }),
          supabase.from("leave_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("attendance_records").select("*", { count: "exact", head: true }).eq("month", month).eq("year", year),
        ])

        setStats({
          totalEmployees: empRes.count || 0,
          totalSalarySlips: slipRes.count || 0,
          pendingLeaves: leaveRes.count || 0,
          totalAttendance: attRes.count || 0,
        })
      } catch {
        // silently handle
      }
    }
    fetchStats()
  }, [isAdmin])

  if (!isAdmin || activeView.startsWith('emp-')) {
    const empView = activeView.startsWith('emp-') ? activeView.slice(4) : activeView
    return <EmployeeDashboard userId={user.id} activeView={empView} />
  }

  if (activeView === 'overview') {
    return <OverviewDashboard stats={stats} />
  }

  const views: Record<string, React.ReactNode> = {
    'employees': <EmployeeManagement />,
    'attendance': <AttendanceManager />,
    'slips': <SalarySlipGenerator isAdmin={true} />,
    'leave-requests': <LeaveRequestManager />,
    'holidays': <HolidayManager />,
    'notices': <NoticeManager />,
    'policies': <PolicyManager />,
    'analytics': <AnalyticsDashboard />,
    'audit-log': <AuditLogViewer />,
    'settings': <CompanySettings />,
  }

  return views[activeView] || <OverviewDashboard stats={stats} />
}

function OverviewDashboard({ stats }: { stats: { totalEmployees: number; totalSalarySlips: number; pendingLeaves: number; totalAttendance: number } }) {
  const now = new Date()
  const monthName = now.toLocaleDateString('en-PK', { month: 'long' })

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Total Employees"
          value={stats.totalEmployees}
          iconBg="bg-purple-500/10"
          iconColor="text-purple-500"
          borderColor="border-l-purple-500"
        />
        <StatCard
          icon={<Calendar className="w-5 h-5" />}
          label={`${monthName} Records`}
          value={stats.totalAttendance}
          iconBg="bg-blue-500/10"
          iconColor="text-blue-500"
          borderColor="border-l-blue-500"
        />
        <StatCard
          icon={<Inbox className="w-5 h-5" />}
          label="Pending Requests"
          value={stats.pendingLeaves}
          iconBg={stats.pendingLeaves > 0 ? "bg-amber-500/10" : "bg-emerald-500/10"}
          iconColor={stats.pendingLeaves > 0 ? "text-amber-500" : "text-emerald-500"}
          borderColor={stats.pendingLeaves > 0 ? "border-l-amber-500" : "border-l-emerald-500"}
          highlight={stats.pendingLeaves > 0}
        />
        <StatCard
          icon={<FileText className="w-5 h-5" />}
          label="Salary Slips"
          value={stats.totalSalarySlips}
          iconBg="bg-cyan-500/10"
          iconColor="text-cyan-500"
          borderColor="border-l-cyan-500"
        />
      </div>

      {/* Quick summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              Quick Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Active Employees</span>
                <span className="font-semibold text-foreground">{stats.totalEmployees}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Attendance Records ({monthName})</span>
                <span className="font-semibold text-foreground">{stats.totalAttendance}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Pending Leave Requests</span>
                <span className={`font-semibold ${stats.pendingLeaves > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>{stats.pendingLeaves}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Salary Slips Generated</span>
                <span className="font-semibold text-foreground">{stats.totalSalarySlips}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Portal Status</span>
                <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Online</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Office Hours</span>
                <span className="text-sm font-medium text-foreground">11:00 AM - 8:00 PM</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Grace Period</span>
                <span className="text-sm font-medium text-foreground">15 minutes</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Annual Leave Quota</span>
                <span className="text-sm font-medium text-foreground">14 days</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, iconBg, iconColor, borderColor, highlight }: {
  icon: React.ReactNode
  label: string
  value: number
  iconBg: string
  iconColor: string
  borderColor: string
  highlight?: boolean
}) {
  return (
    <Card className={`border-l-4 ${borderColor} glass-card`}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${highlight ? 'text-amber-500' : 'text-foreground'}`}>{value}</p>
          </div>
          <div className={`p-3 rounded-xl ${iconBg}`}>
            <div className={iconColor}>{icon}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
