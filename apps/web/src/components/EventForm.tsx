'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { ErrorNote, Spinner } from '@/components/ui';
import type { SytEvent } from '@/lib/types';

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function EventForm({ existing }: { existing?: SytEvent }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: existing?.title ?? '',
    description: existing?.description ?? '',
    location: existing?.location ?? '',
    picName: existing?.picName ?? '',
    startTime: existing ? toLocalInput(existing.startTime) : '',
    endTime: existing ? toLocalInput(existing.endTime) : '',
  });
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const body = {
        title: form.title,
        description: form.description || null,
        location: form.location || null,
        picName: form.picName || null,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
      };
      const { event } = existing
        ? await api<{ event: SytEvent }>(`/api/events/${existing.id}`, { method: 'PATCH', body })
        : await api<{ event: SytEvent }>('/api/events', { method: 'POST', body });
      router.replace(`/events/${event.id}`);
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-6">
      <div>
        <label className="label" htmlFor="title">Judul kegiatan *</label>
        <input id="title" required minLength={3} className="input" value={form.title} onChange={set('title')} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="start">Mulai *</label>
          <input id="start" type="datetime-local" required className="input" value={form.startTime} onChange={set('startTime')} />
        </div>
        <div>
          <label className="label" htmlFor="end">Selesai *</label>
          <input id="end" type="datetime-local" required className="input" value={form.endTime} onChange={set('endTime')} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="location">Lokasi</label>
          <input id="location" className="input" value={form.location} onChange={set('location')} />
        </div>
        <div>
          <label className="label" htmlFor="pic">PIC</label>
          <input id="pic" className="input" value={form.picName} onChange={set('picName')} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="description">Deskripsi</label>
        <textarea id="description" rows={5} className="input" value={form.description} onChange={set('description')} />
      </div>
      <ErrorNote error={error} />
      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? <Spinner /> : existing ? 'Simpan Perubahan' : 'Buat Kegiatan'}
      </button>
    </form>
  );
}
