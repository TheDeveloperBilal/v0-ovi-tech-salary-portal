'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Eye } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
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

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()

      if (!user?.email) {
        throw new Error("User not authenticated")
      }

      // Get employee record linked to this user's email
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('email', user.email)
        .single()

      if (empError) throw empError

      setEmployeeData(employee)

      // Fetch salary slips ONLY for this employee
      const { data: slips, error: slipsError } = await supabase
        .from('salary_slips')
        .select('*')
        .eq('employee_id', employee.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false })

      if (slipsError) throw slipsError

      setSalarySlips(slips || [])
    } catch (error: any) {
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
      leaves_deducted: slip.leaves_deducted || 0,
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
      leaves_taken: employeeData?.leaves_taken || 0,
      is_probation: employeeData?.is_probation || false,
      probation_end_date: employeeData?.probation_end_date || null,
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
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4"></div>
          <p className="text-muted-foreground">Loading your salary slips...</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Name</p>
              <p className="font-semibold text-sm sm:text-base text-foreground">{employeeData?.first_name} {employeeData?.last_name}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Employee ID</p>
              <p className="font-semibold text-sm sm:text-base text-foreground">{employeeData?.employee_id}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Department</p>
              <p className="font-semibold text-sm sm:text-base text-foreground">{employeeData?.department || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Designation</p>
              <p className="font-semibold text-sm sm:text-base text-foreground">{employeeData?.designation || 'N/A'}</p>
            </div>
            <div className="bg-purple-500/10 p-3 rounded-lg border border-purple-500/20">
              {employeeData?.is_probation ? (
                <>
                  <p className="text-xs sm:text-sm text-amber-400 font-semibold">Probation Period</p>
                  <p className="text-sm text-amber-300 mt-1">
                    You are on probation. Leave benefits will be available after probation ends.
                  </p>
                  {employeeData?.probation_end_date && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Probation ends: {new Date(employeeData.probation_end_date).toLocaleDateString()}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-xs sm:text-sm text-muted-foreground">Remaining Leaves</p>
                  <p className="font-bold text-lg sm:text-xl text-purple-400">{14 - (employeeData?.leaves_taken || 0)} / 14</p>
                  <p className="text-xs text-muted-foreground mt-1">Annual leaves used: {employeeData?.leaves_taken || 0}</p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Salary Slips List */}
      <div>
        <h2 className="text-2xl font-bold mb-4 text-foreground">My Salary Slips</h2>
        {salarySlips.length === 0 ? (
          <Card>
            <CardContent className="pt-8 pb-8">
              <p className="text-center text-muted-foreground">No salary slips yet. Please contact HR.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {salarySlips.map((slip) => {
              // Support both JSON object format and individual columns format
              let allowances = slip.allowances || {}
              let deductions = slip.deductions || {}

              // If allowances is empty but individual fields exist, reconstruct the object
              if (Object.keys(allowances).length === 0 && slip.hra !== undefined) {
                allowances = {
                  hra: slip.hra || 0,
                  dearness_allowance: slip.dearness_allowance || 0,
                  medical_allowance: slip.medical_allowance || 0,
                  transport_allowance: slip.transport_allowance || 0,
                  other_allowance: slip.other_allowance || 0,
                }
              }

              // If deductions is empty but individual fields exist, reconstruct the object
              if (Object.keys(deductions).length === 0 && slip.pf_deduction !== undefined) {
                deductions = {
                  pf_deduction: slip.pf_deduction || 0,
                  esi_deduction: slip.esi_deduction || 0,
                  professional_tax: slip.professional_tax || 0,
                  loan_deduction: slip.loan_deduction || 0,
                  other_deduction: slip.other_deduction || 0,
                }
              }

              const earnings = (slip.base_salary || slip.basic_salary || 0) + Object.values(allowances).reduce((sum: number, val: any) => sum + (Number.parseFloat(val) || 0), 0)

              // Calculate leave deduction only if all 14 annual leaves have been used
              const baseSalary = slip.base_salary || slip.basic_salary || 0
              const totalLeavesUsed = (employeeData?.leaves_taken || 0) + (slip.leaves_deducted || 0)
              const leavesDeductionAmount = baseSalary > 0 && totalLeavesUsed >= 14 && slip.leaves_deducted > 0
                ? (baseSalary / 26) * slip.leaves_deducted
                : 0

              const deductionsTotal = Object.values(deductions).reduce((sum: number, val: any) => sum + (Number.parseFloat(val) || 0), 0) + leavesDeductionAmount

              return (
                <Card key={slip.id} className="hover:border-purple-500/20 transition-all duration-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg">
                      {getMonthName(slip.month)} {slip.year}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">Earnings</span>
                        <span className="font-semibold text-purple-400">PKR {earnings.toLocaleString('en-PK', { maximumFractionDigits: 0 })}</span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">Deductions</span>
                        <span className="font-semibold text-red-400">PKR {deductionsTotal.toLocaleString('en-PK', { maximumFractionDigits: 0 })}</span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm border-t border-border pt-2">
                        <span className="text-muted-foreground font-semibold">Net Salary</span>
                        <span className="font-bold text-foreground">PKR {(slip.net_salary || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2 flex-col sm:flex-row">
                      <Button
                        onClick={() => handleViewSlip(slip)}
                        variant="outline"
                        size="sm"
                        className="flex-1 w-full sm:w-auto"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      <Button
                        onClick={() => {
                          const slipData = {
                            basic_salary: slip.base_salary || slip.basic_salary,
                            hra: slip.hra,
                            dearness_allowance: slip.dearness_allowance,
                            medical_allowance: slip.medical_allowance,
                            transport_allowance: slip.transport_allowance,
                            other_allowance: slip.other_allowance,
                            allowances: allowances,
                            pf_deduction: slip.pf_deduction,
                            esi_deduction: slip.esi_deduction,
                            professional_tax: slip.professional_tax,
                            loan_deduction: slip.loan_deduction,
                            other_deduction: slip.other_deduction,
                            deductions: deductions,
                            leaves_deducted: slip.leaves_deducted || 0,
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
                            leaves_taken: employeeData?.leaves_taken || 0,
                            employeeName: `${employeeData?.first_name} ${employeeData?.last_name}`,
                            employeeId: employeeData?.employee_id,
                          }
                          setSelectedSlip(slipData)
                          setIsPreviewOpen(true)
                          // Trigger PDF download after dialog opens
                          setTimeout(() => {
                            const downloadBtn = document.querySelector('[data-pdf-download]') as HTMLButtonElement
                            if (downloadBtn) {
                              downloadBtn.click()
                            }
                          }, 300)
                        }}
                        variant="outline"
                        size="sm"
                        className="flex-1 w-full sm:w-auto"
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
