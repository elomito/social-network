import { NextResponse } from 'next/server'

const AUTH_COOKIE_NAME = 'token'

const PROTECTED_PREFIXES = [
  '/feed',
  '/discover',
  '/groups',
  '/messages',
  '/notifications',
  '/post',
  '/profile',
]

const AUTH_ONLY_PATHS = ['/login', '/register']

export function middleware(request) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value
  const isAuthenticated = Boolean(token)

  const isProtectedRoute = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
  const isAuthOnlyRoute = AUTH_ONLY_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )

  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthOnlyRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/feed', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/feed/:path*',
    '/discover/:path*',
    '/groups/:path*',
    '/messages/:path*',
    '/notifications/:path*',
    '/post/:path*',
    '/profile/:path*',
    '/login',
    '/register',
  ],
}