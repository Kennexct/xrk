'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { EmptyState, PageHeader, PageLoader } from '@/components/ui';
import { formatDuration, formatRelative } from '@/lib/format';
import { VIDEO_CATEGORY_LABELS, type Video, type VideoCategory } from '@/lib/types';

export default function VideosPage() {
  const { hasRole } = useAuth();
  const [category, setCategory] = useState<VideoCategory | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['videos', category, page],
    queryFn: () =>
      api<{ videos: Video[]; total: number; pageSize: number }>('/api/videos', {
        query: { category: category || undefined, page, pageSize: 12 },
      }),
  });

  const canUpload = hasRole('SUPER_ADMIN', 'CONTENT_ADMIN', 'MEMBER');
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      <PageHeader
        title="Video Kegiatan"
        subtitle="Dokumentasi acara, behind the scene, dan karya anggota"
        action={canUpload && <Link href="/videos/upload" className="btn-primary">+ Upload Video</Link>}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip label="Semua" active={category === ''} onClick={() => { setCategory(''); setPage(1); }} />
        {(Object.keys(VIDEO_CATEGORY_LABELS) as VideoCategory[]).map((c) => (
          <FilterChip
            key={c}
            label={VIDEO_CATEGORY_LABELS[c]}
            active={category === c}
            onClick={() => { setCategory(c); setPage(1); }}
          />
        ))}
      </div>

      {isLoading ? (
        <PageLoader />
      ) : (data?.videos ?? []).length === 0 ? (
        <EmptyState icon="🎬" title="Belum ada video" subtitle="Video yang diupload akan tampil di sini." />
      ) : (
        <>
          {/* 1 kolom mobile → 2 tablet → 3–4 desktop (master.md §4) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data!.videos.map((v) => (
              <Link key={v.id} href={`/videos/${v.id}`} className="card group overflow-hidden">
                <div className="relative aspect-video bg-neutral-200">
                  {v.thumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={v.thumbnailUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  )}
                  {v.durationSec ? (
                    <span className="absolute bottom-1.5 right-1.5 rounded bg-black/75 px-1.5 py-0.5 text-xs text-white">
                      {formatDuration(v.durationSec)}
                    </span>
                  ) : null}
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-medium">{v.title}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {v.uploader?.name} · {v.viewCount}x ditonton · {formatRelative(v.createdAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
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

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
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
