"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"
import { CheckCircle } from "lucide-react"

export default function SignUpSuccessPage() {
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
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="w-16 h-16 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-gray-900">Signup Successful!</CardTitle>
              <CardDescription className="text-base text-gray-600">Check your email to confirm your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 text-center">
                We&apos;ve sent a confirmation email to your address. Click the link in the email to activate your
                account.
              </p>
              <p className="text-sm text-gray-600 text-center">
                After confirming your email, you can login to your account and start using the salary portal.
              </p>
              <Link href="/auth/login" className="block">
                <Button className="w-full">Back to Login</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
