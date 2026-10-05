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

    const { id: slipId } = await params

    if (!slipId) {
      return NextResponse.json({ error: "Salary slip ID is required" }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from("salary_slips")
      .delete()
      .eq("id", slipId)

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete salary slip' }, { status: 400 })
    }

    return NextResponse.json({ message: "Salary slip deleted successfully" }, { status: 200 })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
