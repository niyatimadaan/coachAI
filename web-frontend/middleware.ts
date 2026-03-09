import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if the path is protected (dashboard routes)
  const isProtectedRoute = pathname.startsWith('/dashboard')

  // For now, we'll check for a simple auth token in cookies
  // In production, you'd validate the JWT token here
  const authToken = request.cookies.get('auth_token')

  if (isProtectedRoute && !authToken) {
    // Redirect to login if accessing protected route without auth
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname === '/login' && authToken) {
    // Redirect to dashboard if already authenticated
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (pathname === '/signup' && authToken) {
    // Redirect to dashboard if already authenticated
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup'],
}
