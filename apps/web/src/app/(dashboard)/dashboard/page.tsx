import { apiClient } from '@/lib/api-client';
import { NewsDashboard } from '@/components/news/NewsDashboard';

export default async function DashboardPage() {
  const data = await apiClient.news.getToday();
  return <NewsDashboard data={data} />;
}
