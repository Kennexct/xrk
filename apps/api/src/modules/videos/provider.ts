import { config } from '../../config';
import { badRequest } from '../../lib/errors';

/**
 * Video streaming provider adapter (PRD §8). The app server never touches
 * video bytes — it only requests a direct-upload URL from the provider and
 * stores metadata. Providers:
 *  - cloudflare: Cloudflare Stream direct creator uploads (recommended)
 *  - mock: local development — returns a public sample HLS stream as READY
 */

export interface DirectUploadResult {
  provider: 'CLOUDFLARE_STREAM' | 'MOCK';
  providerVideoId: string;
  uploadUrl: string;
  /** mock provider is instantly "ready" with sample playback URLs */
  instantReady?: { hlsUrl: string; thumbnailUrl: string; durationSec: number };
}

// Publicly available test stream (Mux) used only by the dev mock provider.
const SAMPLE_HLS = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
const SAMPLE_THUMB =
  'https://image.mux.com/x36xhzz/thumbnail.jpg?width=640';

export async function createDirectUpload(meta: { title: string; uploaderId: string }): Promise<DirectUploadResult> {
  if (config.video.driver === 'mock') {
    const id = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      provider: 'MOCK',
      providerVideoId: id,
      uploadUrl: `${config.publicApiUrl}/api/dev-storage/video-${id}`,
      instantReady: { hlsUrl: SAMPLE_HLS, thumbnailUrl: SAMPLE_THUMB, durationSec: 634 },
    };
  }

  if (!config.video.cfAccountId || !config.video.cfApiToken) {
    throw badRequest('Cloudflare Stream is not configured (CF_ACCOUNT_ID / CF_STREAM_API_TOKEN)');
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${config.video.cfAccountId}/stream/direct_upload`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.video.cfApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        maxDurationSeconds: config.video.maxDurationSec,
        meta: { name: meta.title, uploaderId: meta.uploaderId },
        requireSignedURLs: false,
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudflare Stream direct_upload failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as { result: { uid: string; uploadURL: string } };
  return {
    provider: 'CLOUDFLARE_STREAM',
    providerVideoId: json.result.uid,
    uploadUrl: json.result.uploadURL,
  };
}

export const cloudflarePlaybackUrls = (uid: string) => ({
  hlsUrl: `https://videodelivery.net/${uid}/manifest/video.m3u8`,
  thumbnailUrl: `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg?width=640`,
});

/** Extract a YouTube video id from common URL shapes (embed fallback, PRD §8.2). */
export function parseYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}
