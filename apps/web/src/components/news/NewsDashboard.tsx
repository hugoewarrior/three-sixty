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
    const group = map.get(article.source) ?? [];
    group.push(article);
    map.set(article.source, group);
    return map;
  }, new Map<string, Article[]>());
}

export function NewsDashboard({ data }: { data: ArticlesResponse }) {
  const groups = groupBySource(data.articles);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Today&apos;s Headlines</h1>
        <p className="text-xs text-gray-400">
          Last updated: {formatTimestamp(data.updatedAt)}
        </p>
      </div>

      {Array.from(groups.entries()).map(([source, articles]) => (
        <section key={source} className="mb-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
            {source}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
