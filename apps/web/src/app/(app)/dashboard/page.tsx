'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { Avatar, EmptyState, PageLoader, StatusBadge } from '@/components/ui';
import { IconNews, IconVideo, IconCalendar, IconChevronRight, IconPlay } from '@/components/Icons';
import { formatDateTime, formatRelative } from '@/lib/format';
import { NEWS_CATEGORY_LABELS, type News, type SytEvent, type User, type Video } from '@/lib/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useTheme();

  const news = useQuery({
    queryKey: ['news', 'latest'],
    queryFn: () => api<{ posts: News[] }>('/api/news', { query: { pageSize: 5 } }),
  });
  const events = useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: () =>
      api<{ events: SytEvent[] }>('/api/events', {
        query: { from: new Date().toISOString(), pageSize: 5 },
      }),
  });
  const videos = useQuery({
    queryKey: ['videos', 'latest'],
    queryFn: () => api<{ videos: Video[] }>('/api/videos', { query: { pageSize: 4 } }),
  });
  const members = useQuery({
    queryKey: ['users'],
    queryFn: () => api<{ users: User[] }>('/api/users'),
  });

  if (news.isLoading && events.isLoading) return <PageLoader />;

  const onlineMembers = (members.data?.users ?? []).filter((m) => m.isOnline);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-sun-500 to-amber-500 p-6 rounded-3xl text-neutral-950 shadow-lg shadow-sun-500/15">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t.welcome}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="mt-1 text-neutral-900/80 text-sm font-medium">{t.dashboardSubtitle}</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          {/* Berita Terbaru */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconNews size={22} className="text-sun-500" />
                <h2 className="font-bold text-lg text-neutral-900 dark:text-neutral-100">{t.latestNews}</h2>
              </div>
              <Link href="/news" className="text-sm font-semibold text-sun-600 dark:text-sun-400 hover:underline flex items-center gap-1">
                {t.viewAll} <IconChevronRight size={16} />
              </Link>
            </div>
            {(news.data?.posts ?? []).length === 0 ? (
              <EmptyState icon={<IconNews size={32} />} title={t.noNews} />
            ) : (
              <ul className="space-y-3">
                {news.data!.posts.map((post) => (
                  <li key={post.id} className="card overflow-hidden transition hover:shadow-md border border-neutral-200/80 dark:border-neutral-800">
                    <Link href={`/news/${post.slug}`} className="flex gap-4 p-4 hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50 transition">
                      {post.coverImageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.coverImageUrl}
                          alt=""
                          loading="lazy"
                          className="hidden h-20 w-32 shrink-0 rounded-xl object-cover sm:block"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="badge bg-sun-100 dark:bg-sun-900/50 text-sun-800 dark:text-sun-300 font-medium">
                          {NEWS_CATEGORY_LABELS[post.category]}
                        </span>
                        <p className="mt-1.5 line-clamp-2 font-bold text-neutral-900 dark:text-neutral-100 leading-snug">{post.title}</p>
                        <p className="mt-2 text-xs font-medium text-neutral-400">
                          {post.author?.name} · {post.publishedAt ? formatRelative(post.publishedAt) : 'draft'}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Video Terbaru */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconVideo size={22} className="text-sun-500" />
                <h2 className="font-bold text-lg text-neutral-900 dark:text-neutral-100">{t.latestVideos}</h2>
              </div>
              <Link href="/videos" className="text-sm font-semibold text-sun-600 dark:text-sun-400 hover:underline flex items-center gap-1">
                {t.viewAll} <IconChevronRight size={16} />
              </Link>
            </div>
            {(videos.data?.videos ?? []).length === 0 ? (
              <EmptyState icon={<IconVideo size={32} />} title={t.noVideos} />
            ) : (
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
                {videos.data!.videos.map((v) => (
                  <Link key={v.id} href={`/videos/${v.id}`} className="group space-y-2">
                    <div className="relative aspect-video overflow-hidden rounded-xl bg-neutral-900 shadow-sm">
                      {v.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={v.thumbnailUrl}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-white/40">
                          <IconVideo size={32} />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition">
                        <div className="rounded-full bg-white/90 p-2 text-neutral-900 shadow-md group-hover:scale-110 transition">
                          <IconPlay size={16} fill="currentColor" />
                        </div>
                      </div>
                    </div>
                    <p className="line-clamp-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200 group-hover:text-sun-500 transition leading-snug">
                      {v.title}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          {/* Kegiatan Mendatang */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconCalendar size={20} className="text-sun-500" />
                <h2 className="font-bold text-lg text-neutral-900 dark:text-neutral-100">{t.upcomingEvents}</h2>
              </div>
              <Link href="/calendar" className="text-xs font-semibold text-sun-600 dark:text-sun-400 hover:underline">
                {t.calendar}
              </Link>
            </div>
            {(events.data?.events ?? []).length === 0 ? (
              <EmptyState icon={<IconCalendar size={28} />} title={t.noEvents} />
            ) : (
              <ul className="space-y-2.5">
                {events.data!.events.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/events/${e.id}`}
                      className="card block p-3.5 hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50 transition border border-neutral-200/80 dark:border-neutral-800"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-bold text-sm text-neutral-900 dark:text-neutral-100">{e.title}</p>
                        <StatusBadge status={e.status} />
                      </div>
                      <p className="mt-1 text-xs font-medium text-neutral-400">
                        {formatDateTime(e.startTime)}
                        {e.location ? ` · ${e.location}` : ''}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Members Online */}
          <div className="space-y-3 pt-2">
            <h2 className="font-bold text-lg text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
              {t.onlineNow} ({onlineMembers.length})
            </h2>
            <div className="card p-4 border border-neutral-200/80 dark:border-neutral-800">
              {onlineMembers.length === 0 ? (
                <p className="py-2 text-center text-xs font-medium text-neutral-400">{t.noOnlineMembers}</p>
              ) : (
                <ul className="space-y-3">
                  {onlineMembers.slice(0, 8).map((m) => (
                    <li key={m.id} className="flex items-center gap-3">
                      <Avatar name={m.name} src={m.avatarUrl} size={32} online />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-neutral-800 dark:text-neutral-200">{m.name}</span>
                        <span className="block truncate text-xs font-medium text-neutral-400">{m.division ?? ''}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
