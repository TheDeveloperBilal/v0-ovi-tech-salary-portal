"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Edit2, Trash2, Plus, RefreshCw, Lock, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ProbationManager } from "./probation-manager"

// Generate a strong random password
function generateSecurePassword() {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const lowercase = "abcdefghijklmnopqrstuvwxyz"
  const numbers = "0123456789"
  const special = "!@#$%^&*"
  const all = uppercase + lowercase + numbers + special

  let password = ""
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]

  for (let i = password.length; i < 12; i++) {
    password += all[Math.floor(Math.random() * all.length)]
  }

  return password.split('').sort(() => Math.random() - 0.5).join('')
}

export function EmployeeManagement() {
  const [employees, setEmployees] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false)
  const [resetPasswordData, setResetPasswordData] = useState({
    employeeId: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [formData, setFormData] = useState({
    employee_id: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    department: "",
    designation: "",
    date_of_joining: "",
    password: "",
    is_probation: false,
    probation_end_date: "",
  })
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    setIsLoading(true)
    const { data, error } = await supabase.from("employees").select("*").order("created_at", { ascending: false })

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } else {
      setEmployees(data || [])
    }
    setIsLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingId) {
        // Update existing employee
        const { password, ...dataWithoutPassword } = formData
        const { error } = await supabase.from("employees").update(dataWithoutPassword).eq("id", editingId)
        if (error) throw error
        toast({ title: "Success", description: "Employee updated successfully" })
      } else {
        // Create new employee via API
        if (!formData.password) {
          toast({ title: "Error", description: "Password is required for new employees", variant: "destructive" })
          return
        }


        // Get the current session to send auth token
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("Not authenticated. Please log in.");
        }

        const response = await fetch("/api/employees/add", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`
          },
          body: JSON.stringify(formData),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to add employee")
        }


        toast({
          title: "Success",
          description: `Employee added successfully!\n\nShare these credentials with the employee:\n\nEmail: ${formData.email}\nPassword: ${formData.password}`,
          variant: "default",
        })
      }

      setFormData({
        employee_id: "",
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        department: "",
        designation: "",
        date_of_joining: "",
        password: "",
        is_probation: false,
        probation_end_date: "",
      })
      setEditingId(null)
      setIsOpen(false)
      fetchEmployees()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this employee? This action cannot be undone.")) return

    try {

      // Get the current session to send auth token
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Not authenticated. Please log in.");
      }

      const response = await fetch(`/api/employees/delete/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete employee")
      }


      // Update local state immediately
      setEmployees(employees.filter(emp => emp.id !== id))

      toast({ title: "Success", description: "Employee deleted successfully" })

      // Refresh from server to ensure consistency
      setTimeout(() => fetchEmployees(), 500)
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete employee", variant: "destructive" })
    }
  }

  const handleEdit = (employee: any) => {
    setFormData({
      employee_id: employee.employee_id || "",
      first_name: employee.first_name || "",
      last_name: employee.last_name || "",
      email: employee.email || "",
      phone: employee.phone || "",
      department: employee.department || "",
      designation: employee.designation || "",
      date_of_joining: employee.date_of_joining || "",
      password: "",
      is_probation: employee.is_probation === true,
      probation_end_date: employee.probation_end_date || "",
    })
    setEditingId(employee.id)
    setIsOpen(true)
  }

  const handleResetPassword = async () => {
    if (!resetPasswordData.employeeId) {
      toast({ title: "Error", description: "Please select an employee", variant: "destructive" })
      return
    }

    if (!resetPasswordData.newPassword || resetPasswordData.newPassword.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters long", variant: "destructive" })
      return
    }

    if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" })
      return
    }

    try {

      // Get the current session to send auth token
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Not authenticated. Please log in.");
      }

      const response = await fetch("/api/employees/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          employeeId: resetPasswordData.employeeId,
          newPassword: resetPasswordData.newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password")
      }

      toast({
        title: "Success",
        description: `Password reset successfully for ${data.email}. Employee can now log in with the new password.`,
      })

      setResetPasswordData({
        employeeId: "",
        newPassword: "",
        confirmPassword: "",
      })
      setIsResetPasswordOpen(false)
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Employee Management</h2>
            <p className="text-muted-foreground mt-1">Add and manage employee records</p>
          </div>
          <Button onClick={() => {
            setFormData({
              employee_id: "",
              first_name: "",
              last_name: "",
              email: "",
              phone: "",
              department: "",
              designation: "",
              date_of_joining: "",
              password: "",
              is_probation: false,
              probation_end_date: "",
            });
            setEditingId(null);
            setIsOpen(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="pt-8">
            <p className="text-center text-muted-foreground">Loading employees...</p>
          </CardContent>
        </Card>
      ) : employees.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-8">
            <p className="text-center text-muted-foreground mb-4">No employees found</p>
            <p className="text-sm text-center text-muted-foreground">Click "Add Employee" to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {employees.map((emp) => (
            <Card key={emp.id}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span>{emp.first_name} {emp.last_name}</span>
                  {emp.is_probation && (
                    <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded-full flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Probation
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  {emp.designation} • {emp.department}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                  <div>
                    <p className="text-muted-foreground">Employee ID</p>
                    <p className="font-semibold text-foreground">{emp.employee_id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-semibold text-foreground break-all">{emp.email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-semibold text-foreground">{emp.phone}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Joining Date</p>
                    <p className="font-semibold text-foreground">{emp.date_of_joining}</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-border">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(emp)} className="flex-1 w-full sm:w-auto">
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  {emp.is_probation && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {}}
                      className="flex-1 w-full sm:w-auto bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20"
                    >
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Probation Status
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setResetPasswordData({ ...resetPasswordData, employeeId: emp.id })
                      setIsResetPasswordOpen(true)
                    }}
                    className="flex-1 w-full sm:w-auto"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Reset Password
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(emp.id)} className="flex-1 w-full sm:w-auto">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl w-full max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{editingId ? "Edit Employee" : "Add New Employee"}</DialogTitle>
            <DialogDescription>Fill in the employee details below</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="employee_id">Employee ID *</Label>
                  <Input
                    id="employee_id"
                    value={formData.employee_id ?? ""}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email ?? ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone ?? ""}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={formData.department ?? ""}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="designation">Designation</Label>
                  <Input
                    id="designation"
                    value={formData.designation ?? ""}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="date_of_joining">Joining Date</Label>
                  <Input
                    id="date_of_joining"
                    type="date"
                    value={formData.date_of_joining ?? ""}
                    onChange={(e) => setFormData({ ...formData, date_of_joining: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="password">Password {!editingId && "*"}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="password"
                      type="text"
                      placeholder={editingId ? "Leave blank to keep current password" : "Enter or generate password"}
                      value={formData.password ?? ""}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required={!editingId}
                    />
                    {!editingId && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newPassword = generateSecurePassword()
                          setFormData({ ...formData, password: newPassword })
                        }}
                        className="flex-shrink-0"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Use the button to generate a secure password, then share with the employee</p>
                </div>
              </div>

              {/* Probation Section */}
              <div className="border-t border-border pt-4 space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_probation"
                    checked={Boolean(formData.is_probation ?? false)}
                    onChange={(e) => setFormData({
                      ...formData,
                      is_probation: e.target.checked,
                      probation_end_date: e.target.checked ? formData.probation_end_date || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : ""
                    })}
                    className="w-4 h-4 rounded border-border bg-background cursor-pointer accent-purple-500"
                  />
                  <label htmlFor="is_probation" className="text-sm font-medium cursor-pointer text-foreground">
                    Mark as Probation Period Employee
                  </label>
                </div>
                {formData.is_probation && (
                  <div>
                    <Label htmlFor="probation_end_date">Probation End Date *</Label>
                    <Input
                      id="probation_end_date"
                      type="date"
                      value={formData.probation_end_date ?? ""}
                      onChange={(e) => setFormData({ ...formData, probation_end_date: e.target.value })}
                      required={formData.is_probation}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Employee will have no paid leave benefits until this date</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-shrink-0 pt-4 border-t border-border">
              <Button type="submit" className="w-full">
                {editingId ? "Update Employee" : "Add Employee"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent className="max-w-2xl w-full max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Reset Employee Password</DialogTitle>
            <DialogDescription>Enter a new password for the employee. They will be able to login with this new password.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleResetPassword(); }} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              <div>
                <Label htmlFor="reset_employee">Select Employee *</Label>
                <select
                  id="reset_employee"
                  value={resetPasswordData.employeeId}
                  onChange={(e) => setResetPasswordData({ ...resetPasswordData, employeeId: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="new_password">New Password *</Label>
                <Input
                  id="new_password"
                  type="password"
                  placeholder="Enter new password (min 8 characters)"
                  value={resetPasswordData.newPassword}
                  onChange={(e) => setResetPasswordData({ ...resetPasswordData, newPassword: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="confirm_password">Confirm Password *</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  placeholder="Confirm new password"
                  value={resetPasswordData.confirmPassword}
                  onChange={(e) => setResetPasswordData({ ...resetPasswordData, confirmPassword: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="flex gap-2 pt-4 border-t border-border flex-shrink-0">
              <Button type="submit" className="flex-1">
                Reset Password
              </Button>
              <Button type="button" onClick={() => setIsResetPasswordOpen(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
