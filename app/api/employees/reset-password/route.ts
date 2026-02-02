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

    console.log("[v0] Password reset API called for employee:", employeeId);

    const supabase = await createClient();

    // Get current user to verify they're an admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log("[v0] No authenticated user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    console.log("[v0] User is admin:", profile?.is_admin);

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
      console.log("[v0] Employee not found:", empError);
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    console.log("[v0] Found employee:", employee.email);

    if (!employee.user_id) {
      return NextResponse.json(
        { error: "Employee has no associated auth user" },
        { status: 400 }
      );
    }

    // Update the auth user's password using admin API
    try {
      console.log("[v0] Updating password for user:", employee.user_id);

      await supabase.auth.admin.updateUserById(employee.user_id, {
        password: newPassword,
      });

      console.log("[v0] Password reset successfully for employee:", employee.email);

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

