import { NextResponse } from 'next/server'

export function middleware(request) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname

  // Define public paths that don't require authentication
  const isPublicPath = path === '/auth/login' || path === '/auth/register' || path === '/'

  // Check for session cookie
  const session = request.cookies.get('session_id')

  // If there's no session and the path is not public, redirect to login
  if (!session && !isPublicPath) {
    return NextResponse.redirect(new URL('/auth/login', request.nextUrl))
  }

  // If there's a session and the path is public, redirect to feed
  if (session && isPublicPath) {
    return NextResponse.redirect(new URL('/feed', request.nextUrl))
  }

  return NextResponse.next()
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
