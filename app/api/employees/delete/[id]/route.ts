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

    // Get employee info before deletion (need user_id to cascade auth delete)
    const { data: employee, error: fetchError } = await supabase
      .from("employees")
      .select("email, user_id")
      .eq("id", employeeId)
      .single();

    if (fetchError || !employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Delete the employee record
    const { error: deleteError } = await supabase
      .from("employees")
      .delete()
      .eq("id", employeeId);

    if (deleteError) {
      return NextResponse.json(
        { error: `Failed to delete employee: ${deleteError.message}` },
        { status: 400 }
      );
    }

    // Cascade: delete the Supabase Auth user so login is disabled and email is freed
    if (employee.user_id) {
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
        employee.user_id
      );
      if (authDeleteError) {
        console.error("Failed to delete auth user:", authDeleteError.message);
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
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
