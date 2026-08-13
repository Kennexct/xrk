'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
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
  IconSun,
  IconMoon,
  IconGlobe,
  IconSidebarCollapse,
  IconSidebarExpand,
  type IconProps,
} from './Icons';

interface NavItem {
  href: string;
  key: 'home' | 'videos' | 'music' | 'news' | 'calendar' | 'folders' | 'members' | 'admin';
  Icon: ComponentType<IconProps>;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: '/dashboard', key: 'home', Icon: IconHome },
  { href: '/videos', key: 'videos', Icon: IconVideo },
  { href: '/music', key: 'music', Icon: IconMusic },
  { href: '/news', key: 'news', Icon: IconNews },
  { href: '/calendar', key: 'calendar', Icon: IconCalendar },
  { href: '/files', key: 'folders', Icon: IconFolder },
  { href: '/members', key: 'members', Icon: IconUsers },
  { href: '/admin', key: 'admin', Icon: IconShield, adminOnly: true },
];

const MOBILE_NAV = ['/dashboard', '/videos', '/music', '/news', '/calendar'];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { theme, toggleTheme, lang, setLang, t, sidebarCollapsed, toggleSidebar } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) return <PageLoader />;

  const items = NAV.filter((n) => !n.adminOnly || user.role === 'SUPER_ADMIN');
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const sidebarContent = (
    <nav className="flex h-full flex-col">
      {/* Sidebar Header */}
      <div className={`flex items-center ${sidebarCollapsed ? 'justify-center py-5 px-2' : 'justify-between px-5 py-5'}`}>
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <IconSunflower size={sidebarCollapsed ? 32 : 30} className="transition-transform group-hover:scale-105" />
          {!sidebarCollapsed && (
            <span className="font-bold text-neutral-900 dark:text-neutral-100 leading-tight text-base tracking-tight">
              Sunflower
              <br />
              <span className="text-sun-500 font-extrabold">Youth Team</span>
            </span>
          )}
        </Link>
        {!sidebarCollapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            title={t.collapseSidebar}
            className="hidden xl:flex items-center justify-center p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition"
          >
            <IconSidebarCollapse size={18} />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {sidebarCollapsed && (
        <div className="hidden xl:flex justify-center mb-2 px-2">
          <button
            type="button"
            onClick={toggleSidebar}
            title={t.expandSidebar}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition"
          >
            <IconSidebarExpand size={20} />
          </button>
        </div>
      )}

      {/* Nav List */}
      <ul className="flex-1 space-y-1.5 px-3 mt-2">
        {items.map((item) => {
          const active = isActive(item.href);
          const Icon = item.Icon;
          const label = t[item.key];
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setMobileDrawerOpen(false)}
                title={sidebarCollapsed ? label : undefined}
                className={`flex items-center gap-3.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  sidebarCollapsed ? 'justify-center p-2.5' : 'px-3.5 py-2.5'
                } ${
                  active
                    ? 'bg-sun-500 text-neutral-950 font-bold shadow-md shadow-sun-500/20'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 hover:text-neutral-900 dark:hover:text-neutral-100'
                }`}
              >
                <Icon size={20} className={active ? 'text-neutral-950' : 'text-neutral-500 dark:text-neutral-400'} />
                {!sidebarCollapsed && <span>{label}</span>}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Sidebar Footer */}
      <div className="border-t border-neutral-200/80 dark:border-neutral-800 p-3 space-y-1.5 bg-neutral-50/50 dark:bg-neutral-900/50">
        <Link
          href="/profile"
          onClick={() => setMobileDrawerOpen(false)}
          title={sidebarCollapsed ? user.name : undefined}
          className={`flex items-center gap-3 rounded-xl p-2 transition hover:bg-white dark:hover:bg-neutral-800 hover:shadow-sm border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 ${
            sidebarCollapsed ? 'justify-center' : ''
          }`}
        >
          <Avatar name={user.name} src={user.avatarUrl} online size={sidebarCollapsed ? 32 : 36} />
          {!sidebarCollapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100">{user.name}</span>
              <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">{user.division ?? user.email}</span>
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={() => logout().then(() => router.replace('/login'))}
          title={sidebarCollapsed ? t.logout : undefined}
          className={`flex w-full items-center gap-2.5 rounded-xl py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition ${
            sidebarCollapsed ? 'justify-center px-0' : 'px-3'
          }`}
        >
          <IconLogOut size={18} className="text-red-500" />
          {!sidebarCollapsed && <span>{t.logout}</span>}
        </button>
      </div>
    </nav>
  );

  const mainPadding = sidebarCollapsed ? 'xl:pl-20' : 'xl:pl-64';

  return (
    <div className="min-h-dvh bg-slate-50/60 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      {/* Desktop Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-neutral-200/80 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md transition-all duration-300 xl:block ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-40 xl:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileDrawerOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white dark:bg-neutral-900 shadow-2xl">{sidebarContent}</aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className={`transition-all duration-300 ${mainPadding}`}>
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-neutral-200/80 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-xl p-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 xl:hidden"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Buka menu"
            >
              <IconMenu size={22} />
            </button>
            <Link href="/dashboard" className="flex items-center gap-2 font-bold text-neutral-900 dark:text-neutral-100 xl:hidden">
              <IconSunflower size={26} />
              <span>SYT Platform</span>
            </Link>

            {/* Desktop Collapse Toggle in Header */}
            <button
              type="button"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? t.expandSidebar : t.collapseSidebar}
              className="hidden xl:flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            >
              {sidebarCollapsed ? <IconSidebarExpand size={16} /> : <IconSidebarCollapse size={16} />}
              <span>{sidebarCollapsed ? t.expandSidebar : t.collapseSidebar}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <div className="flex items-center rounded-xl bg-neutral-100 dark:bg-neutral-800 p-0.5 border border-neutral-200/60 dark:border-neutral-700/60">
              <button
                type="button"
                onClick={() => setLang('id')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  lang === 'id'
                    ? 'bg-white dark:bg-neutral-700 text-sun-600 dark:text-sun-400 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                ID
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  lang === 'en'
                    ? 'bg-white dark:bg-neutral-700 text-sun-600 dark:text-sun-400 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                EN
              </button>
            </div>

            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'light' ? t.darkMode : t.lightMode}
              className="p-2 rounded-xl border border-neutral-200/80 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            >
              {theme === 'light' ? <IconMoon size={18} /> : <IconSun size={18} className="text-amber-400" />}
            </button>

            {/* Notification Bell */}
            <NotificationBell />

            {/* Profile Avatar */}
            <Link href="/profile" className="rounded-full p-1 transition hover:ring-2 hover:ring-sun-400" aria-label={t.profile}>
              <Avatar name={user.name} src={user.avatarUrl} size={32} />
            </Link>
          </div>
        </header>

        {/* Page Children */}
        <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 xl:pb-10">{children}</main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200/80 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md md:hidden">
        <ul className="flex py-1">
          {items
            .filter((i) => MOBILE_NAV.includes(i.href))
            .map((item) => {
              const active = isActive(item.href);
              const Icon = item.Icon;
              const label = t[item.key];
              return (
                <li key={item.href} className="flex-1">
                  <Link
                    href={item.href}
                    className={`flex flex-col items-center gap-1 py-1.5 text-[11px] font-medium transition ${
                      active ? 'text-sun-600 dark:text-sun-400 font-bold' : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                    }`}
                  >
                    <Icon size={20} className={active ? 'text-sun-600 dark:text-sun-400' : 'text-neutral-500'} />
                    {label}
                  </Link>
                </li>
              );
            })}
        </ul>
      </nav>
    </div>
  );
}
