"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, FileText, Settings, Calendar, CalendarDays, Inbox, BarChart3, Shield } from "lucide-react"
import { EmployeeManagement } from "./employee-management"
import { SalarySlipGenerator } from "./salary-slip-generator"
import { CompanySettings } from "./company-settings"
import { EmployeeDashboard } from "./employee-dashboard"
import { AttendanceManager } from "./attendance-manager"
import { HolidayManager } from "./holiday-manager"
import { LeaveRequestManager } from "./leave-request-manager"
import { AnalyticsDashboard } from "./analytics-dashboard"
import { AuditLogViewer } from "./audit-log-viewer"

export function DashboardContent({ user }: { user: any }) {
  const [stats, setStats] = useState({ totalEmployees: 0, totalSalarySlips: 0, pendingLeaves: 0 })
  const supabase = createClient()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [empRes, slipRes, leaveRes] = await Promise.all([
          supabase.from("employees").select("*", { count: "exact", head: true }),
          supabase.from("salary_slips").select("*", { count: "exact", head: true }),
          supabase.from("leave_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        ])

        setStats({
          totalEmployees: empRes.count || 0,
          totalSalarySlips: slipRes.count || 0,
          pendingLeaves: leaveRes.count || 0,
        })
      } catch (error) {
        setStats({ totalEmployees: 0, totalSalarySlips: 0, pendingLeaves: 0 })
      }
    }

    fetchStats()
  }, [])

  const isAdmin = user?.is_admin === true

  return (
    <div className="space-y-6">
      {/* Main Tabs */}
      {isAdmin ? (
        <>
          {/* Statistics Cards - Admin Only */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-purple-500/10">
                    <Users className="w-4 h-4 text-purple-400" />
                  </div>
                  Total Employees
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">{stats.totalEmployees}</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-blue-500/10">
                    <FileText className="w-4 h-4 text-blue-400" />
                  </div>
                  Salary Slips Generated
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">{stats.totalSalarySlips}</p>
              </CardContent>
            </Card>

            <Card className={`border-l-4 ${stats.pendingLeaves > 0 ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <div className={`p-1.5 rounded-md ${stats.pendingLeaves > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`}>
                    <Inbox className={`w-4 h-4 ${stats.pendingLeaves > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
                  </div>
                  Pending Leave Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${stats.pendingLeaves > 0 ? 'text-amber-400' : 'text-foreground'}`}>
                  {stats.pendingLeaves}
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="employees" className="space-y-4">
            <TabsList>
              <TabsTrigger value="employees">
                <Users className="w-4 h-4 mr-2" />
                Employees
              </TabsTrigger>
              <TabsTrigger value="attendance">
                <Calendar className="w-4 h-4 mr-2" />
                Attendance
              </TabsTrigger>
              <TabsTrigger value="slips">
                <FileText className="w-4 h-4 mr-2" />
                Salary Slips
              </TabsTrigger>
              <TabsTrigger value="leave-requests" className="relative" data-tab-value="leave-requests">
                <Inbox className="w-4 h-4 mr-2" />
                Leave Requests
                {stats.pendingLeaves > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-amber-500 text-white rounded-full">
                    {stats.pendingLeaves}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="holidays">
                <CalendarDays className="w-4 h-4 mr-2" />
                Holidays
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="audit-log">
                <Shield className="w-4 h-4 mr-2" />
                Audit Log
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="employees">
              <EmployeeManagement />
            </TabsContent>

            <TabsContent value="attendance">
              <AttendanceManager />
            </TabsContent>

            <TabsContent value="slips">
              <SalarySlipGenerator isAdmin={true} />
            </TabsContent>

            <TabsContent value="leave-requests">
              <LeaveRequestManager />
            </TabsContent>

            <TabsContent value="holidays">
              <HolidayManager />
            </TabsContent>

            <TabsContent value="analytics">
              <AnalyticsDashboard />
            </TabsContent>

            <TabsContent value="audit-log">
              <AuditLogViewer />
            </TabsContent>

            <TabsContent value="settings">
              <CompanySettings />
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <EmployeeDashboard userId={user.id} />
      )}
    </div>
  )
}
