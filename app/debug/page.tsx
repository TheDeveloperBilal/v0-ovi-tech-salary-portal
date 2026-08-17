import { notFound } from "next/navigation"

import DebugClient from "./debug-client"

// Debug page is development-only. In production it returns 404 unless
// ENABLE_DEBUG_PAGE=true is explicitly set in the server environment.
export default function DebugPage() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_DEBUG_PAGE !== "true"
  ) {
    notFound()
  }

  return <DebugClient />
}
