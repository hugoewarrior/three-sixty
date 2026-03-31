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
    await nextAuthSignOut({ callbackUrl: '/login' });
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
