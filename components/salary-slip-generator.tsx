"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FileText, Download, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function SalarySlipGenerator({ isAdmin }: { isAdmin: boolean }) {
  const [slips, setSlips] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSlip, setSelectedSlip] = useState<any>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchSalarySlips()
  }, [])

  const fetchSalarySlips = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from("salary_slips")
      .select("*, employees(first_name, last_name, employee_id)")
      .order("created_at", { ascending: false })

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } else {
      setSlips(data || [])
    }
    setIsLoading(false)
  }

  const downloadPDF = async (slip: any) => {
    // Placeholder for PDF generation
    toast({ title: "Info", description: "PDF download feature coming soon" })
  }

  return (
    <div className="space-y-4">
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
            <Card key={slip.id} className="hover:border-purple-600/50 transition">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
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
                      ₹{slip.total_earnings?.toLocaleString("en-IN", { maximumFractionDigits: 0 }) || "0"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Deductions</p>
                    <p className="font-semibold text-red-600">
                      ₹{slip.total_deductions?.toLocaleString("en-IN", { maximumFractionDigits: 0 }) || "0"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Net Salary</p>
                    <p className="font-semibold text-purple-600">
                      ₹{slip.net_salary?.toLocaleString("en-IN", { maximumFractionDigits: 0 }) || "0"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedSlip(slip)
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
        <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Salary Slip Preview</DialogTitle>
          </DialogHeader>
          {selectedSlip && <SalarySlipPreview slip={selectedSlip} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SalarySlipPreview({ slip }: { slip: any }) {
  return (
    <div className="p-6 bg-white rounded border border-gray-200">
      <div className="text-center mb-6 border-b pb-4">
        <h2 className="text-2xl font-bold text-purple-600">SALARY SLIP</h2>
        <p className="text-sm text-gray-600">OviTech Global Pvt Ltd</p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
        <div>
          <p className="text-gray-600">Employee Name:</p>
          <p className="font-semibold">
            {slip.employees?.first_name} {slip.employees?.last_name}
          </p>
        </div>
        <div>
          <p className="text-gray-600">Employee ID:</p>
          <p className="font-semibold">{slip.employees?.employee_id}</p>
        </div>
        <div>
          <p className="text-gray-600">Period:</p>
          <p className="font-semibold">
            {slip.month}/{slip.year}
          </p>
        </div>
        <div>
          <p className="text-gray-600">Days Present:</p>
          <p className="font-semibold">
            {slip.present_days || 26} / {slip.working_days || 26}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="border-t pt-4">
          <h3 className="font-bold text-green-600 mb-3">Earnings</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Base Salary:</span>
              <span>₹{slip.base_salary?.toLocaleString("en-IN", { maximumFractionDigits: 0 }) || "0"}</span>
            </div>
            {slip.hra && (
              <div className="flex justify-between">
                <span>HRA:</span>
                <span>₹{slip.hra.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
              </div>
            )}
            {slip.dearness_allowance && (
              <div className="flex justify-between">
                <span>Dearness Allowance:</span>
                <span>₹{slip.dearness_allowance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
              </div>
            )}
            {slip.medical_allowance && (
              <div className="flex justify-between">
                <span>Medical Allowance:</span>
                <span>₹{slip.medical_allowance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
              </div>
            )}
            {slip.transport_allowance && (
              <div className="flex justify-between">
                <span>Transport Allowance:</span>
                <span>₹{slip.transport_allowance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-green-600 border-t pt-2">
              <span>Total Earnings:</span>
              <span>₹{slip.total_earnings?.toLocaleString("en-IN", { maximumFractionDigits: 0 }) || "0"}</span>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-bold text-red-600 mb-3">Deductions</h3>
          <div className="space-y-2 text-sm">
            {slip.pf_deduction && (
              <div className="flex justify-between">
                <span>PF:</span>
                <span>₹{slip.pf_deduction.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
              </div>
            )}
            {slip.esi_deduction && (
              <div className="flex justify-between">
                <span>ESI:</span>
                <span>₹{slip.esi_deduction.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
              </div>
            )}
            {slip.professional_tax && (
              <div className="flex justify-between">
                <span>Professional Tax:</span>
                <span>₹{slip.professional_tax.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
              </div>
            )}
            {slip.loan_deduction && (
              <div className="flex justify-between">
                <span>Loan Deduction:</span>
                <span>₹{slip.loan_deduction.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-red-600 border-t pt-2">
              <span>Total Deductions:</span>
              <span>₹{slip.total_deductions?.toLocaleString("en-IN", { maximumFractionDigits: 0 }) || "0"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-purple-50 p-4 rounded text-center">
        <p className="text-gray-600 text-sm">Net Salary</p>
        <p className="text-3xl font-bold text-purple-600">
          ₹{slip.net_salary?.toLocaleString("en-IN", { maximumFractionDigits: 0 }) || "0"}
        </p>
      </div>
    </div>
  )
}
