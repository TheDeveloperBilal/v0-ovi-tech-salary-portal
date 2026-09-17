"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { LogOut, Sun, Moon, Bell } from "lucide-react"
import { useTheme } from "next-themes"

export function Header({ user }: { user: any }) {
  const router = useRouter()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()
  const [pendingLeaves, setPendingLeaves] = useState(0)
  const isAdmin = user?.is_admin === true

  useEffect(() => {
    if (!isAdmin) return
    supabase
      .from("leave_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .then(({ count }) => setPendingLeaves(count || 0))
  }, [isAdmin])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <header className="bg-background/80 backdrop-blur-xl border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">O</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">OviTech Payroll Portal</h1>
              <p className="text-xs text-muted-foreground">Employee Management System</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-sm hidden sm:block">
              <p className="font-medium text-foreground">{user?.full_name || user?.email || "User"}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.is_admin ? "Admin" : "Employee"}</p>
            </div>
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="relative text-muted-foreground hover:text-foreground"
                onClick={() => {
                  const el = document.querySelector('[data-tab-value="leave-requests"]') as HTMLButtonElement
                  el?.click()
                }}
              >
                <Bell className="h-4 w-4" />
                {pendingLeaves > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-amber-500 text-white rounded-full">
                    {pendingLeaves}
                  </span>
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="relative text-muted-foreground hover:text-foreground"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
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
