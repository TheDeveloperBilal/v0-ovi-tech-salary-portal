import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest, isAuthError } from "@/lib/api-auth"

// Deleting an employee cascades to all of these. Only allow it when they are all empty
// (e.g. an employee added by mistake); otherwise the employee must be deactivated.
const HISTORY_TABLES = [
  "salary_slips",
  "attendance_records",
  "attendance_exceptions",
  "attendance_summary",
  "salary_history",
  "salary_structures",
  "leave_requests",
  "leave_adjustments",
  "policy_signatures",
]

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request, 'admin')
    if (isAuthError(auth)) return auth.response
    const { supabase } = auth

    const { id: employeeId } = await params

    if (!employeeId) {
      return NextResponse.json({ error: "Employee ID is required" }, { status: 400 })
    }

    const { data: employee, error: fetchError } = await supabase
      .from("employees")
      .select("email")
      .eq("id", employeeId)
      .single()

    if (fetchError || !employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    const counts = await Promise.all(HISTORY_TABLES.map(async (table) => {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq("employee_id", employeeId)
      if (error) throw error
      return count || 0
    }))

    if (counts.some(c => c > 0)) {
      return NextResponse.json(
        { error: "This employee has payroll, attendance or leave history and cannot be deleted. Use Deactivate instead." },
        { status: 409 },
      )
    }

    const { error: deleteError } = await supabase
      .from("employees")
      .delete()
      .eq("id", employeeId)

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete employee' }, { status: 400 })
    }

    return NextResponse.json(
      { message: "Employee deleted successfully", email: employee.email },
      { status: 200 },
    )
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
