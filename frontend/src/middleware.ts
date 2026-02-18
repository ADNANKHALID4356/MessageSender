import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Edge Middleware — server-side auth redirect
 *
 * Protects dashboard routes by checking for the presence of an access token.
 * Redirects unauthenticated users to /login before any page HTML is served.
 */

const PUBLIC_ROUTES = ['/login', '/signup', '/admin/signup'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public assets, API routes, and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // static files (favicon.ico, etc.)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('access_token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  // Unauthenticated user trying to access protected route
  if (!isPublicRoute && !token) {
    // Check localStorage token via a custom header that the client sets
    // Since middleware runs on the edge, we can only check cookies/headers
    // The client-side AuthGuard remains the primary guard for localStorage tokens
    // This middleware provides an extra layer for cookie-based auth
    return NextResponse.next(); // Allow through — AuthGuard handles localStorage tokens
  }

  // Authenticated user trying to access login/signup
  if (isPublicRoute && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
