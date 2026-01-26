"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Edit2, Trash2, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function EmployeeManagement() {
  const [employees, setEmployees] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
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
        // Create new employee
        if (!formData.password) {
          toast({ title: "Error", description: "Password is required for new employees", variant: "destructive" })
          return
        }

        // First, create auth account
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: `${formData.first_name} ${formData.last_name}`,
            },
          },
        })

        if (authError) throw authError

        // Then create employee record linked to auth user
        const { password, ...dataWithoutPassword } = formData
        const { error: empError } = await supabase
          .from("employees")
          .insert([{
            ...dataWithoutPassword,
            user_id: authData.user?.id,
          }])

        if (empError) throw empError

        toast({
          title: "Success",
          description: `Employee added successfully. Credentials:\nEmail: ${formData.email}\nPassword: ${formData.password}`,
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
      })
      setEditingId(null)
      setIsOpen(false)
      fetchEmployees()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this employee?")) return

    const { error } = await supabase.from("employees").delete().eq("id", id)
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "Success", description: "Employee deleted successfully" })
      fetchEmployees()
    }
  }

  const handleEdit = (employee: any) => {
    setFormData(employee)
    setEditingId(employee.id)
    setIsOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Employee Management</h2>
          <p className="text-muted-foreground">Add and manage employee records</p>
        </div>
        <Button onClick={() => setIsOpen(true)} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Employee
        </Button>
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
            <p className="text-sm text-center">Click "Add Employee" to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {employees.map((emp) => (
            <Card key={emp.id}>
              <CardHeader className="pb-3">
                <CardTitle>
                  {emp.first_name} {emp.last_name}
                </CardTitle>
                <CardDescription>
                  {emp.designation} • {emp.department}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Employee ID</p>
                    <p className="font-semibold">{emp.employee_id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-semibold">{emp.email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-semibold">{emp.phone}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Joining Date</p>
                    <p className="font-semibold">{emp.date_of_joining}</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-3 border-t">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(emp)} className="flex-1">
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(emp.id)} className="flex-1">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Employee" : "Add New Employee"}</DialogTitle>
            <DialogDescription>Fill in the employee details below</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="employee_id">Employee ID *</Label>
                <Input
                  id="employee_id"
                  value={formData.employee_id}
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
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="date_of_joining">Joining Date</Label>
                <Input
                  id="date_of_joining"
                  type="date"
                  value={formData.date_of_joining}
                  onChange={(e) => setFormData({ ...formData, date_of_joining: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="password">Password {!editingId && "*"}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={editingId ? "Leave blank to keep current password" : "Enter initial password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingId}
                />
                <p className="text-xs text-gray-500 mt-1">Share this password with the employee for login</p>
              </div>
            </div>
            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700">
              {editingId ? "Update Employee" : "Add Employee"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
