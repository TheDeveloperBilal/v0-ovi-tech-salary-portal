'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Eye } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SalarySlipPreview } from './salary-slip-preview'
import { useToast } from '@/hooks/use-toast'

export function EmployeeDashboard({ userId }: { userId: string }) {
  const [salarySlips, setSalarySlips] = useState<any[]>([])
  const [employeeData, setEmployeeData] = useState<any>(null)
  const [selectedSlip, setSelectedSlip] = useState<any>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchEmployeeData()
  }, [userId])

  const fetchEmployeeData = async () => {
    try {
      setIsLoading(true)
      
      // Get employee record linked to this user
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('email', (await supabase.auth.getUser()).data.user?.email)
        .single()

      if (empError) throw empError

      setEmployeeData(employee)

      // Fetch salary slips for this employee
      const { data: slips, error: slipsError } = await supabase
        .from('salary_slips')
        .select('*')
        .eq('employee_id', employee.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false })

      if (slipsError) throw slipsError

      setSalarySlips(slips || [])
    } catch (error: any) {
      console.log('[v0] Error fetching employee data:', error.message)
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewSlip = (slip: any) => {
    setSelectedSlip({
      basic_salary: slip.basic_salary,
      allowances: slip.allowances || {},
      deductions: slip.deductions || {},
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
    })
    setIsPreviewOpen(true)
  }

  const getMonthName = (month: number) => {
    const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December']
    return months[month] || 'Unknown'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600">Loading your salary slips...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Employee Profile Header */}
      <Card>
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="font-semibold">{employeeData?.first_name} {employeeData?.last_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Employee ID</p>
              <p className="font-semibold">{employeeData?.employee_id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Department</p>
              <p className="font-semibold">{employeeData?.department || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Designation</p>
              <p className="font-semibold">{employeeData?.designation || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Salary Slips List */}
      <div>
        <h2 className="text-2xl font-bold mb-4">My Salary Slips</h2>
        {salarySlips.length === 0 ? (
          <Card>
            <CardContent className="pt-8 pb-8">
              <p className="text-center text-gray-500">No salary slips yet. Please contact HR.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {salarySlips.map((slip) => {
              const earnings = slip.basic_salary + Object.values(slip.allowances || {}).reduce((sum: number, val: any) => sum + (Number.parseFloat(val) || 0), 0)
              const deductions = Object.values(slip.deductions || {}).reduce((sum: number, val: any) => sum + (Number.parseFloat(val) || 0), 0)
              
              return (
                <Card key={slip.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">
                      {getMonthName(slip.month)} {slip.year}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Earnings</span>
                        <span className="font-semibold text-green-600">PKR {earnings.toLocaleString('en-PK', { maximumFractionDigits: 0 })}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Deductions</span>
                        <span className="font-semibold text-red-600">PKR {deductions.toLocaleString('en-PK', { maximumFractionDigits: 0 })}</span>
                      </div>
                      <div className="flex justify-between text-sm border-t pt-2">
                        <span className="text-gray-600 font-semibold">Net Salary</span>
                        <span className="font-bold text-purple-600">PKR {(slip.net_salary || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button 
                        onClick={() => handleViewSlip(slip)} 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 bg-transparent"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Salary Slip Preview</DialogTitle>
          </DialogHeader>
          {selectedSlip && <SalarySlipPreview employee={selectedSlip} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
