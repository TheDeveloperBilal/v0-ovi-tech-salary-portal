import { createClient as createSupabaseClient } from "@supabase/supabase-js"

let supabaseClient: ReturnType<typeof createSupabaseClient> | null = null

export function createClient() {
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Only create client if both URL and key are available
    // This prevents errors during static build
    if (url && key) {
      supabaseClient = createSupabaseClient(url, key)
    } else {
      // Return a mock client for build-time - it won't be used in browser
      supabaseClient = createSupabaseClient(
        'https://placeholder.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'
      )
    }
  }
  return supabaseClient
}
