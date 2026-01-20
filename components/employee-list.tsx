"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Edit2, Trash2, FileText } from "lucide-react"

export function EmployeeList({ employees, onEdit, onDelete, onViewSlip, onViewSlipTab }: any) {
  const calculateTakehome = (emp: any) => {
    const base = Number.parseFloat(emp.baseSalary) || 0
    const allowances = Object.values(emp.allowances).reduce(
      (sum: number, val: any) => sum + (Number.parseFloat(val) || 0),
      0,
    )
    const deductions = Object.values(emp.deductions).reduce(
      (sum: number, val: any) => sum + (Number.parseFloat(val) || 0),
      0,
    )
    return base + allowances - deductions
  }

  if (employees.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-8 text-center">
          <p className="text-muted-foreground mb-4">No employees added yet</p>
          <p className="text-sm">Start by adding an employee from the "Add Employee" section</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {employees.map((emp: any) => (
          <Card key={emp.id} className="hover:border-primary/50 transition">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{emp.employeeName}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {emp.position} • {emp.department}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Employee ID</p>
                  <p className="font-semibold">{emp.employeeId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Base Salary</p>
                  <p className="font-semibold">
                    ₹{Number.parseFloat(emp.baseSalary).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Take Home</p>
                  <p className="font-semibold text-primary">
                    ₹{calculateTakehome(emp).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onViewSlip(emp)
                    onViewSlipTab()
                  }}
                  className="flex-1"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Slip
                </Button>
                <Button variant="outline" size="sm" onClick={() => onEdit(emp)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="destructive" size="sm" onClick={() => onDelete(emp.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
