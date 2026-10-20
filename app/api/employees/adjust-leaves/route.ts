import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest, isAuthError } from "@/lib/api-auth"
import { adjustLeaveBalanceSchema, parseBody } from "@/lib/validations"

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, 'admin')
    if (isAuthError(auth)) return auth.response
    const { supabase } = auth

    const body = await request.json()
    const parsed = parseBody(adjustLeaveBalanceSchema, body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const { employee_id, adjustment, reason } = parsed.data

    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("id, first_name, last_name, leaves_taken")
      .eq("id", employee_id)
      .single()

    if (empError || !employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    const currentLeaves = employee.leaves_taken || 0
    const newLeavesTaken = Math.max(0, Math.min(14, currentLeaves + adjustment))

    const { error: updateError } = await supabase
      .from("employees")
      .update({ leaves_taken: newLeavesTaken })
      .eq("id", employee_id)

    if (updateError) {
      return NextResponse.json({ error: "Failed to update leave balance" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      previous: currentLeaves,
      adjustment,
      new_leaves_taken: newLeavesTaken,
      reason,
      employee_name: `${employee.first_name} ${employee.last_name}`,
    })
  } catch (err) {
    console.error("Adjust leaves error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
