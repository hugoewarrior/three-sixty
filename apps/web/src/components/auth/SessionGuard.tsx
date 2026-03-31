'use client';

import { useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SessionGuard() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session?.error === 'RefreshTokenExpired') {
      void signOut({ callbackUrl: '/login?error=SessionExpired' });
    }
  }, [session, router]);

  return null;
}
