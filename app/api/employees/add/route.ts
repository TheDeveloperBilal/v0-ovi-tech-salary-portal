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
    } = body;

    console.log("[v0] Creating employee via API:", { email, first_name, last_name });

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
        { error: "Only admins can create employees" },
        { status: 403 }
      );
    }

    // Create auth account
    console.log("[v0] Creating auth user for:", email);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
        data: {
          full_name: `${first_name} ${last_name}`,
        },
      },
    });

    if (authError) {
      console.log("[v0] Auth signup error:", authError);
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

    console.log("[v0] Auth user created:", authData.user.id);

    // Verify email immediately for instant access
    try {
      await supabase.auth.admin.updateUserById(authData.user.id, {
        email_confirmed_at: new Date().toISOString(),
      });
      console.log("[v0] Email auto-confirmed");
    } catch (confirmError) {
      console.log("[v0] Email confirmation error (non-critical):", confirmError);
    }

    // Wait a moment for profile trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Create employee record
    console.log("[v0] Creating employee record");

    const { data: empData, error: empError } = await supabase
      .from("employees")
      .insert([
        {
          user_id: authData.user.id,
          employee_id,
          first_name,
          last_name,
          email,
          phone: phone || null,
          department: department || null,
          designation: designation || null,
          date_of_joining: date_of_joining || null,
        },
      ])
      .select()
      .single();

    if (empError) {
      console.log("[v0] Employee creation error:", empError);
      return NextResponse.json(
        { error: `Failed to create employee record: ${empError.message}` },
        { status: 400 }
      );
    }

    console.log("[v0] Employee created successfully:", empData);

    return NextResponse.json(
      {
        message: "Employee created successfully",
        employee: empData,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.log("[v0] Error in add employee API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
