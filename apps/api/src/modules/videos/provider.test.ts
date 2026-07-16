import { describe, expect, it } from 'vitest';
import { parseYouTubeId, cloudflarePlaybackUrls } from './provider';

describe('parseYouTubeId', () => {
  it('parses common YouTube URL shapes', () => {
    expect(parseYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeId('https://youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('rejects non-YouTube URLs', () => {
    expect(parseYouTubeId('https://example.com/watch?v=nope')).toBeNull();
    expect(parseYouTubeId('not a url')).toBeNull();
  });
});

describe('cloudflarePlaybackUrls', () => {
  it('builds HLS + thumbnail URLs from a stream uid', () => {
    const urls = cloudflarePlaybackUrls('abc123');
    expect(urls.hlsUrl).toBe('https://videodelivery.net/abc123/manifest/video.m3u8');
    expect(urls.thumbnailUrl).toContain('abc123/thumbnails/thumbnail.jpg');
  });
});
