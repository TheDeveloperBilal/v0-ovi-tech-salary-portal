import { redirect } from "next/navigation"

// Accounts are created by an admin (Add Employee); self sign-up is disabled.
export default function SignUpPage() {
  redirect("/auth/login")
}
