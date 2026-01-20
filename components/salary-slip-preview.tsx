"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Download, Printer } from "lucide-react"
import Image from "next/image"
import { useRef } from "react"
import html2pdf from "html2pdf.js"
import { generateWordDocument } from "@/lib/word-generator"

export function SalarySlipPreview({ employee }: any) {
  const slipRef = useRef<HTMLDivElement>(null)

  const base = Number.parseFloat(employee.baseSalary) || 0
  const totalAllowances = Object.values(employee.allowances).reduce(
    (sum: number, val: any) => sum + (Number.parseFloat(val) || 0),
    0,
  )
  const totalDeductions = Object.values(employee.deductions).reduce(
    (sum: number, val: any) => sum + (Number.parseFloat(val) || 0),
    0,
  )
  const netSalary = base + totalAllowances - totalDeductions
  const currentDate = new Date()
  const month = currentDate.toLocaleString("default", { month: "long" })
  const year = currentDate.getFullYear()

  const handlePDFDownload = () => {
    if (!slipRef.current) return

    const opt = {
      margin: 10,
      filename: `${employee.employeeName}_SalarySlip_${year}_${month}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
    }

    html2pdf().set(opt).from(slipRef.current).save()
  }

  const handleWordDownload = () => {
    generateWordDocument(employee, base, totalAllowances, totalDeductions, netSalary, month, year)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 no-print">
        <Button onClick={handlePDFDownload} className="gap-2">
          <Download className="w-4 h-4" />
          Download PDF
        </Button>
        <Button onClick={handleWordDownload} variant="outline" className="gap-2 bg-transparent">
          <Download className="w-4 h-4" />
          Download Word
        </Button>
        <Button onClick={handlePrint} variant="outline" className="gap-2 bg-transparent">
          <Printer className="w-4 h-4" />
          Print
        </Button>
      </div>

      <Card ref={slipRef} className="bg-white text-black">
        <CardContent className="pt-8 space-y-6 p-8">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-primary pb-4">
            <div className="flex items-center gap-3">
              <Image src="/ovitech-logo.png" alt="OviTech Logo" width={50} height={50} className="h-12 w-auto" />
              <div>
                <h2 className="text-2xl font-bold text-primary">OviTech Global Pvt Ltd</h2>
                <p className="text-xs text-gray-600">Digital Marketing Agency | UAE</p>
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
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-gray-600 font-semibold">Employee Information</p>
              <div className="mt-2 space-y-1">
                <p>
                  <span className="text-gray-600">Name:</span>{" "}
                  <span className="font-semibold">{employee.employeeName}</span>
                </p>
                <p>
                  <span className="text-gray-600">Employee ID:</span>{" "}
                  <span className="font-semibold">{employee.employeeId}</span>
                </p>
                <p>
                  <span className="text-gray-600">Email:</span>{" "}
                  <span className="font-semibold">{employee.email || "N/A"}</span>
                </p>
                <p>
                  <span className="text-gray-600">Department:</span>{" "}
                  <span className="font-semibold">{employee.department || "N/A"}</span>
                </p>
              </div>
            </div>
            <div>
              <p className="text-gray-600 font-semibold">Employment Details</p>
              <div className="mt-2 space-y-1">
                <p>
                  <span className="text-gray-600">Position:</span>{" "}
                  <span className="font-semibold">{employee.position || "N/A"}</span>
                </p>
                <p>
                  <span className="text-gray-600">Joining Date:</span>{" "}
                  <span className="font-semibold">{employee.joinDate || "N/A"}</span>
                </p>
                <p>
                  <span className="text-gray-600">Slip Date:</span>{" "}
                  <span className="font-semibold">{currentDate.toLocaleDateString()}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Earnings & Deductions Table */}
          <div className="grid grid-cols-2 gap-6">
            {/* Earnings */}
            <div>
              <table className="w-full text-sm border border-gray-300">
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
                      ₹{base.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                  {Object.entries(employee.allowances).map(([key, value]: any) => {
                    const val = Number.parseFloat(value) || 0
                    return val > 0 ? (
                      <tr key={key} className="border-b border-gray-300">
                        <td className="p-2 capitalize">{key} Allowance</td>
                        <td className="p-2 text-right font-semibold">
                          ₹{val.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ) : null
                  })}
                  <tr className="bg-green-50 font-semibold border-b border-gray-300">
                    <td className="p-2">Total Earnings</td>
                    <td className="p-2 text-right">
                      ₹{(base + totalAllowances).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Deductions */}
            <div>
              <table className="w-full text-sm border border-gray-300">
                <thead>
                  <tr className="bg-accent text-accent-foreground">
                    <th className="p-2 text-left border-b border-gray-300">Deductions</th>
                    <th className="p-2 text-right border-b border-gray-300">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(employee.deductions).map(([key, value]: any) => {
                    const val = Number.parseFloat(value) || 0
                    return val > 0 ? (
                      <tr key={key} className="border-b border-gray-300">
                        <td className="p-2 capitalize">{key === "pf" ? "PF" : key === "esi" ? "ESI" : key}</td>
                        <td className="p-2 text-right font-semibold">
                          ₹{val.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ) : null
                  })}
                  <tr className="bg-red-50 font-semibold border-b border-gray-300">
                    <td className="p-2">Total Deductions</td>
                    <td className="p-2 text-right">
                      ₹{totalDeductions.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
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
                ₹{netSalary.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t-2 border-primary pt-4 text-xs text-gray-600 text-center">
            <p>This is a computer generated salary slip and does not require a signature.</p>
            <p>For queries, please contact HR Department</p>
            <p className="mt-2 font-semibold">OviTech Global Pvt Ltd | Digital Marketing Services</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
