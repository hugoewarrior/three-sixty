import './global.css';
import type { Metadata } from 'next';
import NextAuthProvider from '@/components/auth/NextAuthProvider';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'Three Sixty News',
  description: 'AI-powered news dashboard for Panama',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <NextAuthProvider>
          <AuthProvider>{children}</AuthProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
