'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { EmptyState, PageHeader, PageLoader } from '@/components/ui';
import { formatDate, formatDuration } from '@/lib/format';
import type { Music } from '@/lib/types';

export default function MusicPage() {
  const { hasRole } = useAuth();
  const [album, setAlbum] = useState('');
  const [current, setCurrent] = useState<Music | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['music', album],
    queryFn: () =>
      api<{ tracks: Music[]; albums: (string | null)[] }>('/api/music', {
        query: { album: album || undefined },
      }),
  });

  const play = (track: Music) => {
    setCurrent(track);
    void api(`/api/music/${track.id}/play`, { method: 'POST' }).catch(() => undefined);
    // Progressive streaming via <audio> — the file streams from object storage/CDN.
    requestAnimationFrame(() => {
      if (audioRef.current) {
        audioRef.current.src = track.fileUrl;
        void audioRef.current.play().catch(() => undefined);
      }
    });
  };

  const canUpload = hasRole('SUPER_ADMIN', 'CONTENT_ADMIN', 'MEMBER');

  return (
    <div className={current ? 'pb-24' : ''}>
      <PageHeader
        title="Musik & Karya Audio"
        subtitle="Karya anggota, streaming langsung dari CDN"
        action={canUpload && <Link href="/music/upload" className="btn-primary">+ Upload Karya</Link>}
      />

      {(data?.albums ?? []).length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <AlbumChip label="Semua" active={album === ''} onClick={() => setAlbum('')} />
          {data!.albums.filter(Boolean).map((a) => (
            <AlbumChip key={a} label={a!} active={album === a} onClick={() => setAlbum(a!)} />
          ))}
        </div>
      )}

      {isLoading ? (
        <PageLoader />
      ) : (data?.tracks ?? []).length === 0 ? (
        <EmptyState icon="🎵" title="Belum ada karya musik" />
      ) : (
        <ul className="card divide-y divide-neutral-100">
          {data!.tracks.map((track, i) => (
            <li key={track.id}>
              <button
                type="button"
                onClick={() => play(track)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50 ${
                  current?.id === track.id ? 'bg-sun-50' : ''
                }`}
              >
                <span className="w-6 text-center text-sm text-neutral-400">
                  {current?.id === track.id ? '🔊' : i + 1}
                </span>
                {track.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={track.coverUrl} alt="" loading="lazy" className="h-10 w-10 rounded object-cover" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded bg-sun-100" aria-hidden>🎵</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{track.title}</span>
                  <span className="block truncate text-xs text-neutral-500">
                    {track.artist}
                    {track.album ? ` · ${track.album}` : ''}
                    {track.division ? ` · ${track.division}` : ''}
                  </span>
                </span>
                <span className="hidden text-xs text-neutral-400 sm:block">
                  {track.playCount}x diputar{track.releasedAt ? ` · ${formatDate(track.releasedAt)}` : ''}
                </span>
                <span className="text-xs text-neutral-400">{formatDuration(track.durationSec)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Player bar — full-width di mobile (master.md §4) */}
      {current && (
        <div className="fixed inset-x-0 bottom-14 z-30 border-t border-neutral-200 bg-white px-4 py-2 shadow-lg md:bottom-0 xl:left-64">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <span className="min-w-0 sm:w-56">
              <span className="block truncate text-sm font-medium">{current.title}</span>
              <span className="block truncate text-xs text-neutral-500">{current.artist}</span>
            </span>
            <audio ref={audioRef} controls preload="none" className="h-9 w-full flex-1" />
            <button
              type="button"
              onClick={() => {
                audioRef.current?.pause();
                setCurrent(null);
              }}
              className="rounded p-1 text-neutral-400 hover:text-neutral-700"
              aria-label="Tutup player"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AlbumChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
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
