'use client';

import { createContext, useContext, useCallback } from 'react';
import { useSession, signOut as nextAuthSignOut } from 'next-auth/react';
import type { Session } from 'next-auth';

interface AuthContextValue {
  session: Session | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  status: 'loading',
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  const signOut = useCallback(async () => {
    // Clear the NextAuth session first (without browser redirect)
    await nextAuthSignOut({ redirect: false });

    // Then redirect the browser to Cognito's logout endpoint so the Cognito
    // SSO session is also invalidated. Cognito will redirect back to the
    // logout_uri after it clears its own session.
    const logoutUri = encodeURIComponent(window.location.origin + '/login');
    const tokenEndpoint = process.env.NEXT_PUBLIC_COGNITO_TOKEN_ENDPOINT ?? '';
    const logoutEndpoint = tokenEndpoint.replace('/oauth2/token', '/logout');
    const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? '';

    if (logoutEndpoint && clientId) {
      window.location.href = `${logoutEndpoint}?client_id=${clientId}&logout_uri=${logoutUri}`;
    } else {
      window.location.href = '/login';
    }
  }, []);

  return (
    <AuthContext.Provider value={{ session, status, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
