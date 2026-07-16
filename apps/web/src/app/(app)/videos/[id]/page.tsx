'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { VideoPlayer } from '@/components/VideoPlayer';
import { PageLoader, StatusBadge } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import { VIDEO_CATEGORY_LABELS, type Video } from '@/lib/types';

export default function VideoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, hasRole } = useAuth();
  const counted = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ['video', id],
    queryFn: () => api<{ video: Video }>(`/api/videos/${id}`),
  });

  useEffect(() => {
    if (data?.video && !counted.current) {
      counted.current = true;
      void api(`/api/videos/${id}/view`, { method: 'POST' }).catch(() => undefined);
    }
  }, [data?.video, id]);

  if (isLoading) return <PageLoader />;
  if (!data?.video) return <p className="py-20 text-center text-neutral-500">Video tidak ditemukan.</p>;

  const video = data.video;
  const canDelete = video.uploader?.id === user?.id || hasRole('SUPER_ADMIN', 'CONTENT_ADMIN');

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title: video.title, url }).catch(() => undefined);
    else {
      await navigator.clipboard.writeText(url);
      alert('Tautan disalin!');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {video.status === 'PROCESSING' ? (
        <div className="flex aspect-video items-center justify-center rounded-xl bg-neutral-900 text-neutral-300">
          <div className="text-center">
            <p className="text-lg">⏳ Sedang diproses…</p>
            <p className="mt-1 text-sm text-neutral-400">Video sedang di-transcode oleh layanan streaming.</p>
          </div>
        </div>
      ) : (
        <VideoPlayer video={video} />
      )}

      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold sm:text-xl">{video.title}</h1>
            <p className="mt-1 text-sm text-neutral-500">
              {video.uploader?.name}
              {video.uploader?.division ? ` (${video.uploader.division})` : ''} · {video.viewCount}x ditonton ·{' '}
              {formatDateTime(video.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={video.status} />
            <span className="badge bg-sun-100 text-sun-800">{VIDEO_CATEGORY_LABELS[video.category]}</span>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button type="button" onClick={share} className="btn-secondary">🔗 Bagikan</button>
          {canDelete && (
            <button
              type="button"
              className="btn-danger"
              onClick={async () => {
                if (!confirm('Hapus video ini?')) return;
                await api(`/api/videos/${id}`, { method: 'DELETE' });
                router.replace('/videos');
              }}
            >
              Hapus
            </button>
          )}
        </div>

        {video.description && <p className="mt-4 whitespace-pre-wrap text-sm text-neutral-700">{video.description}</p>}
      </div>
    </div>
  );
}
