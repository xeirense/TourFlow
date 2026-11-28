import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/supabase-middleware';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const supabase = createSupabaseMiddlewareClient(request, response);

  // getClaims() refreshes an expired session (rewriting the cookie) and
  // verifies the JWT signature — locally when the project uses asymmetric
  // signing keys, so most page loads skip a round trip to the Auth server.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims?.sub ? data.claims : null;

  const { pathname } = request.nextUrl;

  // Unauthenticated → redirect to login
  if (!user && (pathname.startsWith('/dashboard') || pathname.startsWith('/create'))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Already logged in → skip auth pages
  if (user && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/create/:path*',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
  ],
};
