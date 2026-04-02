'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';

export default function Navbar() {
  const { signOut } = useAuth();
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href
      ? 'text-blue-400 font-semibold'
      : 'text-gray-400 hover:text-gray-100 transition-colors';

  return (
    <header className="sticky top-0 z-40 border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-gray-100">
            <span className="text-xl">360</span>
            <span className="hidden sm:inline text-sm font-medium text-gray-500">Three Sixty News</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className={isActive('/dashboard')}>
              Dashboard
            </Link>
            <Link href="/agent" className={isActive('/agent')}>
              AI Agent
            </Link>
          </nav>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
