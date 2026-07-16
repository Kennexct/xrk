'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { Avatar, PageLoader } from './ui';
import { NotificationBell } from './NotificationBell';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Beranda', icon: '🏠' },
  { href: '/videos', label: 'Video', icon: '🎬' },
  { href: '/music', label: 'Musik', icon: '🎵' },
  { href: '/news', label: 'Berita', icon: '📰' },
  { href: '/calendar', label: 'Kalender', icon: '📅' },
  { href: '/files', label: 'Folder', icon: '📁' },
  { href: '/members', label: 'Anggota', icon: '👥' },
  { href: '/admin', label: 'Admin', icon: '🛡️', adminOnly: true },
];

// Bottom nav shows the 5 most important destinations on mobile (master.md §4)
const MOBILE_NAV = ['/dashboard', '/videos', '/music', '/news', '/calendar'];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) return <PageLoader />;

  const items = NAV.filter((n) => !n.adminOnly || user.role === 'SUPER_ADMIN');
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const sidebar = (
    <nav className="flex h-full flex-col">
      <Link href="/dashboard" className="flex items-center gap-2 px-5 py-5">
        <span className="text-2xl" aria-hidden>🌻</span>
        <span className="font-semibold leading-tight">
          Sunflower
          <br />
          Youth Team
        </span>
      </Link>
      <ul className="flex-1 space-y-1 px-3">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive(item.href) ? 'bg-sun-100 text-sun-900' : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="border-t border-neutral-200 p-3">
        <Link
          href="/profile"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-neutral-100"
        >
          <Avatar name={user.name} src={user.avatarUrl} online />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{user.name}</span>
            <span className="block truncate text-xs text-neutral-500">{user.division ?? user.email}</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => logout().then(() => router.replace('/login'))}
          className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-500 hover:bg-neutral-100"
        >
          Keluar
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-dvh">
      {/* Fixed sidebar ≥1280px; drawer on tablet (master.md §4) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-neutral-200 bg-white xl:block">
        {sidebar}
      </aside>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 xl:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className="xl:pl-64">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur">
          <button
            type="button"
            className="rounded-lg p-2 hover:bg-neutral-100 xl:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Buka menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold xl:hidden">
            <span aria-hidden>🌻</span> SYT Platform
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell />
            <Link href="/profile" className="rounded-full p-1 hover:bg-neutral-100" aria-label="Profil">
              <Avatar name={user.name} src={user.avatarUrl} size={30} />
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 xl:pb-10">{children}</main>
      </div>

      {/* Bottom navigation ≤767px (master.md §4) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white md:hidden">
        <ul className="flex">
          {items
            .filter((i) => MOBILE_NAV.includes(i.href))
            .map((item) => (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${
                    isActive(item.href) ? 'text-sun-700' : 'text-neutral-500'
                  }`}
                >
                  <span className="text-lg" aria-hidden>{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
        </ul>
      </nav>
    </div>
  );
}
