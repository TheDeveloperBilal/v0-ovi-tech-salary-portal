import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employeeId } = await params;

    if (!employeeId) {
      return NextResponse.json(
        { error: "Employee ID is required" },
        { status: 400 }
      );
    }

    console.log("[v0] Deleting employee:", employeeId);

    const supabase = await createClient();

    // Extract auth token from Authorization header for proper session context
    const authHeader = request.headers.get('authorization');
    let currentUser = null;

    if (authHeader?.startsWith('Bearer ')) {
      try {
        // Verify the token using the service role
        const token = authHeader.substring(7);
        const { data: { user } } = await supabase.auth.getUser(token);
        currentUser = user;
      } catch (err) {
        console.log("[v0] Token verification failed:", err);
      }
    }

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", currentUser.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: "Only admins can delete employees" },
        { status: 403 }
      );
    }

    // Get employee info before deletion
    const { data: employee, error: fetchError } = await supabase
      .from("employees")
      .select("email")
      .eq("id", employeeId)
      .single();

    if (fetchError || !employee) {
      console.log("[v0] Employee not found:", fetchError);
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    console.log("[v0] Found employee:", employee.email);

    // Delete the employee record
    const { error: deleteError } = await supabase
      .from("employees")
      .delete()
      .eq("id", employeeId);

    if (deleteError) {
      console.log("[v0] Error deleting employee record:", deleteError);
      return NextResponse.json(
        { error: `Failed to delete employee: ${deleteError.message}` },
        { status: 400 }
      );
    }

    console.log("[v0] Employee record deleted successfully");

    return NextResponse.json(
      {
        message: "Employee deleted successfully",
        email: employee.email,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.log("[v0] Error in delete employee API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
