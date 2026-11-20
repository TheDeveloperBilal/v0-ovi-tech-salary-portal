import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest, isAuthError } from "@/lib/api-auth"
import { adjustLeaveBalanceSchema, parseBody } from "@/lib/validations"
import { currentLeaveYear } from "@/lib/leave-rules"

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, 'admin')
    if (isAuthError(auth)) return auth.response
    const { supabase, user } = auth

    const body = await request.json()
    const parsed = parseBody(adjustLeaveBalanceSchema, body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const { employee_id, adjustment, reason } = parsed.data
    if (adjustment === 0) {
      return NextResponse.json({ error: "Adjustment cannot be zero" }, { status: 400 })
    }

    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("id, first_name, last_name")
      .eq("id", employee_id)
      .single()

    if (empError || !employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    const year = currentLeaveYear()
    const { data: usedBefore, error: usedError } = await supabase.rpc("leaves_used", { p_employee: employee_id, p_year: year })
    if (usedError) {
      return NextResponse.json({ error: "Failed to read leave balance" }, { status: 500 })
    }
    const previous = Number(usedBefore || 0)

    if (previous + adjustment < 0) {
      return NextResponse.json({ error: `Can give back at most ${previous} day(s) for ${year}` }, { status: 400 })
    }

    const { error: insertError } = await supabase.from("leave_adjustments").insert({
      employee_id,
      year,
      days: adjustment,
      reason,
      created_by: user.id,
    })
    if (insertError) {
      return NextResponse.json({ error: "Failed to save adjustment" }, { status: 500 })
    }

    const { error: recalcError } = await supabase.rpc("recalc_leaves_taken", { p_employee: employee_id })
    if (recalcError) {
      return NextResponse.json({ error: "Adjustment saved but balance refresh failed" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      previous,
      adjustment,
      new_leaves_taken: previous + adjustment,
      reason,
      employee_name: `${employee.first_name} ${employee.last_name}`,
    })
  } catch (err) {
    console.error("Adjust leaves error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
