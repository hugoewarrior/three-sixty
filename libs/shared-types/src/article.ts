export interface ArticleSource {
  name: string;
  url: string;
  domain: string;
}

export interface ArticleSummary {
  id: string;
  title: string;
  excerpt: string;
  source: ArticleSource;
  url: string;
  publishedAt: string;
  hasAudio: boolean;
}

export interface Article extends ArticleSummary {
  body: string;
  author?: string;
  imageUrl?: string;
  audioUrl?: string;
  embeddingId?: string;
  tags: string[];
}
