"use client"

import Image from "next/image"
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
    <header className="bg-gradient-to-r from-purple-600 to-purple-700 text-white sticky top-0 z-50 border-b border-purple-800">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <Image src="/images/image.png" alt="OviTech Logo" width={32} height={32} className="h-8 w-auto" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">OviTech Salary Portal</h1>
              <p className="text-xs opacity-90">Employee Salary Management System</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right text-sm">
              <p className="font-semibold">{user?.full_name || user?.email}</p>
              <p className="opacity-75 text-xs capitalize">{user?.is_admin ? "Admin" : "Employee"}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-white border-white hover:bg-purple-700 bg-transparent"
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
