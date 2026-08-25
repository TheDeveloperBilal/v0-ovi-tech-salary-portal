import { createBrowserClient } from "@supabase/ssr"

/**
 * Browser-side Supabase client using @supabase/ssr.
 *
 * createBrowserClient stores auth tokens in cookies (not localStorage),
 * which lets Next.js middleware read the session for route protection.
 * The API surface is identical to the old createClient — no component
 * changes needed.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (url && key) {
    return createBrowserClient(url, key)
  }

  // Mock client for build-time — won't be used in the actual browser
  return createBrowserClient(
    'https://placeholder.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'
  )
}
