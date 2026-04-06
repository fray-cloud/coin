import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const isDemo = process.env.NEXT_PUBLIC_DEMO === 'true';

const PUBLIC_PATHS = ['/', '/login', '/signup', '/markets', '/demo'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pass pathname to layout via header
  const response = NextResponse.next();
  response.headers.set('x-pathname', pathname);

  // Demo mode: skip all auth, redirect login/signup to /demo
  if (isDemo) {
    if (pathname === '/login' || pathname === '/signup') {
      return NextResponse.redirect(new URL('/demo', request.url));
    }
    return response;
  }

  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/')) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico'
  ) {
    return response;
  }

  const accessToken = request.cookies.get('access_token');
  if (!accessToken) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
