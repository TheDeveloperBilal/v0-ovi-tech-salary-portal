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
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/ovitech-logo.webp" alt="OviTech Logo" width={40} height={40} className="h-10 w-10" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">OviTech Payroll Portal</h1>
              <p className="text-xs text-gray-500">Employee Management System</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right text-sm">
              <p className="font-medium text-gray-900">{user?.full_name || user?.email}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.is_admin ? "Admin" : "Employee"}</p>
            </div>
            <Button
              variant="default"
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
