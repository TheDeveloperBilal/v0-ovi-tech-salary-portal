"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Download, Printer } from "lucide-react"
import Image from "next/image"
import { useRef, useState } from "react"
import { generateWordDocument } from "@/lib/word-generator"
import { useToast } from "@/hooks/use-toast"

export function SalarySlipPreview({ employee }: any) {
  const slipRef = useRef<HTMLDivElement>(null)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const { toast } = useToast()

  // Support both naming conventions for compatibility
  const employeeName = employee.employee_name || employee.employeeName || "Employee"
  const employeeId = employee.employee_id || employee.employeeId || "N/A"

  const base = Number.parseFloat(employee.basic_salary) || Number.parseFloat(employee.baseSalary) || 0

  // Support both JSON object format and individual columns format
  let allowances = employee.allowances || {}
  let deductions = employee.deductions || {}

  // If allowances is empty but individual fields exist, reconstruct the object
  if (Object.keys(allowances).length === 0 && employee.hra !== undefined) {
    allowances = {
      hra: employee.hra || 0,
      dearness_allowance: employee.dearness_allowance || 0,
      medical_allowance: employee.medical_allowance || 0,
      transport_allowance: employee.transport_allowance || 0,
      other_allowance: employee.other_allowance || 0,
    }
  }

  // If deductions is empty but individual fields exist, reconstruct the object
  if (Object.keys(deductions).length === 0 && employee.pf_deduction !== undefined) {
    deductions = {
      pf_deduction: employee.pf_deduction || 0,
      esi_deduction: employee.esi_deduction || 0,
      professional_tax: employee.professional_tax || 0,
      loan_deduction: employee.loan_deduction || 0,
      other_deduction: employee.other_deduction || 0,
    }
  }

  const totalAllowances = Object.values(allowances).reduce(
    (sum: number, val: any) => sum + (Number.parseFloat(val) || 0),
    0,
  )
  const totalDeductions = Object.values(deductions).reduce(
    (sum: number, val: any) => sum + (Number.parseFloat(val) || 0),
    0,
  )

  // Calculate leave deduction as monetary value (daily salary × leaves deducted)
  // Only deduct leave money if all 14 annual leaves have been used
  const totalLeavesUsed = employee.total_leaves_used !== undefined 
    ? employee.total_leaves_used 
    : (employee.leaves_taken || 0) + (employee.leaves_deducted || 0)
  
  const leavesDeductedAmount = base > 0 && totalLeavesUsed >= 14 && employee.leaves_deducted > 0
    ? (base / 26) * employee.leaves_deducted
    : 0

  const totalDeductionsWithLeaves = totalDeductions + leavesDeductedAmount
  const netSalary = base + totalAllowances - totalDeductionsWithLeaves
  const currentDate = new Date()
  const monthNum = employee.month || currentDate.getMonth() + 1
  const yearNum = employee.year || currentDate.getFullYear()
  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const month = monthNames[monthNum] || currentDate.toLocaleString("default", { month: "long" })
  const year = yearNum

  const handlePDFDownload = async () => {
    if (!slipRef.current) {
      console.log("[v0] No slip ref found")
      return
    }

    try {
      setIsGeneratingPDF(true)
      console.log("[v0] Generating PDF for:", employeeName)

      // Import dynamically to avoid SSR issues
      const html2canvas = (await import('html2canvas')).default
      const jsPDF = (await import('jspdf')).jsPDF

      const canvas = await html2canvas(slipRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 210 // A4 width in mm
      const pageHeight = 295 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      const fileName = `${employeeName}_SalarySlip_${year}_${month}.pdf`
      pdf.save(fileName)
      console.log("[v0] PDF generated successfully")
      toast({ title: "Success", description: "PDF downloaded successfully" })
    } catch (error) {
      console.log("[v0] PDF generation error:", error)
      toast({ title: "Error", description: "Failed to generate PDF", variant: "destructive" })
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const handleWordDownload = () => {
    generateWordDocument(employee, base, totalAllowances, totalDeductions, netSalary, month, year)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 no-print">
        <Button
          onClick={handlePDFDownload}
          disabled={isGeneratingPDF}
          className="gap-2 w-full sm:w-auto"
          data-pdf-download
        >
          <Download className="w-4 h-4" />
          {isGeneratingPDF ? "Generating..." : "Download PDF"}
        </Button>
        <Button onClick={handleWordDownload} variant="outline" className="gap-2 bg-transparent w-full sm:w-auto">
          <Download className="w-4 h-4" />
          Download Word
        </Button>
        <Button onClick={handlePrint} variant="outline" className="gap-2 bg-transparent w-full sm:w-auto">
          <Printer className="w-4 h-4" />
          Print
        </Button>
      </div>

      <div ref={slipRef} className="bg-white text-black rounded-lg border border-gray-300" style={{ backgroundColor: '#ffffff', color: '#000000' }}>
        <div className="pt-8 space-y-6 p-8">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-primary pb-4">
            <div className="flex items-center gap-3">
              <Image src="/ovitech-logo.png" alt="OviTech Logo" width={50} height={50} className="h-12 w-auto" />
              <div>
                <h2 className="text-2xl font-bold text-primary">OviTech Global Pvt Ltd</h2>
                <p className="text-xs text-gray-600">Digital Marketing Agency</p>
              </div>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p className="font-semibold">SALARY SLIP</p>
              <p className="text-xs">
                {month} {year}
              </p>
            </div>
          </div>

          {/* Employee Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 text-xs sm:text-sm">
            <div>
              <p className="text-gray-600 font-semibold text-sm">Employee Information</p>
              <div className="mt-2 space-y-1">
                <p className="flex flex-col sm:flex-row sm:gap-2">
                  <span className="text-gray-600 font-medium">Name:</span>{" "}
                  <span className="font-semibold">{employeeName}</span>
                </p>
                <p className="flex flex-col sm:flex-row sm:gap-2">
                  <span className="text-gray-600 font-medium">Employee ID:</span>{" "}
                  <span className="font-semibold">{employeeId}</span>
                </p>
                <p className="flex flex-col sm:flex-row sm:gap-2">
                  <span className="text-gray-600 font-medium">Email:</span>{" "}
                  <span className="font-semibold break-all">{employee.email || "N/A"}</span>
                </p>
                <p className="flex flex-col sm:flex-row sm:gap-2">
                  <span className="text-gray-600 font-medium">Department:</span>{" "}
                  <span className="font-semibold">{employee.department || "N/A"}</span>
                </p>
              </div>
            </div>
            <div>
              <p className="text-gray-600 font-semibold text-sm">Employment Details</p>
              <div className="mt-2 space-y-1">
                <p className="flex flex-col sm:flex-row sm:gap-2">
                  <span className="text-gray-600 font-medium">Position:</span>{" "}
                  <span className="font-semibold">{employee.position || "N/A"}</span>
                </p>
                <p className="flex flex-col sm:flex-row sm:gap-2">
                  <span className="text-gray-600 font-medium">Joining Date:</span>{" "}
                  <span className="font-semibold">{employee.joinDate || "N/A"}</span>
                </p>
                <p className="flex flex-col sm:flex-row sm:gap-2">
                  <span className="text-gray-600 font-medium">Slip Date:</span>{" "}
                  <span className="font-semibold">{currentDate.toLocaleDateString()}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Earnings & Deductions Table */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Earnings */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm border border-gray-300">
                <thead>
                  <tr className="bg-primary text-white">
                    <th className="p-2 text-left border-b border-gray-300">Earnings</th>
                    <th className="p-2 text-right border-b border-gray-300">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-300">
                    <td className="p-2">Basic Salary</td>
                    <td className="p-2 text-right font-semibold">
                      PKR {base.toLocaleString("en-PK", { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                  {Object.entries(allowances).map(([key, value]: any) => {
                    const val = Number.parseFloat(value) || 0
                    return val > 0 ? (
                      <tr key={key} className="border-b border-gray-300">
                        <td className="p-2 capitalize">{key.replace(/_/g, " ")}</td>
                        <td className="p-2 text-right font-semibold">
                          PKR {val.toLocaleString("en-PK", { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ) : null
                  })}
                  <tr className="bg-green-50 font-semibold border-b border-gray-300">
                    <td className="p-2">Total Earnings</td>
                    <td className="p-2 text-right">
                      PKR {(base + totalAllowances).toLocaleString("en-PK", { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Deductions */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm border border-gray-300">
                <thead>
                  <tr className="bg-accent text-accent-foreground">
                    <th className="p-2 text-left border-b border-gray-300">Deductions</th>
                    <th className="p-2 text-right border-b border-gray-300">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(deductions).map(([key, value]: any) => {
                    const val = Number.parseFloat(value) || 0
                    return val > 0 ? (
                      <tr key={key} className="border-b border-gray-300">
                        <td className="p-2 capitalize">
                          {key === "pf_deduction" ? "PF" :
                            key === "esi_deduction" ? "ESI" :
                              key === "professional_tax" ? "Professional Tax" :
                                key === "loan_deduction" ? "Loan Deduction" :
                                  key.replace(/_/g, " ")}
                        </td>
                        <td className="p-2 text-right font-semibold">
                          PKR {val.toLocaleString("en-PK", { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ) : null
                  })}
                  {employee.leaves_deducted && employee.leaves_deducted > 0 && (
                    <tr className="border-b border-gray-300">
                      <td className="p-2 capitalize">Leaves Deducted ({employee.leaves_deducted} days)</td>
                      <td className="p-2 text-right font-semibold">
                        PKR {leavesDeductedAmount.toLocaleString("en-PK", { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  )}
                  <tr className="bg-red-50 font-semibold border-b border-gray-300">
                    <td className="p-2">Total Deductions</td>
                    <td className="p-2 text-right">
                      PKR {totalDeductionsWithLeaves.toLocaleString("en-PK", { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Net Salary */}
          <div className="bg-primary/10 border-2 border-primary rounded p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">NET SALARY</span>
              <span className="text-2xl font-bold text-primary">
                PKR {netSalary.toLocaleString("en-PK", { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t-2 border-primary pt-4 text-xs text-gray-600 text-center">
            <p>This is a computer generated salary slip and does not require a signature.</p>
            <p>For queries, please contact HR Department</p>
            <p className="mt-2 font-semibold">OviTech Global Pvt Ltd | Digital Marketing Agency</p>
          </div>
        </div>
      </div>
    </div>
  )
}
