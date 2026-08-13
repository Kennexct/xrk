'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { EmptyState, PageHeader, PageLoader } from '@/components/ui';
import { IconVideo, IconPlus, IconPlay } from '@/components/Icons';
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
        action={
          canUpload && (
            <Link href="/videos/upload" className="btn-primary flex items-center gap-1.5 shadow-sm">
              <IconPlus size={18} />
              Upload Video
            </Link>
          )
        }
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
        <EmptyState icon={<IconVideo size={36} />} title="Belum Ada Video" subtitle="Video yang diupload akan tampil di sini." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data!.videos.map((v) => (
              <Link key={v.id} href={`/videos/${v.id}`} className="card group overflow-hidden border border-neutral-200/80 hover:shadow-md transition">
                <div className="relative aspect-video bg-neutral-900 overflow-hidden">
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
                      <IconVideo size={36} />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition">
                    <div className="rounded-full bg-white/90 p-2.5 text-neutral-900 shadow-md group-hover:scale-110 transition">
                      <IconPlay size={18} fill="currentColor" />
                    </div>
                  </div>
                  {v.durationSec ? (
                    <span className="absolute bottom-2 right-2 rounded-lg bg-black/80 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">
                      {formatDuration(v.durationSec)}
                    </span>
                  ) : null}
                </div>
                <div className="p-3.5">
                  <p className="line-clamp-2 text-sm font-bold text-neutral-900 group-hover:text-sun-600 transition leading-snug">{v.title}</p>
                  <p className="mt-1.5 text-xs font-medium text-neutral-400">
                    {v.uploader?.name} · {v.viewCount}x ditonton · {formatRelative(v.createdAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <button type="button" className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Sebelumnya
              </button>
              <span className="text-xs font-semibold text-neutral-500">Hal {page} / {totalPages}</span>
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
      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
        active ? 'bg-sun-500 text-white shadow-sm' : 'bg-white text-neutral-600 border border-neutral-200/80 hover:bg-neutral-100'
      }`}
    >
      {label}
    </button>
  );
}
