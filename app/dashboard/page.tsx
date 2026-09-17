'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Header } from "@/components/header"
import { Sidebar } from "@/components/sidebar"
import { DashboardContent } from "@/components/dashboard-content"

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeView, setActiveView] = useState('overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [pendingLeaves, setPendingLeaves] = useState(0)
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

        const basicProfile = {
          id: session.user.id,
          email: session.user.email,
          is_admin: false,
          full_name: session.user.email?.split("@")[0] || "User",
        }

        try {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single()

          if (profileData && typeof profileData === 'object') {
            const mergedProfile = { ...basicProfile, ...(profileData as Record<string, unknown>) }
            setProfile(mergedProfile)

            if ((mergedProfile as any).is_admin) {
              const { count } = await supabase
                .from("leave_requests")
                .select("*", { count: "exact", head: true })
                .eq("status", "pending")
              setPendingLeaves(count || 0)
            }
          } else {
            setProfile(basicProfile)
          }
        } catch (err) {
          setProfile(basicProfile)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard")
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const isAdmin = profile?.is_admin === true
  const userObj = profile || { full_name: "User", email: "", is_admin: false }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={userObj} />
        <main className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
          <DashboardContent user={userObj} activeView="employee" />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {error && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 fixed top-0 left-0 right-0 z-50">
          <p className="text-sm text-amber-400 text-center">Warning: {error}</p>
        </div>
      )}

      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        pendingLeaves={pendingLeaves}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <Header
        user={userObj}
        pendingLeaves={pendingLeaves}
        onLeaveClick={() => setActiveView('leave-requests')}
        sidebarCollapsed={sidebarCollapsed}
      />

      <main className={`
        transition-all duration-300 p-6
        ${sidebarCollapsed ? 'lg:pl-[96px]' : 'lg:pl-[284px]'}
      `}>
        <DashboardContent user={userObj} activeView={activeView} />
      </main>
    </div>
  )
}
