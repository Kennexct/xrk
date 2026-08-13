'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { EmptyState, PageHeader, PageLoader } from '@/components/ui';
import { IconMusic, IconPlay, IconPlus, IconX } from '@/components/Icons';
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
        action={
          canUpload && (
            <Link href="/music/upload" className="btn-primary flex items-center gap-1.5 shadow-sm">
              <IconPlus size={18} />
              Upload Karya
            </Link>
          )
        }
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
        <EmptyState icon={<IconMusic size={36} />} title="Belum Ada Karya Musik" subtitle="Unggah lagu dan audio karya pengurus & anggota." />
      ) : (
        <ul className="card divide-y divide-neutral-100/80 border border-neutral-200/80 rounded-2xl overflow-hidden shadow-sm">
          {data!.tracks.map((track, i) => (
            <li key={track.id}>
              <button
                type="button"
                onClick={() => play(track)}
                className={`flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition hover:bg-neutral-50/80 ${
                  current?.id === track.id ? 'bg-sun-50/80' : ''
                }`}
              >
                <span className="w-6 text-center text-xs font-semibold text-neutral-400">
                  {current?.id === track.id ? <IconPlay size={16} className="text-sun-600 animate-pulse inline" fill="currentColor" /> : i + 1}
                </span>
                {track.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={track.coverUrl} alt="" loading="lazy" className="h-10 w-10 rounded-xl object-cover shadow-sm" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sun-100/70 text-sun-700">
                    <IconMusic size={20} />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-neutral-900 leading-snug">{track.title}</span>
                  <span className="block truncate text-xs font-medium text-neutral-500 mt-0.5">
                    {track.artist}
                    {track.album ? ` · ${track.album}` : ''}
                    {track.division ? ` · ${track.division}` : ''}
                  </span>
                </span>
                <span className="hidden text-xs font-medium text-neutral-400 sm:block">
                  {track.playCount}x diputar{track.releasedAt ? ` · ${formatDate(track.releasedAt)}` : ''}
                </span>
                <span className="text-xs font-medium text-neutral-400">{formatDuration(track.durationSec)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Player bar */}
      {current && (
        <div className="fixed inset-x-0 bottom-14 z-30 border-t border-neutral-200/80 bg-white/95 backdrop-blur-md px-4 py-2.5 shadow-2xl md:bottom-0 xl:left-64">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <div className="p-2 bg-sun-100 text-sun-700 rounded-xl hidden sm:block">
              <IconMusic size={20} />
            </div>
            <span className="min-w-0 sm:w-56">
              <span className="block truncate text-sm font-bold text-neutral-900">{current.title}</span>
              <span className="block truncate text-xs font-medium text-neutral-500">{current.artist}</span>
            </span>
            <audio ref={audioRef} controls preload="none" className="h-9 w-full flex-1" />
            <button
              type="button"
              onClick={() => {
                audioRef.current?.pause();
                setCurrent(null);
              }}
              className="rounded-xl p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition"
              aria-label="Tutup player"
            >
              <IconX size={18} />
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
      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
        active ? 'bg-sun-500 text-white shadow-sm' : 'bg-white text-neutral-600 border border-neutral-200/80 hover:bg-neutral-100'
      }`}
    >
      {label}
    </button>
  );
}
