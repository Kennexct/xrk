'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { EmptyState, PageHeader, PageLoader, StatusBadge } from '@/components/ui';
import { formatRelative } from '@/lib/format';
import { NEWS_CATEGORY_LABELS, type News, type NewsCategory } from '@/lib/types';

export default function NewsListPage() {
  const { hasRole } = useAuth();
  const isEditor = hasRole('SUPER_ADMIN', 'CONTENT_ADMIN');
  const [category, setCategory] = useState<NewsCategory | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['news', category, page],
    queryFn: () =>
      api<{ posts: News[]; total: number; pageSize: number }>('/api/news', {
        query: { category: category || undefined, page },
      }),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      <PageHeader
        title="Berita & Update Kegiatan"
        action={isEditor && <Link href="/news/editor" className="btn-primary">+ Tulis Berita</Link>}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Chip label="Semua" active={category === ''} onClick={() => { setCategory(''); setPage(1); }} />
        {(Object.keys(NEWS_CATEGORY_LABELS) as NewsCategory[]).map((c) => (
          <Chip key={c} label={NEWS_CATEGORY_LABELS[c]} active={category === c} onClick={() => { setCategory(c); setPage(1); }} />
        ))}
      </div>

      {isLoading ? (
        <PageLoader />
      ) : (data?.posts ?? []).length === 0 ? (
        <EmptyState icon="📰" title="Belum ada berita" />
      ) : (
        <>
          <ul className="space-y-3">
            {data!.posts.map((post) => (
              <li key={post.id} className="card overflow-hidden">
                <Link href={`/news/${post.slug}`} className="flex gap-4 p-4 hover:bg-neutral-50">
                  {post.coverImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.coverImageUrl}
                      alt=""
                      loading="lazy"
                      className="hidden h-24 w-40 shrink-0 rounded-lg object-cover sm:block"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge bg-sun-100 text-sun-800">{NEWS_CATEGORY_LABELS[post.category]}</span>
                      {isEditor && post.status !== 'PUBLISHED' && <StatusBadge status={post.status} />}
                    </div>
                    <h2 className="mt-1.5 line-clamp-2 font-semibold">{post.title}</h2>
                    <p className="mt-1 line-clamp-2 text-sm text-neutral-600">
                      {post.content.replace(/<[^>]+>/g, '').slice(0, 200)}
                    </p>
                    <p className="mt-2 text-xs text-neutral-400">
                      {post.author?.name} · {formatRelative(post.publishedAt ?? post.createdAt)}
                      {post.tags.length > 0 && <> · {post.tags.map((t) => `#${t}`).join(' ')}</>}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <button type="button" className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Sebelumnya
              </button>
              <span className="text-sm text-neutral-500">Hal {page} / {totalPages}</span>
              <button type="button" className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Berikutnya
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm transition ${
        active ? 'bg-sun-500 font-medium text-neutral-900' : 'bg-white text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-100'
      }`}
    >
      {label}
    </button>
  );
}
