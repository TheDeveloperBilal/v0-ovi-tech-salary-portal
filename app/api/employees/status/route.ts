import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest, isAuthError } from "@/lib/api-auth"
import { setEmployeeStatusSchema, parseBody } from "@/lib/validations"

// About 100 years: effectively permanent until the employee is reactivated
const PERMANENT_BAN = "876000h"

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, 'admin')
    if (isAuthError(auth)) return auth.response
    const { supabase, user } = auth

    const body = await request.json()
    const parsed = parseBody(setEmployeeStatusSchema, body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }
    const { employee_id, active } = parsed.data
    const leftOn = parsed.data.active ? null : parsed.data.left_on

    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("id, user_id, email, first_name, last_name, is_active")
      .eq("id", employee_id)
      .single()
    if (empError || !employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    let authUserId: string | null = employee.user_id
    if (!authUserId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", employee.email)
        .maybeSingle()
      authUserId = profile?.id ?? null
    }

    if (!active && authUserId) {
      if (authUserId === user.id) {
        return NextResponse.json({ error: "You cannot deactivate your own account" }, { status: 400 })
      }
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", authUserId).maybeSingle()
      if (profile?.is_admin) {
        return NextResponse.json({ error: "Admin accounts cannot be deactivated here. Change the role first." }, { status: 400 })
      }
    }

    if (authUserId) {
      const { error: banError } = await supabase.auth.admin.updateUserById(authUserId, {
        ban_duration: active ? "none" : PERMANENT_BAN,
      })
      if (banError) {
        console.error("Login status update failed:", banError)
        return NextResponse.json({ error: "Failed to update login access" }, { status: 500 })
      }
    }

    const { error: updateError } = await supabase
      .from("employees")
      .update({ is_active: active, left_on: leftOn })
      .eq("id", employee_id)

    if (updateError) {
      if (authUserId) {
        await supabase.auth.admin.updateUserById(authUserId, { ban_duration: employee.is_active ? "none" : PERMANENT_BAN })
      }
      return NextResponse.json({ error: "Failed to update employee status" }, { status: 500 })
    }

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      user_email: user.email,
      action: active ? "reactivate_employee" : "deactivate_employee",
      entity_type: "employee",
      entity_id: employee_id,
      details: { name: `${employee.first_name} ${employee.last_name}`, left_on: leftOn, login_blocked: !active && !!authUserId },
    })

    return NextResponse.json({
      success: true,
      active,
      left_on: leftOn,
      login_blocked: !active && !!authUserId,
    })
  } catch (err) {
    console.error("Employee status error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
