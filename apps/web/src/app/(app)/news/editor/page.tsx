'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, uploadToPresignedUrl } from '@/lib/api';
import { ErrorNote, PageHeader, PageLoader, Spinner } from '@/components/ui';
import { NEWS_CATEGORY_LABELS, type News, type NewsCategory } from '@/lib/types';

export default function NewsEditorPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <NewsEditor />
    </Suspense>
  );
}

function NewsEditor() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get('id');

  const existing = useQuery({
    queryKey: ['news-edit', editId],
    queryFn: () => api<{ post: News }>(`/api/news/${editId}`),
    enabled: !!editId,
  });

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<NewsCategory>('PENGUMUMAN');
  const [tags, setTags] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [publishMode, setPublishMode] = useState<'DRAFT' | 'PUBLISHED' | 'SCHEDULED'>('PUBLISHED');
  const [publishAt, setPublishAt] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const post = existing.data?.post;
    if (!post) return;
    setTitle(post.title);
    setContent(post.content);
    setCategory(post.category);
    setTags(post.tags.join(', '));
    setCoverImageUrl(post.coverImageUrl);
    if (post.status === 'DRAFT' || post.status === 'SCHEDULED') setPublishMode(post.status);
    if (post.publishAt) setPublishAt(post.publishAt.slice(0, 16));
  }, [existing.data]);

  const uploadCover = async (file: File) => {
    setUploadingCover(true);
    setError(null);
    try {
      const presigned = await api<{ uploadUrl: string; fileUrl: string }>('/api/storage/presign', {
        method: 'POST',
        body: { kind: 'image', fileName: file.name, contentType: file.type, sizeBytes: file.size },
      });
      await uploadToPresignedUrl(presigned.uploadUrl, file);
      setCoverImageUrl(presigned.fileUrl);
    } catch (err) {
      setError(err);
    } finally {
      setUploadingCover(false);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const body = {
        title,
        content,
        category,
        coverImageUrl,
        tags: tags.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean),
        status: publishMode,
        publishAt: publishMode === 'SCHEDULED' ? new Date(publishAt).toISOString() : undefined,
      };
      const { post } = editId
        ? await api<{ post: News }>(`/api/news/${editId}`, { method: 'PATCH', body })
        : await api<{ post: News }>('/api/news', { method: 'POST', body });
      router.replace(`/news/${post.slug}`);
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  };

  if (editId && existing.isLoading) return <PageLoader />;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={editId ? 'Edit Berita' : 'Tulis Berita'} />
      <form onSubmit={onSubmit} className="card space-y-4 p-6">
        <div>
          <label className="label" htmlFor="title">Judul *</label>
          <input id="title" required minLength={3} className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="category">Kategori</label>
            <select id="category" className="input" value={category} onChange={(e) => setCategory(e.target.value as NewsCategory)}>
              {Object.entries(NEWS_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="tags">Tag (pisahkan dengan koma)</label>
            <input id="tags" className="input" placeholder="rapat, lomba" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="cover">Gambar cover</label>
          {coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverImageUrl} alt="" className="mb-2 h-40 w-full rounded-lg object-cover" />
          )}
          <input
            id="cover"
            type="file"
            accept="image/*"
            className="input"
            disabled={uploadingCover}
            onChange={(e) => e.target.files?.[0] && void uploadCover(e.target.files[0])}
          />
          {uploadingCover && <p className="mt-1 text-xs text-neutral-500">Mengunggah cover…</p>}
        </div>
        <div>
          <label className="label" htmlFor="content">Isi berita *</label>
          <textarea
            id="content"
            required
            rows={12}
            className="input font-mono text-sm"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        <fieldset>
          <legend className="label">Publikasi</legend>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['PUBLISHED', 'Terbitkan sekarang'],
                ['SCHEDULED', 'Jadwalkan'],
                ['DRAFT', 'Simpan draft'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPublishMode(value)}
                className={publishMode === value ? 'btn-primary' : 'btn-secondary'}
              >
                {label}
              </button>
            ))}
          </div>
          {publishMode === 'SCHEDULED' && (
            <input
              type="datetime-local"
              required
              className="input mt-2"
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
            />
          )}
        </fieldset>

        <ErrorNote error={error} />
        <button type="submit" disabled={submitting || uploadingCover} className="btn-primary w-full">
          {submitting ? <Spinner /> : editId ? 'Simpan Perubahan' : 'Simpan Berita'}
        </button>
      </form>
    </div>
  );
}
