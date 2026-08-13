'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { Avatar, PageLoader } from './ui';
import { NotificationBell } from './NotificationBell';
import {
  IconSunflower,
  IconHome,
  IconVideo,
  IconMusic,
  IconNews,
  IconCalendar,
  IconFolder,
  IconUsers,
  IconShield,
  IconLogOut,
  IconMenu,
  type IconProps,
} from './Icons';

interface NavItem {
  href: string;
  label: string;
  Icon: ComponentType<IconProps>;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Beranda', Icon: IconHome },
  { href: '/videos', label: 'Video', Icon: IconVideo },
  { href: '/music', label: 'Musik', Icon: IconMusic },
  { href: '/news', label: 'Berita', Icon: IconNews },
  { href: '/calendar', label: 'Kalender', Icon: IconCalendar },
  { href: '/files', label: 'Folder', Icon: IconFolder },
  { href: '/members', label: 'Anggota', Icon: IconUsers },
  { href: '/admin', label: 'Admin', Icon: IconShield, adminOnly: true },
];

// Bottom nav shows the 5 most important destinations on mobile
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
      <Link href="/dashboard" className="flex items-center gap-3 px-5 py-5 group">
        <IconSunflower size={32} className="transition-transform group-hover:scale-105" />
        <span className="font-bold text-neutral-900 leading-tight text-base tracking-tight">
          Sunflower
          <br />
          <span className="text-sun-600 font-extrabold">Youth Team</span>
        </span>
      </Link>
      <ul className="flex-1 space-y-1 px-3 mt-2">
        {items.map((item) => {
          const active = isActive(item.href);
          const Icon = item.Icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  active
                    ? 'bg-sun-500 text-white shadow-md shadow-sun-500/20'
                    : 'text-neutral-600 hover:bg-neutral-100/80 hover:text-neutral-900'
                }`}
              >
                <Icon size={20} className={active ? 'text-white' : 'text-neutral-500 group-hover:text-neutral-700'} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-neutral-200/80 p-3 space-y-1 bg-neutral-50/50">
        <Link
          href="/profile"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-white hover:shadow-sm border border-transparent hover:border-neutral-200"
        >
          <Avatar name={user.name} src={user.avatarUrl} online />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-neutral-800">{user.name}</span>
            <span className="block truncate text-xs text-neutral-500">{user.division ?? user.email}</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => logout().then(() => router.replace('/login'))}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition"
        >
          <IconLogOut size={18} className="text-red-500" />
          Keluar
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-dvh bg-slate-50/60">
      {/* Fixed sidebar ≥1280px; drawer on tablet */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-neutral-200/80 bg-white/95 backdrop-blur-md xl:block">
        {sidebar}
      </aside>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 xl:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <div className="xl:pl-64">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-neutral-200/80 bg-white/90 px-4 py-3 backdrop-blur-md">
          <button
            type="button"
            className="rounded-xl p-2 text-neutral-600 hover:bg-neutral-100 xl:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Buka menu"
          >
            <IconMenu size={22} />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-neutral-900 xl:hidden">
            <IconSunflower size={26} />
            <span>SYT Platform</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
            <Link href="/profile" className="rounded-full p-1 transition hover:ring-2 hover:ring-sun-400" aria-label="Profil">
              <Avatar name={user.name} src={user.avatarUrl} size={32} />
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 xl:pb-10">{children}</main>
      </div>

      {/* Bottom navigation ≤767px */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200/80 bg-white/95 backdrop-blur-md md:hidden">
        <ul className="flex py-1">
          {items
            .filter((i) => MOBILE_NAV.includes(i.href))
            .map((item) => {
              const active = isActive(item.href);
              const Icon = item.Icon;
              return (
                <li key={item.href} className="flex-1">
                  <Link
                    href={item.href}
                    className={`flex flex-col items-center gap-1 py-1.5 text-[11px] font-medium transition ${
                      active ? 'text-sun-600 font-bold' : 'text-neutral-500 hover:text-neutral-800'
                    }`}
                  >
                    <Icon size={20} className={active ? 'text-sun-600' : 'text-neutral-500'} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
        </ul>
      </nav>
    </div>
  );
}
