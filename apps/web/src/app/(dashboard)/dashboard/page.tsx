'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient, type ArticlesResponse } from '@/lib/api-client';
import { NewsDashboard } from '@/components/news/NewsDashboard';
import { Spinner } from '@/components/ui/Spinner';
import { Snackbar, useSnackbar } from '@/components/ui/Snackbar';

export default function DashboardPage() {
  const { session, status } = useAuth();
  const [data, setData] = useState<ArticlesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { snackbar, show, dismiss } = useSnackbar();

  const fetchNews = useCallback((isRefresh = false) => {
    const token = session?.user?.accessToken ?? null;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    apiClient.news
      .getToday(token)
      .then(setData)
      .catch((err: unknown) =>
        show(err instanceof Error ? err.message : 'Failed to load news', {
          label: 'Retry',
          onClick: () => fetchNews(true),
        })
      )
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [session?.user?.accessToken, show]);

  useEffect(() => {
    if (status === 'loading') return;
    fetchNews();
  }, [status, fetchNews]);

  if (loading || status === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <>
      {data && (
        <NewsDashboard
          data={data}
          onRefresh={() => fetchNews(true)}
          isRefreshing={refreshing}
        />
      )}
      {snackbar && (
        <Snackbar
          message={snackbar.message}
          action={snackbar.action}
          onClose={dismiss}
        />
      )}
    </>
  );
}
