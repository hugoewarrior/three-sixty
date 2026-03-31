import Navbar from '@/components/layout/Navbar';
import SessionGuard from '@/components/auth/SessionGuard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SessionGuard />
      <Navbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
