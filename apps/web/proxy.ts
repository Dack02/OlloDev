import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

const AUTH_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password', '/set-password'];

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname.includes(route));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth check for static assets and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Create a response we can modify (for cookie passthrough)
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Set on the request so intlMiddleware sees them
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          // Set on the response so the browser gets them
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Extract locale from path (e.g. /en/chat -> en)
  const localeMatch = pathname.match(/^\/([a-z]{2})(\/|$)/);
  const locale = localeMatch?.[1] || 'en';

  // Unauthenticated user trying to access a protected route
  if (!user && !isAuthRoute(pathname) && pathname !== '/') {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user trying to access an auth route (except set-password)
  if (user && isAuthRoute(pathname) && !pathname.includes('/set-password')) {
    const threadsUrl = new URL(`/${locale}/threads`, request.url);
    return NextResponse.redirect(threadsUrl);
  }

  // Pass through to intl middleware for locale handling
  const intlResponse = intlMiddleware(request);

  // Copy any auth cookies onto the intl response
  response.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value);
  });

  return intlResponse;
}

export const config = {
  matcher: ['/', '/(en|es|fr|de|pt|ja|zh|ko)/:path*'],
};
