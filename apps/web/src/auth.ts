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
    accessTokenExpiresAt?: number;
    error?: string;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TOKEN_REFRESH_BUFFER_SECONDS = 60;

export function getCognitoLogoutUrl(logoutUri: string): string {
  const tokenEndpoint = process.env.AUTH_COGNITO_TOKEN_ENDPOINT ?? '';
  const logoutEndpoint = tokenEndpoint.replace('/oauth2/token', '/logout');
  const clientId = process.env.AUTH_COGNITO_CLIENT_ID ?? '';
  return `${logoutEndpoint}?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
}

async function refreshAccessToken(token: import('next-auth/jwt').JWT) {
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
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET, // Fallback logic
  providers: [
    Cognito({
      clientId: process.env.AUTH_COGNITO_CLIENT_ID,
      clientSecret: process.env.AUTH_COGNITO_CLIENT_SECRET,
      issuer: process.env.AUTH_COGNITO_ISSUER,
      authorization: { params: { scope: 'openid email phone' } },
    }),

    // Google and Facebook are included for NextAuth sign-in UI.
    // For JWKS validation on the API to work, configure these as federated
    // identity providers in your Cognito User Pool so that sign-ins through
    // them produce Cognito-issued access tokens.
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),

    Facebook({
      clientId: process.env.AUTH_FACEBOOK_ID,
      clientSecret: process.env.AUTH_FACEBOOK_SECRET,
      authorization: { params: { scope: 'email,public_profile' } },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },

  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
    newUser: '/signup',
  },

  callbacks: {
    async signIn({ account }) {
      return !!account?.providerAccountId;
    },

    async jwt({ token, user, account, trigger }) {
      // First sign-in — store the provider's access token directly.
      // For the Cognito provider this is a Cognito-signed JWT (RS256) verifiable
      // via JWKS. Google/Facebook tokens work the same way when those providers
      // are configured as Cognito federated identity providers.
      if (trigger === 'signIn' && account) {
        return {
          ...token,
          userId: token.sub ?? user?.id ?? '',
          accessToken: account.access_token ?? '',
          refreshToken: account.refresh_token ?? '',
          accessTokenExpiresAt: account.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
        };
      }

      // Subsequent calls — refresh via Cognito's token endpoint if near expiry
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
        },
        error: token.error,
      };
    },

    async redirect({ url, baseUrl }) {
      if (url === baseUrl || url === `${baseUrl}/`) return `${baseUrl}/dashboard`;
      if (url.startsWith(baseUrl)) return url;
      const tokenEndpoint = process.env.AUTH_COGNITO_TOKEN_ENDPOINT ?? '';
      const cognitoDomain = tokenEndpoint.replace('/oauth2/token', '');
      if (cognitoDomain && url.startsWith(cognitoDomain)) return url;
      return baseUrl;
    },
  },

  events: {
    async signOut() {},
  },
});
