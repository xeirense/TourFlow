import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/supabase-middleware';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const supabase = createSupabaseMiddlewareClient(request, response);

  // Always call getUser() to refresh the JWT cookie
  const { data: { user } } = await supabase.auth.getUser();

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
  ],
};
