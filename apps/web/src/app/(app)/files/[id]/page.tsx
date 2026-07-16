'use client';

import { useParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, uploadToPresignedUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { EmptyState, ErrorNote, PageHeader, PageLoader } from '@/components/ui';
import { formatBytes, formatDateTime } from '@/lib/format';
import type { Folder } from '@/lib/types';

const fileIcon = (type: string) =>
  type.includes('pdf') ? '📄' : type.startsWith('image/') ? '🖼️' : type.includes('zip') ? '🗜️' : type.includes('word') ? '📝' : type.includes('sheet') || type.includes('excel') ? '📊' : '📎';

export default function FolderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<unknown>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['folder', id],
    queryFn: () => api<{ folder: Folder }>(`/api/folders/${id}`),
  });

  const upload = async (file: File) => {
    setError(null);
    if (file.size > 25 * 1024 * 1024) {
      setError(new Error('Maksimal 25MB per file. Untuk video besar gunakan Modul Video.'));
      return;
    }
    try {
      const presigned = await api<{ key: string; uploadUrl: string; fileUrl: string }>(
        `/api/folders/${id}/upload-url`,
        {
          method: 'POST',
          body: { fileName: file.name, contentType: file.type || 'application/pdf', sizeBytes: file.size },
        },
      );
      setProgress(0);
      await uploadToPresignedUrl(presigned.uploadUrl, file, setProgress);
      await api(`/api/folders/${id}/files`, {
        method: 'POST',
        body: {
          fileName: file.name,
          fileKey: presigned.key,
          fileUrl: presigned.fileUrl,
          fileType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
        },
      });
      void queryClient.invalidateQueries({ queryKey: ['folder', id] });
    } catch (err) {
      setError(err);
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  if (isLoading) return <PageLoader />;
  if (!data?.folder) return <p className="py-20 text-center text-neutral-500">Folder tidak ditemukan.</p>;

  const folder = data.folder;
  const canUpload = !hasRole('GUEST');
  const canManage = hasRole('SUPER_ADMIN', 'CONTENT_ADMIN', 'EVENT_COORDINATOR');

  return (
    <div>
      <PageHeader
        title={`📁 ${folder.name}`}
        subtitle={[folder.event?.title, folder.division].filter(Boolean).join(' · ') || 'Folder umum'}
        action={canUpload && (
          <label className="btn-primary cursor-pointer">
            {progress !== null ? `Mengunggah… ${progress}%` : '+ Upload File'}
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              disabled={progress !== null}
              onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])}
            />
          </label>
        )}
      />

      {error ? <div className="mb-4"><ErrorNote error={error} /></div> : null}

      {(folder.files ?? []).length === 0 ? (
        <EmptyState icon="📄" title="Folder kosong" subtitle="Upload dokumentasi pendukung (PDF, gambar, dokumen)." />
      ) : (
        <ul className="card divide-y divide-neutral-100">
          {folder.files!.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-xl" aria-hidden>{fileIcon(f.fileType)}</span>
              <a href={f.fileUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 hover:underline">
                <span className="block truncate text-sm font-medium">{f.fileName}</span>
                <span className="block text-xs text-neutral-500">
                  {formatBytes(f.sizeBytes)} · {f.uploader?.name} · {formatDateTime(f.createdAt)}
                </span>
              </a>
              {(canManage || f.uploader?.id === user?.id) && (
                <button
                  type="button"
                  className="rounded p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Hapus ${f.fileName}`}
                  onClick={async () => {
                    if (!confirm(`Hapus ${f.fileName}?`)) return;
                    await api(`/api/folders/files/${f.id}`, { method: 'DELETE' });
                    void queryClient.invalidateQueries({ queryKey: ['folder', id] });
                  }}
                >
                  🗑️
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
