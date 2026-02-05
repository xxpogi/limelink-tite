import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

// Public routes that don't require authentication
const publicRoutes = [
  '/auth/login',
  '/auth/register',
  '/login',
  '/register',
  '/api/auth/login',
  '/api/auth/register',
  '/api/health',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }
  
  // Allow static files and API routes
  if (pathname.startsWith('/_next') || pathname.startsWith('/static') || pathname.startsWith('/favicon')) {
    return NextResponse.next()
  }
  
  // Check for session token
  const token = request.cookies.get('session')?.value
  
  if (!token) {
    // Redirect to login if no token
    const loginUrl = new URL('/auth/login', request.url)
    return NextResponse.redirect(loginUrl)
  }
  
  // Verify token is valid
  const session = await verifyToken(token)
  
  if (!session) {
    // Token is invalid, redirect to login
    const response = NextResponse.redirect(new URL('/auth/login', request.url))
    response.cookies.delete('session')
    return response
  }
  
  // User is authenticated, allow access
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
