"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CalendarDays, Plus, Trash2, Shield, Clock, Home, CalendarCheck, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Holiday {
  id: string
  holiday_date: string
  name: string
  type: string
}

interface AttendanceException {
  id: string
  employee_id: string
  exception_date: string
  type: string
  reason: string | null
  employees?: { first_name: string; last_name: string; employee_id: string }
}

const HOLIDAY_TYPES = [
  { value: "public_holiday", label: "Public Holiday", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  { value: "company_holiday", label: "Company Holiday", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  { value: "optional_holiday", label: "Optional Holiday", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
]

const EXCEPTION_TYPES = [
  { value: "approved_leave", label: "Approved Leave", icon: CalendarCheck, color: "text-green-400" },
  { value: "approved_late", label: "Approved Late Arrival", icon: Clock, color: "text-amber-400" },
  { value: "approved_early_out", label: "Approved Early Out", icon: AlertTriangle, color: "text-orange-400" },
  { value: "half_day", label: "Half Day", icon: Clock, color: "text-blue-400" },
  { value: "work_from_home", label: "Work From Home", icon: Home, color: "text-cyan-400" },
]

export function HolidayManager() {
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [exceptions, setExceptions] = useState<AttendanceException[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"holidays" | "exceptions">("holidays")

  // Holiday form
  const [isHolidayOpen, setIsHolidayOpen] = useState(false)
  const [holidayForm, setHolidayForm] = useState({ holiday_date: "", name: "", type: "public_holiday" })

  // Exception form
  const [isExceptionOpen, setIsExceptionOpen] = useState(false)
  const [exceptionForm, setExceptionForm] = useState({
    employee_id: "",
    exception_date: "",
    type: "approved_leave",
    reason: "",
  })

  // Year filter for holidays
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())

  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [filterYear])

  async function fetchData() {
    setIsLoading(true)
    try {
      const [holidayRes, exceptionRes, empRes] = await Promise.all([
        supabase
          .from("company_holidays")
          .select("*")
          .gte("holiday_date", `${filterYear}-01-01`)
          .lte("holiday_date", `${filterYear}-12-31`)
          .order("holiday_date", { ascending: true }),
        supabase
          .from("attendance_exceptions")
          .select("*, employees(first_name, last_name, employee_id)")
          .order("exception_date", { ascending: false })
          .limit(100),
        supabase
          .from("employees")
          .select("id, employee_id, first_name, last_name")
          .order("first_name"),
      ])

      setHolidays(holidayRes.data || [])
      setExceptions(exceptionRes.data || [])
      setEmployees(empRes.data || [])
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAddHoliday(e: React.FormEvent) {
    e.preventDefault()
    try {
      const { error } = await supabase.from("company_holidays").insert({
        holiday_date: holidayForm.holiday_date,
        name: holidayForm.name,
        type: holidayForm.type,
      })
      if (error) throw error

      toast({ title: "Holiday added", description: `${holidayForm.name} added successfully.` })
      setHolidayForm({ holiday_date: "", name: "", type: "public_holiday" })
      setIsHolidayOpen(false)
      fetchData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  async function handleDeleteHoliday(id: string) {
    if (!confirm("Delete this holiday?")) return
    try {
      const { error } = await supabase.from("company_holidays").delete().eq("id", id)
      if (error) throw error
      setHolidays(holidays.filter(h => h.id !== id))
      toast({ title: "Deleted", description: "Holiday removed." })
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  async function handleAddException(e: React.FormEvent) {
    e.preventDefault()
    try {
      const { error } = await supabase.from("attendance_exceptions").insert({
        employee_id: exceptionForm.employee_id,
        exception_date: exceptionForm.exception_date,
        type: exceptionForm.type,
        reason: exceptionForm.reason || null,
      })
      if (error) throw error

      toast({ title: "Exception added", description: "Attendance exception recorded." })
      setExceptionForm({ employee_id: "", exception_date: "", type: "approved_leave", reason: "" })
      setIsExceptionOpen(false)
      fetchData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  async function handleDeleteException(id: string) {
    if (!confirm("Delete this exception?")) return
    try {
      const { error } = await supabase.from("attendance_exceptions").delete().eq("id", id)
      if (error) throw error
      setExceptions(exceptions.filter(e => e.id !== id))
      toast({ title: "Deleted", description: "Exception removed." })
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  function getHolidayType(type: string) {
    return HOLIDAY_TYPES.find(t => t.value === type) || HOLIDAY_TYPES[0]
  }

  function getExceptionType(type: string) {
    return EXCEPTION_TYPES.find(t => t.value === type) || EXCEPTION_TYPES[0]
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-PK", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === "holidays" ? "default" : "outline"}
          onClick={() => setActiveTab("holidays")}
        >
          <CalendarDays className="w-4 h-4 mr-2" />
          Public Holidays
        </Button>
        <Button
          variant={activeTab === "exceptions" ? "default" : "outline"}
          onClick={() => setActiveTab("exceptions")}
        >
          <Shield className="w-4 h-4 mr-2" />
          Attendance Exceptions
        </Button>
      </div>

      {/* ═══════ HOLIDAYS TAB ═══════ */}
      {activeTab === "holidays" && (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-red-400" />
                    Company Holidays — {filterYear}
                  </CardTitle>
                  <CardDescription>
                    Public & company holidays are excluded from attendance deductions
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={String(filterYear)} onValueChange={v => setFilterYear(parseInt(v))}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => {
                        const y = new Date().getFullYear() - 1 + i
                        return <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      })}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => setIsHolidayOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Holiday
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center text-muted-foreground py-8">Loading...</p>
              ) : holidays.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No holidays added for {filterYear}. Click &quot;Add Holiday&quot; to get started.
                </p>
              ) : (
                <div className="space-y-2">
                  {holidays.map(h => {
                    const ht = getHolidayType(h.type)
                    return (
                      <div
                        key={h.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${ht.bg}`}
                      >
                        <div className="flex items-center gap-3">
                          <CalendarDays className={`w-4 h-4 ${ht.color}`} />
                          <div>
                            <p className="font-medium text-foreground">{h.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(h.holiday_date)} • {ht.label}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteHoliday(h.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Holiday Dialog */}
          <Dialog open={isHolidayOpen} onOpenChange={setIsHolidayOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Holiday</DialogTitle>
                <DialogDescription>Add a public or company holiday</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddHoliday} className="space-y-4">
                <div>
                  <Label htmlFor="holiday_name">Holiday Name *</Label>
                  <Input
                    id="holiday_name"
                    placeholder="e.g. Eid ul-Fitr, Pakistan Day"
                    value={holidayForm.name}
                    onChange={e => setHolidayForm({ ...holidayForm, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="holiday_date">Date *</Label>
                  <Input
                    id="holiday_date"
                    type="date"
                    value={holidayForm.holiday_date}
                    onChange={e => setHolidayForm({ ...holidayForm, holiday_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="holiday_type">Type *</Label>
                  <Select
                    value={holidayForm.type}
                    onValueChange={v => setHolidayForm({ ...holidayForm, type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOLIDAY_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">Add Holiday</Button>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* ═══════ EXCEPTIONS TAB ═══════ */}
      {activeTab === "exceptions" && (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-400" />
                    Attendance Exceptions
                  </CardTitle>
                  <CardDescription>
                    Mark approved leaves, late arrivals, early outs, WFH — these override attendance penalties
                  </CardDescription>
                </div>
                <Button onClick={() => setIsExceptionOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Exception
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center text-muted-foreground py-8">Loading...</p>
              ) : exceptions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No exceptions added yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {exceptions.map(ex => {
                    const et = getExceptionType(ex.type)
                    const Icon = et.icon
                    const emp = ex.employees
                    return (
                      <div
                        key={ex.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-border/80"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-4 h-4 ${et.color}`} />
                          <div>
                            <p className="font-medium text-foreground">
                              {emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown'}{" "}
                              <span className={`text-xs ${et.color}`}>• {et.label}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(ex.exception_date)}
                              {ex.reason && ` — ${ex.reason}`}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteException(ex.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Exception Dialog */}
          <Dialog open={isExceptionOpen} onOpenChange={setIsExceptionOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Attendance Exception</DialogTitle>
                <DialogDescription>
                  Mark an approved leave, late arrival, or other exception for an employee
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddException} className="space-y-4">
                <div>
                  <Label htmlFor="exc_employee">Employee *</Label>
                  <select
                    id="exc_employee"
                    value={exceptionForm.employee_id}
                    onChange={e => setExceptionForm({ ...exceptionForm, employee_id: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                    required
                  >
                    <option value="">Select Employee</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.employee_id})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="exc_date">Date *</Label>
                  <Input
                    id="exc_date"
                    type="date"
                    value={exceptionForm.exception_date}
                    onChange={e => setExceptionForm({ ...exceptionForm, exception_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="exc_type">Exception Type *</Label>
                  <Select
                    value={exceptionForm.type}
                    onValueChange={v => setExceptionForm({ ...exceptionForm, type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXCEPTION_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="exc_reason">Reason</Label>
                  <Input
                    id="exc_reason"
                    placeholder="e.g. Doctor appointment, family emergency"
                    value={exceptionForm.reason}
                    onChange={e => setExceptionForm({ ...exceptionForm, reason: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full">Add Exception</Button>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}
