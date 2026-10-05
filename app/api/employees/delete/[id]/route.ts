import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest, isAuthError } from "@/lib/api-auth"

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
