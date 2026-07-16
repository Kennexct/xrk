'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { api, uploadToCloudflareStream, uploadToPresignedUrl } from '@/lib/api';
import { ErrorNote, PageHeader, Spinner } from '@/components/ui';
import { VIDEO_CATEGORY_LABELS, type Video, type VideoCategory } from '@/lib/types';

type Mode = 'file' | 'youtube';

export default function VideoUploadPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('file');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<VideoCategory>('DOKUMENTASI_ACARA');
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'youtube') {
        const { video } = await api<{ video: Video }>('/api/videos/youtube', {
          method: 'POST',
          body: { title, description: description || undefined, category, url: youtubeUrl },
        });
        router.replace(`/videos/${video.id}`);
        return;
      }

      if (!file) throw new Error('Pilih file video terlebih dahulu');
      // Step 1: minta upload URL — bytes langsung ke penyedia streaming (PRD §8.1)
      const { video, uploadUrl } = await api<{ video: Video; uploadUrl: string }>('/api/videos/upload-url', {
        method: 'POST',
        body: { title, description: description || undefined, category },
      });
      // Step 2: upload langsung dari browser
      setProgress(0);
      if (video.provider === 'CLOUDFLARE_STREAM') {
        await uploadToCloudflareStream(uploadUrl, file, setProgress);
      } else {
        await uploadToPresignedUrl(uploadUrl, file, setProgress);
      }
      router.replace(`/videos/${video.id}`);
    } catch (err) {
      setError(err);
      setSubmitting(false);
      setProgress(null);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Upload Video" subtitle="File dikirim langsung ke layanan streaming — tidak membebani server" />

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setMode('file')}
          className={mode === 'file' ? 'btn-primary' : 'btn-secondary'}
        >
          📤 Upload file
        </button>
        <button
          type="button"
          onClick={() => setMode('youtube')}
          className={mode === 'youtube' ? 'btn-primary' : 'btn-secondary'}
        >
          ▶️ Tautan YouTube
        </button>
      </div>

      <form onSubmit={onSubmit} className="card space-y-4 p-6">
        <div>
          <label className="label" htmlFor="title">Judul *</label>
          <input id="title" required minLength={2} className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="category">Kategori</label>
          <select id="category" className="input" value={category} onChange={(e) => setCategory(e.target.value as VideoCategory)}>
            {Object.entries(VIDEO_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="description">Deskripsi</label>
          <textarea id="description" rows={3} className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {mode === 'file' ? (
          <div>
            <label className="label" htmlFor="file">File video *</label>
            <input
              id="file"
              type="file"
              accept="video/*"
              required
              className="input"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="mt-1 text-xs text-neutral-500">
              Video ditranscode otomatis ke adaptive streaming (HLS) oleh penyedia.
            </p>
          </div>
        ) : (
          <div>
            <label className="label" htmlFor="yt">URL YouTube (unlisted) *</label>
            <input
              id="yt"
              type="url"
              required
              placeholder="https://youtu.be/…"
              className="input"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
            />
          </div>
        )}

        {progress !== null && (
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
              <div className="h-full bg-sun-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-neutral-500">Mengunggah… {progress}%</p>
          </div>
        )}

        <ErrorNote error={error} />
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? <Spinner /> : mode === 'file' ? 'Upload Video' : 'Simpan Video YouTube'}
        </button>
      </form>
    </div>
  );
}
