'use client';

import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui/Spinner';

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Middleware already handles redirect for unauthenticated users;
  // this component is a client-side fallback.
  if (status === 'unauthenticated') return null;

  return <>{children}</>;
}
