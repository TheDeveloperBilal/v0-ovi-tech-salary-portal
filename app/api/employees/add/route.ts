import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employee_id,
      first_name,
      last_name,
      email,
      phone,
      department,
      designation,
      date_of_joining,
      password,
      base_salary,
      income_tax,
    } = body;


    const supabase = await createClient();

    // With service role key, we can access auth admin functions directly
    // Get the current session from the Authorization header
    const authHeader = request.headers.get('authorization');
    let currentUser = null;

    if (authHeader?.startsWith('Bearer ')) {
      try {
        // Verify the token using the service role
        const { data: { user } } = await supabase.auth.getUser(authHeader.substring(7));
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
        { error: "Only admins can create employees" },
        { status: 403 }
      );
    }

    // Check if user already exists with this email

    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create auth account using admin.createUser (service role method)

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email for instant access
        user_metadata: {
          full_name: `${first_name} ${last_name}`,
        },
      });

      if (authError) {
        return NextResponse.json(
          { error: `Failed to create auth account: ${authError.message}` },
          { status: 400 }
        );
      }

      if (!authData.user?.id) {
        return NextResponse.json(
          { error: "Failed to create auth user" },
          { status: 400 }
        );
      }

      userId = authData.user.id;

      // Wait a moment for profile trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Create employee record with service role (bypass RLS for admin operations)

    const { data: empData, error: empError } = await supabase
      .from("employees")
      .insert([
        {
          employee_id,
          first_name,
          last_name,
          email,
          phone: phone || null,
          department: department || null,
          designation: designation || null,
          date_of_joining: date_of_joining || null,
          base_salary: base_salary ? parseFloat(base_salary) : 0,
          income_tax: income_tax ? parseFloat(income_tax) : 0,
          user_id: userId,
        },
      ])
      .select()
      .single();

    if (empError) {
      return NextResponse.json(
        { error: `Failed to create employee record: ${empError.message}` },
        { status: 400 }
      );
    }


    return NextResponse.json(
      {
        message: "Employee created successfully",
        employee: empData,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
