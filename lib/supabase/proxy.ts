import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  // Simply pass through the request - authentication is handled client-side
  const response = NextResponse.next({
    request,
  })

  return response
}
