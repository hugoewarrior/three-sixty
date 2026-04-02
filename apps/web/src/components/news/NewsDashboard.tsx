import type { Article, ArticlesResponse } from '@/lib/api-client';
import { ArticleCard } from './ArticleCard';

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

export function NewsDashboard({ data }: { data: ArticlesResponse }) {
  const groups = groupBySource(data.articles);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-100">Today&apos;s Headlines</h1>
        <p className="text-xs text-gray-500">
          Last updated: {formatTimestamp(data.updatedAt)}
        </p>
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
