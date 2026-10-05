import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest, isAuthError } from "@/lib/api-auth"
import { addEmployeeSchema, parseBody } from "@/lib/validations"

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, 'admin')
    if (isAuthError(auth)) return auth.response
    const { supabase } = auth

    const body = await request.json()
    const parsed = parseBody(addEmployeeSchema, body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const {
      employee_id, first_name, last_name, email, phone,
      department, designation, date_of_joining, password,
      base_salary, income_tax,
    } = parsed.data

    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === email)

    let userId: string

    if (existingUser) {
      userId = existingUser.id
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, { password })
      if (updateError) {
        return NextResponse.json({ error: 'Failed to update auth credentials' }, { status: 400 })
      }
    } else {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: `${first_name} ${last_name}` },
      })

      if (authError) {
        return NextResponse.json({ error: 'Failed to create auth account' }, { status: 400 })
      }

      if (!authData.user?.id) {
        return NextResponse.json({ error: "Failed to create auth user" }, { status: 400 })
      }

      userId = authData.user.id
      await new Promise(resolve => setTimeout(resolve, 1500))
    }

    const { data: empData, error: empError } = await supabase
      .from("employees")
      .insert([{
        employee_id,
        first_name,
        last_name,
        email,
        phone: phone || null,
        department: department || null,
        designation: designation || null,
        date_of_joining: date_of_joining || null,
        base_salary: base_salary ? parseFloat(String(base_salary)) : 0,
        income_tax: income_tax ? parseFloat(String(income_tax)) : 0,
        user_id: userId,
      }])
      .select()
      .single()

    if (empError) {
      return NextResponse.json({ error: 'Failed to create employee record' }, { status: 400 })
    }

    return NextResponse.json(
      { message: "Employee created successfully", employee: empData },
      { status: 201 },
    )
  } catch (error) {
    console.error('Add employee error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
