"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useState, useEffect } from "react"
import Image from "next/image"
import { CheckCircle } from "lucide-react"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true)
      }
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    const supabase = createClient()
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setDone(true)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to update password"
      setError(msg)
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
              <CardTitle className="text-2xl text-center">New Password</CardTitle>
              <CardDescription className="text-center">
                {done ? "Password updated" : "Choose a new password for your account"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {done ? (
                <div className="flex flex-col items-center gap-4 py-4">
                  <CheckCircle className="w-12 h-12 text-emerald-400" />
                  <p className="text-sm text-muted-foreground text-center">
                    Your password has been updated. You can now log in with your new password.
                  </p>
                  <Link href="/auth/login">
                    <Button className="mt-2">Go to Login</Button>
                  </Link>
                </div>
              ) : !sessionReady ? (
                <div className="flex flex-col items-center gap-4 py-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Verifying your reset link...
                  </p>
                  <p className="text-xs text-muted-foreground text-center">
                    If this takes too long, the link may have expired.{" "}
                    <Link href="/auth/forgot-password" className="text-purple-400 underline underline-offset-4 hover:text-purple-300">
                      Request a new one
                    </Link>
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="flex flex-col gap-6">
                    <div className="grid gap-2">
                      <Label htmlFor="password">New Password</Label>
                      <Input
                        id="password"
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="confirm">Confirm Password</Label>
                      <Input
                        id="confirm"
                        type="password"
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                    {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Updating..." : "Update Password"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
