import { auth } from '@/auth';
import { NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/signup'];

export default auth((req) => {
  const { nextUrl, auth: session } = req as typeof req & { auth: { error?: string } | null };
  const pathname = nextUrl.pathname;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Redirect authenticated users away from public pages
  if (session && isPublic) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl));
  }

  // Session expired — force re-login
  if (session?.error === 'RefreshTokenExpired') {
    const loginUrl = new URL('/login', nextUrl);
    loginUrl.searchParams.set('error', 'SessionExpired');
    return NextResponse.redirect(loginUrl);
  }

  // No session on a protected route — redirect to login
  if (!session && !isPublic) {
    return NextResponse.redirect(new URL('/login', nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all routes except:
     * - /api/auth/** (NextAuth internal routes)
     * - /_next/** (Next.js static files)
     * - /favicon.ico, /robots.txt, /sitemap.xml
     */
    '/((?!api/auth|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)',
  ],
};
