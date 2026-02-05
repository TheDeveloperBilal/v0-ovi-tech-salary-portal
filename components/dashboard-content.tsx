"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, FileText, Settings } from "lucide-react"
import { EmployeeManagement } from "./employee-management"
import { SalarySlipGenerator } from "./salary-slip-generator"
import { CompanySettings } from "./company-settings"

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
        <Card className="border border-gray-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-800" />
              Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{stats.totalEmployees}</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-800" />
              Salary Slips Generated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{stats.totalSalarySlips}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      {isAdmin ? (
        <Tabs defaultValue="employees" className="space-y-4">
          <TabsList className="bg-white border border-gray-200">
            <TabsTrigger value="employees" className="text-gray-800 data-[state=active]:border-b-2 data-[state=active]:border-gray-800">
              <Users className="w-4 h-4 mr-2" />
              Employees
            </TabsTrigger>
            <TabsTrigger value="slips" className="text-gray-800 data-[state=active]:border-b-2 data-[state=active]:border-gray-800">
              <FileText className="w-4 h-4 mr-2" />
              Salary Slips
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-gray-800 data-[state=active]:border-b-2 data-[state=active]:border-gray-800">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="employees">
            <EmployeeManagement />
          </TabsContent>

          <TabsContent value="slips">
            <SalarySlipGenerator isAdmin={true} />
          </TabsContent>

          <TabsContent value="settings">
            <CompanySettings />
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="border border-gray-200 bg-white">
          <CardHeader>
            <CardTitle className="text-gray-900">My Salary Slips</CardTitle>
            <CardDescription className="text-gray-600">View and download your salary slips</CardDescription>
          </CardHeader>
          <CardContent>
            <SalarySlipGenerator isAdmin={false} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
