"use client"

export default function DebugClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto bg-card rounded-xl border border-border shadow-sm p-6">
        <h1 className="text-2xl font-bold mb-6 text-foreground">Debug Information</h1>

        <div className="space-y-4">
          <div className="p-4 border border-border rounded-lg">
            <h2 className="font-semibold mb-2 text-foreground">Environment Variables:</h2>
            <div className="space-y-2 text-sm font-mono">
              <p>
                <span className="font-bold text-foreground">NEXT_PUBLIC_SUPABASE_URL:</span>
                <br />
                {supabaseUrl ? (
                  <span className="text-purple-400">{supabaseUrl}</span>
                ) : (
                  <span className="text-red-400">NOT SET</span>
                )}
              </p>
              <p>
                <span className="font-bold text-foreground">NEXT_PUBLIC_SUPABASE_ANON_KEY:</span>
                <br />
                {supabaseKey ? (
                  <span className="text-purple-400">{supabaseKey.substring(0, 20)}...</span>
                ) : (
                  <span className="text-red-400">NOT SET</span>
                )}
              </p>
            </div>
          </div>

          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <h2 className="font-semibold mb-2 text-foreground">Instructions:</h2>
            <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
              <li>Check that you have set the environment variables in Vercel (if deployed)</li>
              <li>In v0 preview, check "Vars" section in left sidebar for environment variables</li>
              <li>Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set</li>
              <li>Try logging in again</li>
            </ol>
          </div>

          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <h2 className="font-semibold mb-2 text-foreground">If login still doesn&apos;t work:</h2>
            <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
              <li>Open browser console (F12)</li>
              <li>Try to login</li>
              <li>Check the console logs for &quot;[v0]&quot; debug messages</li>
              <li>Look for error messages in the console</li>
              <li>Check Supabase dashboard for authentication logs</li>
            </ol>
          </div>
        </div>

        <div className="mt-6">
          <a href="/auth/login" className="text-purple-400 underline hover:text-purple-300">
            Back to Login
          </a>
        </div>
      </div>
    </div>
  )
}
