'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Avatar, EmptyState, PageLoader, StatusBadge } from '@/components/ui';
import { formatDateTime, formatRelative } from '@/lib/format';
import { NEWS_CATEGORY_LABELS, type News, type SytEvent, type User, type Video } from '@/lib/types';

export default function DashboardPage() {
  const { user } = useAuth();

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
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Halo, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="mt-1 text-sm text-neutral-500">Kabar dan kegiatan terbaru Sunflower Youth Team.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Berita terbaru</h2>
            <Link href="/news" className="text-sm text-sun-700 hover:underline">Lihat semua</Link>
          </div>
          {(news.data?.posts ?? []).length === 0 ? (
            <EmptyState icon="📰" title="Belum ada berita" />
          ) : (
            <ul className="space-y-3">
              {news.data!.posts.map((post) => (
                <li key={post.id} className="card overflow-hidden">
                  <Link href={`/news/${post.slug}`} className="flex gap-4 p-4 hover:bg-neutral-50">
                    {post.coverImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.coverImageUrl}
                        alt=""
                        loading="lazy"
                        className="hidden h-20 w-32 shrink-0 rounded-lg object-cover sm:block"
                      />
                    )}
                    <div className="min-w-0">
                      <span className="badge bg-sun-100 text-sun-800">{NEWS_CATEGORY_LABELS[post.category]}</span>
                      <p className="mt-1 line-clamp-2 font-medium">{post.title}</p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {post.author?.name} · {post.publishedAt ? formatRelative(post.publishedAt) : 'draft'}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between pt-2">
            <h2 className="font-semibold">Video terbaru</h2>
            <Link href="/videos" className="text-sm text-sun-700 hover:underline">Lihat semua</Link>
          </div>
          {(videos.data?.videos ?? []).length === 0 ? (
            <EmptyState icon="🎬" title="Belum ada video" />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {videos.data!.videos.map((v) => (
                <Link key={v.id} href={`/videos/${v.id}`} className="group">
                  <div className="aspect-video overflow-hidden rounded-lg bg-neutral-200">
                    {v.thumbnailUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.thumbnailUrl}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    )}
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-sm font-medium">{v.title}</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Kegiatan mendatang</h2>
            <Link href="/calendar" className="text-sm text-sun-700 hover:underline">Kalender</Link>
          </div>
          {(events.data?.events ?? []).length === 0 ? (
            <EmptyState icon="📅" title="Belum ada kegiatan" />
          ) : (
            <ul className="space-y-2">
              {events.data!.events.map((e) => (
                <li key={e.id}>
                  <Link href={`/events/${e.id}`} className="card block p-3 hover:bg-neutral-50">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium">{e.title}</p>
                      <StatusBadge status={e.status} />
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">
                      {formatDateTime(e.startTime)}
                      {e.location ? ` · ${e.location}` : ''}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <h2 className="pt-2 font-semibold">Sedang online ({onlineMembers.length})</h2>
          <div className="card p-3">
            {onlineMembers.length === 0 ? (
              <p className="py-3 text-center text-sm text-neutral-500">Tidak ada yang online</p>
            ) : (
              <ul className="space-y-2">
                {onlineMembers.slice(0, 8).map((m) => (
                  <li key={m.id} className="flex items-center gap-2.5">
                    <Avatar name={m.name} src={m.avatarUrl} size={30} online />
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{m.name}</span>
                      <span className="block truncate text-xs text-neutral-400">{m.division ?? ''}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
