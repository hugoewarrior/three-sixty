import NextAuth, { type DefaultSession } from 'next-auth';
import Cognito from 'next-auth/providers/cognito';
import Google from 'next-auth/providers/google';
import Facebook from 'next-auth/providers/facebook';

// ---------------------------------------------------------------------------
// Module augmentation — extend built-in session/JWT types
// ---------------------------------------------------------------------------
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      accessToken: string;
      provider: string;
      error?: string;
    } & DefaultSession['user'];
    error?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    accessToken?: string;
    provider?: string;
    accessTokenExpiresAt?: number;
    error?: string;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const TOKEN_REFRESH_BUFFER_SECONDS = 60; // refresh 60s before expiry

async function refreshAccessToken(token: import('next-auth/jwt').JWT) {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: token.accessToken }),
    });
    if (!res.ok) throw new Error('Refresh failed');
    const data = (await res.json()) as { accessToken: string; expiresIn: number };
    return {
      ...token,
      accessToken: data.accessToken,
      accessTokenExpiresAt: Math.floor(Date.now() / 1000) + data.expiresIn,
      error: undefined,
    };
  } catch {
    return { ...token, error: 'RefreshTokenExpired' as const };
  }
}

// ---------------------------------------------------------------------------
// NextAuth config
// ---------------------------------------------------------------------------
export const { handlers, auth, signIn, signOut } = NextAuth({
  // ── Providers ────────────────────────────────────────────────────────────
  providers: [
    Cognito({
      clientId: process.env.AUTH_COGNITO_CLIENT_ID,
      clientSecret: process.env.AUTH_COGNITO_CLIENT_SECRET,
      issuer: process.env.AUTH_COGNITO_ISSUER,
    }),

    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),

    Facebook({
      clientId: process.env.AUTH_FACEBOOK_ID,
      clientSecret: process.env.AUTH_FACEBOOK_SECRET,
      authorization: {
        params: { scope: 'email,public_profile' },
      },
    }),
  ],

  // ── Session strategy ─────────────────────────────────────────────────────
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // ── Custom pages ─────────────────────────────────────────────────────────
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
    newUser: '/signup',
  },

  // ── Callbacks ────────────────────────────────────────────────────────────
  callbacks: {
    async signIn({ account }) {
      // All providers allowed — user sync handled in jwt callback
      return !!account?.providerAccountId;
    },

    async jwt({ token, user, account, trigger }) {
      // First sign-in — persist provider and tokens from the OAuth response
      if (trigger === 'signIn' && account) {
        // TODO: call POST /auth/oauth-sync to register or look up the user on
        // the backend and exchange for an internal accessToken. Example:
        //
        // const res = await fetch(`${API_URL}/auth/oauth-sync`, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({
        //     email: token.email,
        //     provider: account.provider,
        //     providerAccountId: account.providerAccountId,
        //     name: token.name,
        //     idToken: account.id_token,
        //   }),
        // });
        // if (res.ok) {
        //   const data = await res.json();
        //   return { ...token, userId: data.userId, accessToken: data.accessToken,
        //            provider: account.provider, accessTokenExpiresAt: ... };
        // }

        return {
          ...token,
          userId: user?.id ?? token.sub ?? '',
          accessToken: account.access_token ?? '',
          provider: account.provider,
          accessTokenExpiresAt: account.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
        };
      }

      // Subsequent calls — refresh if token is near expiry
      if (
        token.accessToken &&
        token.accessTokenExpiresAt &&
        Math.floor(Date.now() / 1000) > token.accessTokenExpiresAt - TOKEN_REFRESH_BUFFER_SECONDS
      ) {
        return refreshAccessToken(token);
      }

      return token;
    },

    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.userId ?? '',
          accessToken: token.accessToken ?? '',
          provider: token.provider ?? '',
        },
        error: token.error,
      };
    },

    async redirect({ url, baseUrl }) {
      // After sign-in → dashboard; after sign-out → /login
      if (url === baseUrl || url === `${baseUrl}/`) return `${baseUrl}/dashboard`;
      if (url.startsWith(baseUrl)) return url;
      // Block external redirects
      return baseUrl;
    },
  },
});
