'use client'

import React from "react"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('[v0] Checking authentication...')
        
        const { data: { session } } = await supabase.auth.getSession()
        console.log('[v0] Session status:', session ? 'Found' : 'Not found')
        
        if (session?.user) {
          console.log('[v0] User authenticated:', session.user.email)
          setIsAuthenticated(true)
          setIsLoading(false)
        } else {
          console.log('[v0] No session found, redirecting to login')
          router.push('/auth/login')
        }
      } catch (error) {
        console.log('[v0] Auth check error:', error)
        router.push('/auth/login')
      }
    }

    checkAuth()

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[v0] Auth state changed:', event, session?.user?.email)
      if (session?.user) {
        setIsAuthenticated(true)
      } else {
        setIsAuthenticated(false)
        router.push('/auth/login')
      }
      setIsLoading(false)
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [supabase, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
