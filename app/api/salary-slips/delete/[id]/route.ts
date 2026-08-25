import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: slipId } = await params

    if (!slipId) {
      return NextResponse.json(
        { error: "Salary slip ID is required" },
        { status: 400 }
      )
    }


    const supabase = await createClient()

    // Extract auth token from Authorization header
    const authHeader = request.headers.get("authorization")
    let currentUser = null

    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7)
        const { data: { user } } = await supabase.auth.getUser(token)
        currentUser = user
      } catch (err) {
      }
    }

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", currentUser.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: "Only admins can delete salary slips" },
        { status: 403 }
      )
    }

    // Delete the salary slip
    const { error: deleteError } = await supabase
      .from("salary_slips")
      .delete()
      .eq("id", slipId)

    if (deleteError) {
      return NextResponse.json(
        { error: `Failed to delete salary slip: ${deleteError.message}` },
        { status: 400 }
      )
    }


    return NextResponse.json(
      { message: "Salary slip deleted successfully" },
      { status: 200 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
