import { createClient as createSupabaseClient } from "@supabase/supabase-js"

let serverClient: ReturnType<typeof createSupabaseClient> | null = null

export async function createClient() {
  if (!serverClient) {
    serverClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )
  }
  return serverClient
}
