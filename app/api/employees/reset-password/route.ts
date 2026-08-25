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
        { error: "Only admins can reset employee passwords" },
        { status: 403 }
      );
    }

    // Get employee info 
    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("email, first_name, last_name")
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

      // Get the user by email from auth
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      let authUser = authUsers?.users?.find(u => u.email === employee.email);

      // If auth user doesn't exist, create one with a temporary password
      if (!authUser) {

        const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
          email: employee.email,
          password: newPassword,
          email_confirm: true,
          user_metadata: {
            full_name: `${employee.first_name} ${employee.last_name}`,
          },
        });

        if (createError) {
          return NextResponse.json(
            { error: `Failed to create auth account: ${createError.message}` },
            { status: 400 }
          );
        }

        authUser = newAuthUser.user;
      } else {
        // Update existing auth user's password
        await supabase.auth.admin.updateUserById(authUser.id, {
          password: newPassword,
        });
      }


      return NextResponse.json(
        {
          message: "Password reset successfully",
          email: employee.email,
        },
        { status: 200 }
      );
    } catch (authError: any) {
      return NextResponse.json(
        { error: `Failed to reset password: ${authError.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

