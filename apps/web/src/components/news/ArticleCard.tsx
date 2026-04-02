import Link from 'next/link';
import type { Article } from '@/lib/api-client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

function formatTime(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso));
}

export function ArticleCard({ article }: { article: Article }) {
  return (
    <article className="flex flex-col gap-3 rounded-xl bg-gray-900 p-5 ring-1 ring-gray-800 transition hover:ring-gray-700">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {article.sourceLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.sourceLogo}
              alt={article.source}
              className="h-5 w-5 rounded-full object-cover"
            />
          )}
          <span className="text-xs font-medium text-gray-400">{article.source}</span>
        </div>
        <time className="text-xs text-gray-500" dateTime={article.publishedAt}>
          {formatTime(article.publishedAt)}
        </time>
      </div>

      {article.category && (
        <Badge variant="blue">{article.category}</Badge>
      )}

      <h2 className="text-sm font-semibold leading-snug text-gray-100 line-clamp-3">
        {article.headline}
      </h2>

      <p className="text-xs leading-relaxed text-gray-400 line-clamp-2">
        {article.excerpt}
      </p>

      <div className="mt-auto flex items-center gap-2 pt-2">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-center text-xs font-medium text-blue-400 hover:underline"
        >
          Read full article ↗
        </a>
        <Link href={`/agent?articleId=${article.id}`}>
          <Button variant="secondary" size="sm">
            Summarize with AI
          </Button>
        </Link>
      </div>
    </article>
  );
}
