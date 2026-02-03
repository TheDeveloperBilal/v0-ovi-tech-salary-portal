'use client'

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Header } from "@/components/header"
import { DashboardContent } from "@/components/dashboard-content"
import { ProtectedRoute } from "@/components/protected-route"

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        console.log("[v0] Fetching user session...")
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.user) {
          console.log("[v0] No session found")
          setIsLoading(false)
          return
        }

        console.log("[v0] Session found, fetching profile for:", session.user.email)

        // Try to fetch profile from database
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single()

        if (error) {
          console.log("[v0] Profile fetch error:", error.message)
          // Create default profile if not found
          const defaultProfile = {
            id: session.user.id,
            email: session.user.email,
            is_admin: false,
            full_name: session.user.email?.split("@")[0] || "User",
          }
          setProfile(defaultProfile)
        } else {
          console.log("[v0] Profile loaded:", data)
          setProfile(data)
        }
      } catch (error) {
        console.log("[v0] Error fetching profile:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [supabase])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white">
        {profile && <Header user={profile} />}
        <main className="container mx-auto py-8 px-4">
          {profile && <DashboardContent user={profile} />}
        </main>
      </div>
    </ProtectedRoute>
  )
}
