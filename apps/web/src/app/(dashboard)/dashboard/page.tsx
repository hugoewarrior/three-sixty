'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient, type ArticlesResponse } from '@/lib/api-client';
import { NewsDashboard } from '@/components/news/NewsDashboard';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorBanner } from '@/components/ui/ErrorBanner';

export default function DashboardPage() {
  const { session, status } = useAuth();
  const [data, setData] = useState<ArticlesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;

    const token = session?.user?.accessToken ?? null;

    apiClient.news
      .getToday(token)
      .then(setData)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load news')
      )
      .finally(() => setLoading(false));
  }, [status, session?.user?.accessToken]);

  if (loading || status === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <ErrorBanner
          message={error}
          onRetry={() => {
            setError(null);
            setLoading(true);
            const token = session?.user?.accessToken ?? null;
            apiClient.news
              .getToday(token)
              .then(setData)
              .catch((err: unknown) =>
                setError(err instanceof Error ? err.message : 'Failed to load news')
              )
              .finally(() => setLoading(false));
          }}
        />
      </div>
    );
  }

  if (!data) return null;

  return <NewsDashboard data={data} />;
}
