'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Header } from "@/components/header"
import { DashboardContent } from "@/components/dashboard-content"

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const fetchProfile = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()


        if (!session?.user) {
          router.push('/auth/login')
          return
        }


        // Create a basic profile from session
        const basicProfile = {
          id: session.user.id,
          email: session.user.email,
          is_admin: false,
          full_name: session.user.email?.split("@")[0] || "User",
        }

        // Try to fetch extended profile from database
        try {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single()

          if (profileData && typeof profileData === 'object') {
            setProfile({ ...basicProfile, ...(profileData as Record<string, unknown>) })
          } else {
            setProfile(basicProfile)
          }
        } catch (err) {
          setProfile(basicProfile)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard")
        // Still set a basic profile so dashboard can load
        setProfile({
          id: "",
          email: "user@example.com",
          is_admin: false,
          full_name: "User",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-4"></div>
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {error && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3">
          <p className="text-sm text-amber-400">Warning: {error}</p>
        </div>
      )}
      <Header user={profile || { full_name: "User", email: "", is_admin: false }} />
      <main className="flex-1 container mx-auto py-8 px-4">
        <DashboardContent user={profile || { full_name: "User", email: "", is_admin: false }} />
      </main>
    </div>
  )
}
