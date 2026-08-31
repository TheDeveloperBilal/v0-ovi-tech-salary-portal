"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

export function Header({ user }: { user: any }) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <header className="bg-slate-900/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-slate-900 font-bold text-lg">O</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">OviTech Payroll Portal</h1>
              <p className="text-xs text-slate-400">Employee Management System</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right text-sm">
              <p className="font-medium text-slate-200">{user?.full_name || user?.email || "User"}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.is_admin ? "Admin" : "Employee"}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
