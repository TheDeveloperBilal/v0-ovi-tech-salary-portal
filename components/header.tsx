"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { LogOut, Sun, Moon, Bell } from "lucide-react"
import { useTheme } from "next-themes"

interface HeaderProps {
  user: any
  pendingLeaves?: number
  onLeaveClick?: () => void
  sidebarCollapsed?: boolean
}

export function Header({ user, pendingLeaves = 0, onLeaveClick, sidebarCollapsed = false }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()
  const isAdmin = user?.is_admin === true

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const initials = (user?.full_name || user?.email || 'U')
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase())
    .join('')

  return (
    <header
      className={`glass-header sticky top-0 z-30 transition-all duration-300 ${
        sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[260px]'
      }`}
    >
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left: Page title area */}
        <div className="pl-12 lg:pl-0">
          <h2 className="text-lg font-semibold text-foreground">
            Welcome back, {user?.full_name?.split(' ')[0] || 'User'}
          </h2>
          <p className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={onLeaveClick}
              className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {pendingLeaves > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[9px] font-bold bg-amber-500 text-white rounded-full">
                  {pendingLeaves}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" style={{ marginTop: '-20px' }} />
          </button>

          <div className="hidden sm:flex items-center gap-3 ml-2 pl-3 border-l border-border">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{user?.full_name || user?.email || "User"}</p>
              <p className="text-[11px] text-muted-foreground capitalize">{isAdmin ? "Admin" : "Employee"}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white text-xs font-bold shadow-md">
              {initials}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground ml-1"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
