"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import Image from "next/image"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      console.log("[v0] Attempting login with email:", email)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        console.log("[v0] Login error:", error.message)
        throw error
      }
      
      if (!data.user) {
        console.log("[v0] No user data returned")
        throw new Error("Invalid credentials")
      }
      
      console.log("[v0] Login successful, user:", data.user.email)
      
      // Wait for session to be fully established and propagated
      await new Promise(resolve => setTimeout(resolve, 1200))
      
      console.log("[v0] Redirecting to dashboard")
      // Force a hard reload to ensure session is recognized
      window.location.href = "/dashboard"
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Login failed - check console for details"
      console.log("[v0] Error during login:", errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex justify-center mb-4">
            <div className="w-32 h-32 relative">
              <Image src="/images/image.png" alt="OviTech Logo" width={128} height={128} />
            </div>
          </div>
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl text-center text-gray-900">OviTech Salary Portal</CardTitle>
              <CardDescription className="text-center text-gray-600">Login to your account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="email" className="text-gray-900">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@ovitech.co"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="border border-gray-300 text-gray-900 placeholder-gray-500"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password" className="text-gray-900">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="border border-gray-300 text-gray-900 placeholder-gray-500"
                    />
                  </div>
                  {error && <p className="text-sm text-red-600 text-center">{error}</p>}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm text-gray-600">
                  Don&apos;t have an account?{" "}
                  <Link href="/auth/sign-up" className="text-gray-900 font-medium underline underline-offset-4">
                    Sign up
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
