import type { Article, ArticlesResponse } from '@/lib/api-client';
import { ArticleCard } from './ArticleCard';
import { Spinner } from '@/components/ui/Spinner';

function formatTimestamp(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(iso));
}

function groupBySource(articles: Article[]): Map<string, Article[]> {
  return articles.reduce((map, article) => {
    const key = article.source.name;
    const group = map.get(key) ?? [];
    group.push(article);
    map.set(key, group);
    return map;
  }, new Map<string, Article[]>());
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
        <svg
          className="h-8 w-8 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-gray-200">No news for today yet</h2>
      <p className="mt-2 max-w-sm text-sm text-gray-500">
        Articles are collected throughout the day. Check back later or ask the AI agent about recent news.
      </p>
    </div>
  );
}

export function NewsDashboard({
  data,
  onRefresh,
  isRefreshing = false,
}: {
  data: ArticlesResponse;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  const groups = groupBySource(data.articles);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-100">Today&apos;s Headlines</h1>
        <div className="flex items-center gap-3">
          <p className="text-xs text-gray-500">
            Last updated: {formatTimestamp(data.updatedAt)}
          </p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Refresh news"
              className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-300 transition hover:border-gray-500 hover:text-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRefreshing ? (
                <Spinner size="sm" />
              ) : (
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              )}
              Refresh
            </button>
          )}
        </div>
      </div>

      {groups.size === 0 ? (
        <EmptyState />
      ) : (
        Array.from(groups.entries()).map(([source, articles]) => (
          <section key={source} className="mb-10">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
              {source}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
