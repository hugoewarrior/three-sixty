import type { ArticlesResponse } from '@/lib/api-client';
import { NewsDashboard } from '@/components/news/NewsDashboard';

// Mock data — replace with real API call once backend is ready
async function getArticles(): Promise<ArticlesResponse> {
  return {
    updatedAt: new Date().toISOString(),
    articles: [
      {
        id: '1',
        headline: 'Panama Canal reaches record transit figures for Q1 2026',
        source: 'La Prensa',
        publishedAt: new Date(Date.now() - 3600_000).toISOString(),
        excerpt:
          'The Panama Canal Authority reported that transit numbers exceeded expectations in the first quarter, with revenues surpassing $1.2 billion.',
        url: '#',
        category: 'Economy',
      },
      {
        id: '2',
        headline: 'National Assembly debates new infrastructure spending bill',
        source: 'TVN Noticias',
        publishedAt: new Date(Date.now() - 7200_000).toISOString(),
        excerpt:
          'Lawmakers are set to vote this week on a multi-billion dollar infrastructure bill that would fund road repairs and hospital upgrades across the country.',
        url: '#',
        category: 'Politics',
      },
      {
        id: '3',
        headline: 'Panama ranked top destination for retirees in Latin America',
        source: 'La Estrella',
        publishedAt: new Date(Date.now() - 10800_000).toISOString(),
        excerpt:
          'A new international survey placed Panama at the top of its list for retirees citing affordable healthcare, stable currency, and quality of life.',
        url: '#',
        category: 'Lifestyle',
      },
      {
        id: '4',
        headline: 'Tech startups surge in Panama City innovation district',
        source: 'La Prensa',
        publishedAt: new Date(Date.now() - 14400_000).toISOString(),
        excerpt:
          'The City of Knowledge has seen a 30% increase in startup registrations, driven by fintech and healthtech entrepreneurs.',
        url: '#',
        category: 'Tech',
      },
      {
        id: '5',
        headline: 'Heavy rains forecast for Chiriquí province this weekend',
        source: 'TVN Noticias',
        publishedAt: new Date(Date.now() - 18000_000).toISOString(),
        excerpt:
          'ETESA issued a yellow alert for western Panama as a tropical trough brings sustained rainfall and the risk of localised flooding.',
        url: '#',
        category: 'Weather',
      },
    ],
  };
}

export default async function DashboardPage() {
  const data = await getArticles();
  return <NewsDashboard data={data} />;
}
