'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { api, uploadToPresignedUrl } from '@/lib/api';
import { ErrorNote, PageHeader, Spinner } from '@/components/ui';

export default function MusicUploadPage() {
  const router = useRouter();
  const [form, setForm] = useState({ title: '', artist: '', album: '', division: '' });
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const readDuration = (f: File): Promise<number | undefined> =>
    new Promise((resolve) => {
      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(audio.src);
        resolve(Number.isFinite(audio.duration) ? audio.duration : undefined);
      };
      audio.onerror = () => resolve(undefined);
      audio.src = URL.createObjectURL(f);
    });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setError(null);
    setSubmitting(true);
    try {
      // 1) presigned URL — audio langsung ke object storage (PRD §8.7)
      const contentType = file.type || (file.name.endsWith('.mp3') ? 'audio/mpeg' : 'audio/mpeg');
      const presigned = await api<{ key: string; uploadUrl: string; fileUrl: string }>('/api/music/upload-url', {
        method: 'POST',
        body: { fileName: file.name, contentType, sizeBytes: file.size },
      });
      setProgress(0);
      await uploadToPresignedUrl(presigned.uploadUrl, file, setProgress);

      // 2) simpan metadata
      const durationSec = await readDuration(file);
      await api('/api/music', {
        method: 'POST',
        body: {
          title: form.title,
          artist: form.artist,
          album: form.album || undefined,
          division: form.division || undefined,
          fileKey: presigned.key,
          fileUrl: presigned.fileUrl,
          durationSec,
        },
      });
      router.replace('/music');
    } catch (err) {
      setError(err);
      setSubmitting(false);
      setProgress(null);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Upload Karya Musik" subtitle="mp3/wav/aac — dikirim langsung ke object storage" />
      <form onSubmit={onSubmit} className="card space-y-4 p-6">
        <div>
          <label className="label" htmlFor="title">Judul *</label>
          <input id="title" required className="input" value={form.title} onChange={set('title')} />
        </div>
        <div>
          <label className="label" htmlFor="artist">Pencipta / Performer *</label>
          <input id="artist" required className="input" value={form.artist} onChange={set('artist')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="album">Album / Kegiatan</label>
            <input id="album" className="input" value={form.album} onChange={set('album')} />
          </div>
          <div>
            <label className="label" htmlFor="division">Divisi</label>
            <input id="division" className="input" value={form.division} onChange={set('division')} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="file">File audio *</label>
          <input
            id="file"
            type="file"
            accept="audio/*"
            required
            className="input"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <p className="mt-1 text-xs text-neutral-500">Maks. 100MB.</p>
        </div>
        {progress !== null && (
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
              <div className="h-full bg-sun-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-neutral-500">Mengunggah… {progress}%</p>
          </div>
        )}
        <ErrorNote error={error} />
        <button type="submit" disabled={submitting || !file} className="btn-primary w-full">
          {submitting ? <Spinner /> : 'Upload'}
        </button>
      </form>
    </div>
  );
}
