"use client"

import type React from "react"

export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useRef } from "react"
import Image from "next/image"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const passwordRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    const password = passwordRef.current?.value || ""

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      if (!data.user) {
        throw new Error("Invalid credentials")
      }

      if (passwordRef.current) passwordRef.current.value = ""

      await new Promise(resolve => setTimeout(resolve, 1200))
      window.location.href = "/dashboard"
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Login failed"
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex justify-center mb-4">
            <div className="w-32 h-32 relative">
              <Image src="/ovitech-logo.png" alt="OviTech Logo" width={128} height={128} />
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-center">OviTech Salary Portal</CardTitle>
              <CardDescription className="text-center">Login to your account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@ovitech.co"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link href="/auth/forgot-password" className="text-xs text-purple-400 hover:text-purple-300 underline underline-offset-4">
                        Forgot password?
                      </Link>
                    </div>
                    <input
                      ref={passwordRef}
                      id="password"
                      type="password"
                      required
                      autoComplete="current-password"
                      className="bg-background border border-input text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 h-9 w-full min-w-0 rounded-md px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    />
                  </div>
                  {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  OviTech Global
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
