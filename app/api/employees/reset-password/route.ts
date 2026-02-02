import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { employeeId, newPassword } = await request.json();

    if (!employeeId || !newPassword) {
      return NextResponse.json(
        { error: "Employee ID and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user to verify they're an admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

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
        { error: "Only admins can reset employee passwords" },
        { status: 403 }
      );
    }

    // Get employee to find their auth user ID
    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("user_id, email")
      .eq("id", employeeId)
      .single();

    if (empError || !employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Update the auth user's password using admin API
    try {
      await supabase.auth.admin.updateUserById(employee.user_id, {
        password: newPassword,
      });

      console.log(
        "[v0] Password reset successfully for employee:",
        employee.email
      );

      return NextResponse.json(
        {
          message: "Password reset successfully",
          email: employee.email,
        },
        { status: 200 }
      );
    } catch (authError: any) {
      console.log("[v0] Auth update error:", authError);
      return NextResponse.json(
        { error: `Failed to reset password: ${authError.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.log("[v0] Error in password reset:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
