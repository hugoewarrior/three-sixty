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
    refreshToken?: string;
    provider?: string;
    accessTokenExpiresAt?: number;
    error?: string;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TOKEN_REFRESH_BUFFER_SECONDS = 60;

/**
 * Returns the full Cognito logout URL.
 * After clearing the NextAuth session, redirect the browser here so Cognito
 * also invalidates its own SSO session.
 *
 * `logoutUri` must be listed in "Allowed sign-out URLs" in the AWS Console.
 */
export function getCognitoLogoutUrl(logoutUri: string): string {
  // Derive logout endpoint from token endpoint:
  // https://<domain>.auth.<region>.amazoncognito.com/oauth2/token
  // →  https://<domain>.auth.<region>.amazoncognito.com/logout
  const tokenEndpoint = process.env.AUTH_COGNITO_TOKEN_ENDPOINT ?? '';
  const logoutEndpoint = tokenEndpoint.replace('/oauth2/token', '/logout');
  const clientId = process.env.AUTH_COGNITO_CLIENT_ID ?? '';
  return `${logoutEndpoint}?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
}

async function refreshAccessToken(token: import('next-auth/jwt').JWT) {
  // Use Cognito's token endpoint directly via the standard OAuth2 refresh flow.
  // AUTH_COGNITO_TOKEN_ENDPOINT = https://<domain>.auth.<region>.amazoncognito.com/oauth2/token
  const tokenEndpoint = process.env.AUTH_COGNITO_TOKEN_ENDPOINT ?? '';
  const clientId = process.env.AUTH_COGNITO_CLIENT_ID ?? '';
  const clientSecret = process.env.AUTH_COGNITO_CLIENT_SECRET ?? '';

  try {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: token.refreshToken ?? '',
    });

    const res = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // Cognito requires Basic auth when the app client has a secret
        ...(clientSecret && {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        }),
      },
      body,
    });

    if (!res.ok) throw new Error('Refresh failed');

    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };

    return {
      ...token,
      accessToken: data.access_token,
      accessTokenExpiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
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
      authorization: { params: { scope: 'openid email phone' } },
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
          refreshToken: account.refresh_token ?? '',
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
      if (url === baseUrl || url === `${baseUrl}/`) return `${baseUrl}/dashboard`;
      if (url.startsWith(baseUrl)) return url;
      // Allow Cognito's logout endpoint through so the browser can reach it
      const tokenEndpoint = process.env.AUTH_COGNITO_TOKEN_ENDPOINT ?? '';
      const cognitoDomain = tokenEndpoint.replace('/oauth2/token', '');
      if (cognitoDomain && url.startsWith(cognitoDomain)) return url;
      return baseUrl;
    },
  },

  // ── Events ───────────────────────────────────────────────────────────────
  events: {
    async signOut() {
      // Server-side hook — runs whenever a session is terminated.
      // The actual redirect to Cognito's logout endpoint must be triggered
      // client-side via getCognitoLogoutUrl() because a server event cannot
      // redirect the browser.
    },
  },
});
