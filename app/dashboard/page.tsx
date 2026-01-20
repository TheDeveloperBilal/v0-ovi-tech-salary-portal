import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/header"
import { DashboardContent } from "@/components/dashboard-content"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get user profile to check if admin
  let profile = null
  try {
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()
    profile = data
  } catch (error) {
    // Profile table might not exist yet, continue with basic user info
    profile = {
      id: user.id,
      email: user.email,
      is_admin: false,
      full_name: user.email?.split("@")[0] || "User",
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={profile} />
      <main className="container mx-auto py-8 px-4">
        <DashboardContent user={profile} />
      </main>
    </div>
  )
}
