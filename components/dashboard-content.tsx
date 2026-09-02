"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, FileText, Settings, Calendar, CalendarDays } from "lucide-react"
import { EmployeeManagement } from "./employee-management"
import { SalarySlipGenerator } from "./salary-slip-generator"
import { CompanySettings } from "./company-settings"
import { EmployeeDashboard } from "./employee-dashboard"
import { AttendanceManager } from "./attendance-manager"
import { HolidayManager } from "./holiday-manager"

export function DashboardContent({ user }: { user: any }) {
  const [stats, setStats] = useState({ totalEmployees: 0, totalSalarySlips: 0 })
  const supabase = createClient()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { count: employeeCount } = await supabase.from("employees").select("*", { count: "exact", head: true })
        const { count: slipCount } = await supabase.from("salary_slips").select("*", { count: "exact", head: true })

        setStats({
          totalEmployees: employeeCount || 0,
          totalSalarySlips: slipCount || 0,
        })
      } catch (error) {
        setStats({
          totalEmployees: 0,
          totalSalarySlips: 0,
        })
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
          <div className="grid gap-4 md:grid-cols-2">
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
              <TabsTrigger value="holidays">
                <CalendarDays className="w-4 h-4 mr-2" />
                Holidays
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

            <TabsContent value="holidays">
              <HolidayManager />
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
