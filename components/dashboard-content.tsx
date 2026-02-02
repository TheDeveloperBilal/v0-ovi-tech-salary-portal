"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, FileText, Settings } from "lucide-react"
import { EmployeeManagement } from "./employee-management"
import { SalarySlipGenerator } from "./salary-slip-generator"
import { CompanySettings } from "./company-settings"
import { AdminUsers } from "./admin-users"

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
        console.log("[v0] Tables not yet created, showing default stats")
        setStats({
          totalEmployees: 0,
          totalSalarySlips: 0,
        })
      }
    }

    fetchStats()
  }, [supabase])

  const isAdmin = user?.is_admin === true

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-l-4 border-l-blue-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{stats.totalEmployees}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-green-600" />
              Salary Slips Generated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{stats.totalSalarySlips}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      {isAdmin ? (
        <Tabs defaultValue="employees" className="space-y-4">
          <TabsList className="bg-gray-100">
            <TabsTrigger value="employees" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" />
              Manage Employees
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" />
              Manage Users
            </TabsTrigger>
            <TabsTrigger value="slips" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <FileText className="w-4 h-4 mr-2" />
              Salary Slips
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="employees">
            <EmployeeManagement />
          </TabsContent>

          <TabsContent value="users">
            <AdminUsers />
          </TabsContent>

          <TabsContent value="slips">
            <SalarySlipGenerator isAdmin={true} />
          </TabsContent>

          <TabsContent value="settings">
            <CompanySettings />
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>My Salary Slips</CardTitle>
            <CardDescription>View and download your salary slips</CardDescription>
          </CardHeader>
          <CardContent>
            <SalarySlipGenerator isAdmin={false} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
