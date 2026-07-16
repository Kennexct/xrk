'use client';

import { useEffect, useRef, useState } from 'react';
import type { Video } from '@/lib/types';

/**
 * Lazy HLS player (PRD §8.5): the stream — and hls.js itself — only load
 * after the user presses play, keeping gallery pages light on mobile.
 */
export function VideoPlayer({ video }: { video: Video }) {
  const [activated, setActivated] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!activated || !video.hlsUrl || !videoRef.current) return;
    const el = videoRef.current;

    if (el.canPlayType('application/vnd.apple.mpegurl')) {
      el.src = video.hlsUrl; // Safari native HLS
      void el.play().catch(() => undefined);
      return;
    }

    let hls: import('hls.js').default | null = null;
    let cancelled = false;
    void import('hls.js').then(({ default: Hls }) => {
      if (cancelled || !videoRef.current) return;
      if (Hls.isSupported()) {
        hls = new Hls({ capLevelToPlayerSize: true });
        hls.loadSource(video.hlsUrl!);
        hls.attachMedia(videoRef.current);
        hls.on(Hls.Events.MANIFEST_PARSED, () => void videoRef.current?.play().catch(() => undefined));
      }
    });
    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [activated, video.hlsUrl]);

  if (video.provider === 'YOUTUBE' && video.embedUrl) {
    if (!activated) {
      return <Poster video={video} onPlay={() => setActivated(true)} />;
    }
    return (
      <iframe
        src={`${video.embedUrl}?autoplay=1`}
        title={video.title}
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="aspect-video w-full rounded-xl bg-black"
      />
    );
  }

  if (!activated) {
    return <Poster video={video} onPlay={() => setActivated(true)} />;
  }

  return (
    <video
      ref={videoRef}
      controls
      playsInline
      poster={video.thumbnailUrl ?? undefined}
      className="aspect-video w-full rounded-xl bg-black"
    />
  );
}

function Poster({ video, onPlay }: { video: Video; onPlay: () => void }) {
  return (
    <button
      type="button"
      onClick={onPlay}
      className="group relative block aspect-video w-full overflow-hidden rounded-xl bg-neutral-900"
      aria-label={`Putar ${video.title}`}
    >
      {video.thumbnailUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={video.thumbnailUrl}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover opacity-80 transition group-hover:opacity-60"
        />
      )}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-2xl shadow-lg transition group-hover:scale-110">
          ▶
        </span>
      </span>
    </button>
  );
}
