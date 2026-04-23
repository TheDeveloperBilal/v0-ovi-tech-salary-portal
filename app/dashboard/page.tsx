'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Header } from "@/components/header"
import { DashboardContent } from "@/components/dashboard-content"

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        console.log("[v0] Fetching user session...")
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.user) {
          console.log("[v0] No session found, redirecting to login")
          router.push('/auth/login')
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
          // Try to get employee data instead
          const { data: empData } = await supabase
            .from("employees")
            .select("first_name, last_name, email")
            .eq("email", session.user.email)
            .single()

          const defaultProfile = {
            id: session.user.id,
            email: session.user.email,
            is_admin: false,
            full_name: empData ? `${empData.first_name} ${empData.last_name}` : (session.user.email?.split("@")[0] || "User"),
          }
          setProfile(defaultProfile)
        } else {
          console.log("[v0] Profile loaded:", data)
          // If profile exists but no full_name, fetch from employee table
          if (!data.full_name || data.full_name === "") {
            const { data: empData } = await supabase
              .from("employees")
              .select("first_name, last_name")
              .eq("email", session.user.email)
              .single()

            if (empData) {
              data.full_name = `${empData.first_name} ${empData.last_name}`
            }
          }
          setProfile(data)
        }
      } catch (error) {
        console.log("[v0] Error fetching profile:", error)
        setProfile({
          id: "",
          email: "",
          is_admin: false,
          full_name: "User",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [supabase, router])

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
    <div className="min-h-screen bg-white">
      <Header user={profile} />
      <main className="container mx-auto py-8 px-4">
        <DashboardContent user={profile} />
      </main>
    </div>
  )
}
