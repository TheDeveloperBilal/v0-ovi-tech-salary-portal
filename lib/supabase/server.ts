import { createClient as createSupabaseClient } from "@supabase/supabase-js"

/**
 * Creates a fresh Supabase client with the service-role key for every call.
 *
 * Why no singleton? In a serverless / edge environment each incoming request
 * can land in the same long-lived process. A cached client keeps stale auth
 * state from a previous request, which caused the "unauthorized" bug when
 * adding employees. Creating a new client per request is cheap and correct.
 *
 * The service-role key is REQUIRED — if it's missing the function throws
 * immediately instead of silently falling back to the anon key (which would
 * fail on any admin operation and produce a confusing "unauthorized" error).
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is not set. Add it to .env.local or Vercel env vars."
    )
  }

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local or Vercel env vars. " +
      "This key is required for admin operations (creating users, bypassing RLS)."
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createSupabaseClient<any>(url, serviceRoleKey)
}
