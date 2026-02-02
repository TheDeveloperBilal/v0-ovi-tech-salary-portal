import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const employeeId = params.id;

    if (!employeeId) {
      return NextResponse.json(
        { error: "Employee ID is required" },
        { status: 400 }
      );
    }

    console.log("[v0] Deleting employee:", employeeId);

    const supabase = await createClient();

    // Get current user to verify they're an admin
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: "Only admins can delete employees" },
        { status: 403 }
      );
    }

    // Get employee to find their user ID for deletion
    const { data: employee, error: fetchError } = await supabase
      .from("employees")
      .select("user_id, email")
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

    // Delete the employee record first
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

    console.log("[v0] Employee record deleted");

    // Optionally delete the auth user as well
    if (employee.user_id) {
      try {
        await supabase.auth.admin.deleteUser(employee.user_id);
        console.log("[v0] Auth user deleted");
      } catch (authError) {
        console.log("[v0] Warning: Could not delete auth user (non-critical):", authError);
        // Don't fail the operation if auth deletion fails
      }
    }

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
