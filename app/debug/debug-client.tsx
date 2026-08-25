"use client"

export default function DebugClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Debug Information</h1>

        <div className="space-y-4">
          <div className="p-4 border border-gray-300 rounded">
            <h2 className="font-semibold mb-2">Environment Variables:</h2>
            <div className="space-y-2 text-sm font-mono">
              <p>
                <span className="font-bold">NEXT_PUBLIC_SUPABASE_URL:</span>
                <br />
                {supabaseUrl ? (
                  <span className="text-green-600">{supabaseUrl}</span>
                ) : (
                  <span className="text-red-600">NOT SET</span>
                )}
              </p>
              <p>
                <span className="font-bold">NEXT_PUBLIC_SUPABASE_ANON_KEY:</span>
                <br />
                {supabaseKey ? (
                  <span className="text-green-600">{supabaseKey.substring(0, 20)}...</span>
                ) : (
                  <span className="text-red-600">NOT SET</span>
                )}
              </p>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <h2 className="font-semibold mb-2">Instructions:</h2>
            <ol className="text-sm space-y-2 list-decimal list-inside">
              <li>Check that you have set the environment variables in Vercel (if deployed)</li>
              <li>In v0 preview, check &quot;Vars&quot; section in left sidebar for environment variables</li>
              <li>Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set</li>
              <li>Try logging in again</li>
            </ol>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
            <h2 className="font-semibold mb-2">If login still doesn&apos;t work:</h2>
            <ol className="text-sm space-y-2 list-decimal list-inside">
              <li>Open browser console (F12)</li>
              <li>Try to login</li>
              <li>Check the console logs for &quot;[v0]&quot; debug messages</li>
              <li>Look for error messages in the console</li>
              <li>Check Supabase dashboard for authentication logs</li>
            </ol>
          </div>
        </div>

        <div className="mt-6">
          <a href="/auth/login" className="text-blue-600 underline">
            Back to Login
          </a>
        </div>
      </div>
    </div>
  )
}
