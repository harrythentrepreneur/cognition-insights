// Password-gated middleware — redirects to /login if no auth cookie
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { expectedAuthToken } from '@/lib/auth-token'

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/api/auth/verify']

export default async function middleware(req: NextRequest) {
  const url = new URL(req.url)
  const { pathname } = url

  // Allow public routes, static assets, and API routes (except protected ones)
  const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
  const isStaticAsset = pathname.startsWith('/_next') || pathname.startsWith('/logos') || pathname.startsWith('/favicon')

  if (isPublic || isStaticAsset) {
    return NextResponse.next()
  }

  // Allow the landing page (root) to be public
  if (pathname === '/') {
    return NextResponse.next()
  }

  // Check for auth cookie
  const authCookie = req.cookies.get('cognition-auth')

  const expected = await expectedAuthToken()
  if (!expected || !authCookie || authCookie.value !== expected) {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}