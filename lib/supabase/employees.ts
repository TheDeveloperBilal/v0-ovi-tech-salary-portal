import { createClient } from "@/lib/supabase/client"

export async function fetchEmployees() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("employees")
    .select("id, first_name, last_name, employee_id")
    .order("first_name")

  if (error) {
    console.error("[v0] Error fetching employees:", error.message)
    return []
  }

  return data || []
}
