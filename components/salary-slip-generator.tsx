"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FileText, Download, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { SalarySlipPreview } from "@/components/salary-slip-preview"

export function SalarySlipGenerator({ isAdmin }: { isAdmin: boolean }) {
  const [slips, setSlips] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSlip, setSelectedSlip] = useState<any>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [employees, setEmployees] = useState<any[]>([])
  const [formData, setFormData] = useState({
    employee_id: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    basic_salary: 0,
    hra: 0,
    dearness_allowance: 0,
    medical_allowance: 0,
    transport_allowance: 0,
    other_allowance: 0,
    pf_deduction: 0,
    esi_deduction: 0,
    professional_tax: 0,
    loan_deduction: 0,
    other_deduction: 0,
    present_days: 26,
    working_days: 26,
  })
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchSalarySlips()
    fetchEmployeesData()
  }, [])

  // Refetch employees when create dialog opens
  useEffect(() => {
    if (isCreateOpen) {
      fetchEmployeesData()
    }
  }, [isCreateOpen])

  const fetchSalarySlips = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("salary_slips")
        .select("*, employees(first_name, last_name, employee_id)")
        .order("created_at", { ascending: false })

      if (error) throw error
      setSlips(data || [])
    } catch (error: any) {
      console.log("[v0] Error fetching salary slips:", error.message)
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchEmployeesData = async () => {
    try {
      console.log("[v0] Fetching employees...")
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, employee_id")
        .order("first_name", { ascending: true })

      if (error) {
        console.log("[v0] Error fetching employees:", error)
        throw error
      }
      console.log("[v0] Employees fetched:", data)
      setEmployees(data || [])
    } catch (error: any) {
      console.log("[v0] Exception in fetchEmployeesData:", error.message)
      toast({ title: "Error", description: `Failed to load employees: ${error.message}`, variant: "destructive" })
      setEmployees([])
    }
  }

  const createSalarySlip = async () => {
    if (!formData.employee_id) {
      toast({ title: "Error", description: "Please select an employee", variant: "destructive" })
      return
    }

    try {
      console.log("[v0] Creating salary slip for employee:", formData.employee_id)

      const allowances = {
        hra: formData.hra,
        dearness_allowance: formData.dearness_allowance,
        medical_allowance: formData.medical_allowance,
        transport_allowance: formData.transport_allowance,
        other_allowance: formData.other_allowance,
      }

      const deductions = {
        pf_deduction: formData.pf_deduction,
        esi_deduction: formData.esi_deduction,
        professional_tax: formData.professional_tax,
        loan_deduction: formData.loan_deduction,
        other_deduction: formData.other_deduction,
      }

      const totalEarnings =
        formData.basic_salary +
        formData.hra +
        formData.dearness_allowance +
        formData.medical_allowance +
        formData.transport_allowance +
        formData.other_allowance

      const totalDeductions =
        formData.pf_deduction +
        formData.esi_deduction +
        formData.professional_tax +
        formData.loan_deduction +
        formData.other_deduction

      const netSalary = totalEarnings - totalDeductions

      const { error } = await supabase.from("salary_slips").insert([
        {
          employee_id: formData.employee_id,
          month: formData.month,
          year: formData.year,
          basic_salary: formData.basic_salary,
          allowances: allowances,
          deductions: deductions,
          net_salary: netSalary,
        },
      ])

      if (error) {
        console.log("[v0] Error creating salary slip:", error.message)
        throw error
      }

      console.log("[v0] Salary slip created successfully")
      toast({ title: "Success", description: "Salary slip created successfully" })
      setIsCreateOpen(false)
      setFormData({
        employee_id: "",
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        basic_salary: 0,
        hra: 0,
        dearness_allowance: 0,
        medical_allowance: 0,
        transport_allowance: 0,
        other_allowance: 0,
        pf_deduction: 0,
        esi_deduction: 0,
        professional_tax: 0,
        loan_deduction: 0,
        other_deduction: 0,
        present_days: 26,
        working_days: 26,
      })
      fetchSalarySlips()
    } catch (error: any) {
      console.log("[v0] Exception creating salary slip:", error.message)
      toast({ title: "Error", description: `Failed to create salary slip: ${error.message}`, variant: "destructive" })
    }
  }

  const downloadPDF = async (slip: any) => {
    // Placeholder for PDF generation
    toast({ title: "Info", description: "PDF download feature coming soon" })
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <Button onClick={() => setIsCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          <FileText className="w-4 h-4 mr-2" />
          Create Salary Slip
        </Button>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="pt-8">
            <p className="text-center text-muted-foreground">Loading salary slips...</p>
          </CardContent>
        </Card>
      ) : slips.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-8">
            <p className="text-center text-muted-foreground">No salary slips generated yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {slips.map((slip) => (
                <Card key={slip.id} className="hover:border-blue-600/50 transition">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  {slip.employees?.first_name} {slip.employees?.last_name}
                </CardTitle>
                <CardDescription>
                  {slip.employees?.employee_id} • {slip.month}/{slip.year}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Earnings</p>
                    <p className="font-semibold text-green-600">
                      PKR {(slip.basic_salary + Object.values(slip.allowances || {}).reduce((sum: number, val: any) => sum + (Number.parseFloat(val) || 0), 0)).toLocaleString("en-PK", { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Deductions</p>
                    <p className="font-semibold text-red-600">
                      PKR {Object.values(slip.deductions || {}).reduce((sum: number, val: any) => sum + (Number.parseFloat(val) || 0), 0).toLocaleString("en-PK", { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Net Salary</p>
                    <p className="font-semibold text-blue-600">
                      PKR {(slip.net_salary || 0).toLocaleString("en-PK", { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedSlip({
                        basic_salary: slip.basic_salary,
                        allowances: slip.allowances || {},
                        deductions: slip.deductions || {},
                        net_salary: slip.net_salary,
                        month: slip.month,
                        year: slip.year,
                        employee_name: `${slip.employees?.first_name} ${slip.employees?.last_name}`,
                        employee_id: slip.employees?.employee_id,
                        email: slip.employees?.email,
                        department: slip.employees?.department,
                        designation: slip.employees?.designation,
                        position: slip.employees?.designation,
                        joinDate: slip.employees?.date_of_joining,
                      })
                      setIsPreviewOpen(true)
                    }}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => downloadPDF(slip)} className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl w-full mx-auto h-screen max-h-screen flex flex-col overflow-hidden bg-white dark:bg-gray-900" style={{ backgroundColor: '#ffffff' }}>
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Salary Slip Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {selectedSlip && <SalarySlipPreview employee={selectedSlip} />}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-3xl max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Salary Slip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Employee</label>
              <select
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select Employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.employee_id})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Month</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Year</label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold text-sm">Earnings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Basic Salary</label>
                  <input
                    type="number"
                    value={formData.basic_salary}
                    onChange={(e) => setFormData({ ...formData, basic_salary: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">HRA</label>
                  <input
                    type="number"
                    value={formData.hra}
                    onChange={(e) => setFormData({ ...formData, hra: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Dearness Allowance</label>
                  <input
                    type="number"
                    value={formData.dearness_allowance}
                    onChange={(e) => setFormData({ ...formData, dearness_allowance: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Medical Allowance</label>
                  <input
                    type="number"
                    value={formData.medical_allowance}
                    onChange={(e) => setFormData({ ...formData, medical_allowance: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Transport Allowance</label>
                  <input
                    type="number"
                    value={formData.transport_allowance}
                    onChange={(e) => setFormData({ ...formData, transport_allowance: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Other Allowance</label>
                  <input
                    type="number"
                    value={formData.other_allowance}
                    onChange={(e) => setFormData({ ...formData, other_allowance: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold text-sm">Deductions</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">PF Deduction</label>
                  <input
                    type="number"
                    value={formData.pf_deduction}
                    onChange={(e) => setFormData({ ...formData, pf_deduction: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">ESI Deduction</label>
                  <input
                    type="number"
                    value={formData.esi_deduction}
                    onChange={(e) => setFormData({ ...formData, esi_deduction: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Professional Tax</label>
                  <input
                    type="number"
                    value={formData.professional_tax}
                    onChange={(e) => setFormData({ ...formData, professional_tax: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Loan Deduction</label>
                  <input
                    type="number"
                    value={formData.loan_deduction}
                    onChange={(e) => setFormData({ ...formData, loan_deduction: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Other Deduction</label>
                  <input
                    type="number"
                    value={formData.other_deduction}
                    onChange={(e) => setFormData({ ...formData, other_deduction: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold text-sm">Attendance</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Days Present</label>
                  <input
                    type="number"
                    value={formData.present_days}
                    onChange={(e) => setFormData({ ...formData, present_days: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Working Days</label>
                  <input
                    type="number"
                    value={formData.working_days}
                    onChange={(e) => setFormData({ ...formData, working_days: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={createSalarySlip} className="flex-1 bg-blue-600 hover:bg-blue-700">
                Create Salary Slip
              </Button>
              <Button onClick={() => setIsCreateOpen(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
