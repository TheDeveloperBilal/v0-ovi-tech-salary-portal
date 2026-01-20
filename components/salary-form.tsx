"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function SalaryForm({ onSubmit, initialData, isEditing }: any) {
  const [formData, setFormData] = useState(
    initialData || {
      employeeName: "",
      employeeId: "",
      email: "",
      department: "",
      position: "",
      joinDate: "",
      baseSalary: "",
      allowances: {
        hra: "",
        dearness: "",
        medical: "",
        transport: "",
        other: "",
      },
      deductions: {
        pf: "",
        esi: "",
        tax: "",
        loan: "",
        other: "",
      },
    },
  )

  const handleChange = (e: any) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleAllowanceChange = (key: string, value: string) => {
    setFormData({
      ...formData,
      allowances: { ...formData.allowances, [key]: value },
    })
  }

  const handleDeductionChange = (key: string, value: string) => {
    setFormData({
      ...formData,
      deductions: { ...formData.deductions, [key]: value },
    })
  }

  const handleSubmit = (e: any) => {
    e.preventDefault()
    onSubmit(formData)
    setFormData({
      employeeName: "",
      employeeId: "",
      email: "",
      department: "",
      position: "",
      joinDate: "",
      baseSalary: "",
      allowances: { hra: "", dearness: "", medical: "", transport: "", other: "" },
      deductions: { pf: "", esi: "", tax: "", loan: "", other: "" },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Employee Information */}
      <Card>
        <CardHeader className="bg-primary text-primary-foreground">
          <CardTitle>Employee Information</CardTitle>
          <CardDescription className="text-primary-foreground/80">Enter basic employee details</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="employeeName">Full Name *</Label>
              <Input
                id="employeeName"
                name="employeeName"
                value={formData.employeeName}
                onChange={handleChange}
                required
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="employeeId">Employee ID *</Label>
              <Input
                id="employeeId"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                required
                placeholder="EMP001"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@ovitech.com"
              />
            </div>
            <div>
              <Label htmlFor="joinDate">Joining Date</Label>
              <Input id="joinDate" name="joinDate" type="date" value={formData.joinDate} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="e.g., Digital Marketing"
              />
            </div>
            <div>
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                name="position"
                value={formData.position}
                onChange={handleChange}
                placeholder="e.g., Marketing Manager"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Salary Information */}
      <Card>
        <CardHeader className="bg-primary text-primary-foreground">
          <CardTitle>Salary Information</CardTitle>
          <CardDescription className="text-primary-foreground/80">Base salary and allowances</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label htmlFor="baseSalary">Base Salary *</Label>
            <Input
              id="baseSalary"
              name="baseSalary"
              type="number"
              value={formData.baseSalary}
              onChange={handleChange}
              required
              placeholder="0.00"
            />
          </div>
          <div>
            <h4 className="font-semibold mb-3">Allowances</h4>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(formData.allowances).map(([key, value]: any) => (
                <div key={key}>
                  <Label htmlFor={`allowance-${key}`} className="capitalize">
                    {key} Allowance
                  </Label>
                  <Input
                    id={`allowance-${key}`}
                    type="number"
                    value={value}
                    onChange={(e) => handleAllowanceChange(key, e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deductions */}
      <Card>
        <CardHeader className="bg-accent text-accent-foreground">
          <CardTitle>Deductions</CardTitle>
          <CardDescription className="text-accent-foreground/80">Taxes and other deductions</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(formData.deductions).map(([key, value]: any) => (
              <div key={key}>
                <Label htmlFor={`deduction-${key}`} className="capitalize">
                  {key === "pf" ? "PF" : key === "esi" ? "ESI" : key}
                </Label>
                <Input
                  id={`deduction-${key}`}
                  type="number"
                  value={value}
                  onChange={(e) => handleDeductionChange(key, e.target.value)}
                  placeholder="0.00"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" size="lg">
        {isEditing ? "Update Employee" : "Add Employee"}
      </Button>
    </form>
  )
}
