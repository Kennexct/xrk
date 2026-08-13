'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { EmptyState, ErrorNote, PageHeader, PageLoader } from '@/components/ui';
import { formatDate } from '@/lib/format';
import type { Folder, SytEvent } from '@/lib/types';

import { IconFolder, IconPlus } from '@/components/Icons';

export default function FilesPage() {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [division, setDivision] = useState('');
  const [eventId, setEventId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['folders'],
    queryFn: () => api<{ folders: Folder[] }>('/api/folders'),
  });
  const events = useQuery({
    queryKey: ['events', 'all-for-folder'],
    queryFn: () => api<{ events: SytEvent[] }>('/api/events', { query: { pageSize: 100 } }),
    enabled: showForm,
  });

  const createFolder = useMutation({
    mutationFn: () =>
      api('/api/folders', {
        method: 'POST',
        body: { name, division: division || null, eventId: eventId || null },
      }),
    onSuccess: () => {
      setShowForm(false);
      setName('');
      setDivision('');
      setEventId('');
      void queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });

  const canManage = hasRole('SUPER_ADMIN', 'CONTENT_ADMIN', 'EVENT_COORDINATOR');

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    createFolder.mutate();
  };

  return (
    <div>
      <PageHeader
        title="Folder Aktivitas"
        subtitle="Dokumentasi pendukung per kegiatan/divisi (maks. 25MB per file)"
        action={canManage && (
          <button type="button" className="btn-primary flex items-center gap-1.5 shadow-sm" onClick={() => setShowForm((v) => !v)}>
            <IconPlus size={18} />
            Buat Folder
          </button>
        )}
      />

      {showForm && (
        <form onSubmit={onCreate} className="card mb-4 grid gap-3 p-4 sm:grid-cols-4 border border-sun-200 bg-sun-50/30">
          <input required placeholder="Nama folder *" className="input bg-white" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Divisi" className="input bg-white" value={division} onChange={(e) => setDivision(e.target.value)} />
          <select className="input bg-white" value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="">(Tanpa kegiatan)</option>
            {(events.data?.events ?? []).map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.title}</option>
            ))}
          </select>
          <button type="submit" disabled={createFolder.isPending} className="btn-primary">Simpan</button>
          {createFolder.error ? <div className="sm:col-span-4"><ErrorNote error={createFolder.error} /></div> : null}
        </form>
      )}

      {isLoading ? (
        <PageLoader />
      ) : (data?.folders ?? []).length === 0 ? (
        <EmptyState icon={<IconFolder size={36} />} title="Belum ada folder" subtitle="Folder dibuat per kegiatan atau divisi." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data!.folders.map((f) => (
            <Link key={f.id} href={`/files/${f.id}`} className="card flex items-center gap-3.5 p-4 hover:bg-neutral-50 transition border border-neutral-200/80 group">
              <div className="p-3 bg-sun-100/70 text-sun-700 rounded-xl group-hover:bg-sun-500 group-hover:text-white transition-colors duration-200">
                <IconFolder size={24} />
              </div>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-neutral-900 leading-snug">{f.name}</span>
                <span className="block truncate text-xs font-medium text-neutral-500 mt-0.5">
                  {f.event?.title ?? 'Umum'}
                  {f.division ? ` · ${f.division}` : ''} · {f._count?.files ?? 0} file · {formatDate(f.createdAt)}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
