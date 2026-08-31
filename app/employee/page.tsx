import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { EmployeeDashboard } from "@/components/employee-dashboard"

export const dynamic = 'force-dynamic'

export default async function EmployeePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white">My Salary Slips</h1>
            <p className="text-xs sm:text-sm text-slate-400 truncate">{user.email}</p>
          </div>
          <form
            action={async () => {
              "use server"
              const supabase = await createClient()
              await supabase.auth.signOut()
              redirect("/auth/login")
            }}
          >
            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2 border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 rounded-md text-sm font-medium transition-all"
            >
              Logout
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <EmployeeDashboard userId={user.id} />
      </main>
    </div>
  )
}
