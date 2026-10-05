import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest, isAuthError } from "@/lib/api-auth"
import { resetPasswordSchema, parseBody } from "@/lib/validations"

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, 'admin')
    if (isAuthError(auth)) return auth.response
    const { supabase } = auth

    const body = await request.json()
    const parsed = parseBody(resetPasswordSchema, body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const { employeeId, newPassword } = parsed.data

    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("email, first_name, last_name")
      .eq("id", employeeId)
      .single()

    if (empError || !employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    const { data: authUsers } = await supabase.auth.admin.listUsers()
    let authUser = authUsers?.users?.find(u => u.email === employee.email)

    if (!authUser) {
      const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
        email: employee.email,
        password: newPassword,
        email_confirm: true,
        user_metadata: { full_name: `${employee.first_name} ${employee.last_name}` },
      })

      if (createError) {
        return NextResponse.json({ error: 'Failed to create auth account' }, { status: 400 })
      }

      authUser = newAuthUser.user
    } else {
      await supabase.auth.admin.updateUserById(authUser.id, { password: newPassword })
    }

    return NextResponse.json(
      { message: "Password reset successfully", email: employee.email },
      { status: 200 },
    )
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
