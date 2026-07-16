'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, API_URL, getAccessToken } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Avatar, PageLoader, StatusBadge } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import type { RsvpStatus, SytEvent } from '@/lib/types';

const RSVP_OPTIONS: { value: RsvpStatus; label: string }[] = [
  { value: 'GOING', label: '✅ Hadir' },
  { value: 'MAYBE', label: '🤔 Mungkin' },
  { value: 'NOT_GOING', label: '❌ Tidak hadir' },
];

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api<{ event: SytEvent }>(`/api/events/${id}`),
  });

  const rsvp = useMutation({
    mutationFn: (status: RsvpStatus) => api(`/api/events/${id}/rsvp`, { method: 'POST', body: { status } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event', id] }),
  });

  if (isLoading) return <PageLoader />;
  if (!data?.event) return <p className="py-20 text-center text-neutral-500">Kegiatan tidak ditemukan.</p>;

  const event = data.event;
  const canWrite = hasRole('SUPER_ADMIN', 'EVENT_COORDINATOR');
  const going = (event.rsvps ?? []).filter((r) => r.status === 'GOING');
  const maybe = (event.rsvps ?? []).filter((r) => r.status === 'MAYBE');

  const downloadIcs = async () => {
    const res = await fetch(`${API_URL}/api/events/${id}/ics`, {
      headers: { Authorization: `Bearer ${getAccessToken()}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={event.status} />
          <span className="ml-auto flex gap-2">
            <button type="button" onClick={downloadIcs} className="btn-secondary">📆 Simpan ke kalender (.ics)</button>
            {canWrite && (
              <>
                <Link href={`/events/${id}/edit`} className="btn-secondary">✏️ Edit</Link>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={async () => {
                    if (!confirm('Hapus kegiatan ini?')) return;
                    await api(`/api/events/${id}`, { method: 'DELETE' });
                    router.replace('/calendar');
                  }}
                >
                  Hapus
                </button>
              </>
            )}
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-bold">{event.title}</h1>
        <dl className="mt-3 space-y-1 text-sm text-neutral-600">
          <div>🕐 {formatDateTime(event.startTime)} — {formatDateTime(event.endTime)}</div>
          {event.location && <div>📍 {event.location}</div>}
          {event.picName && <div>👤 PIC: {event.picName}</div>}
          <div className="text-xs text-neutral-400">Dibuat oleh {event.creator?.name}</div>
        </dl>
      </div>

      {event.description && (
        <div className="card whitespace-pre-wrap p-5 text-sm leading-relaxed text-neutral-700">{event.description}</div>
      )}

      {event.attachmentUrls.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-2 font-semibold">Lampiran</h2>
          <ul className="space-y-1 text-sm">
            {event.attachmentUrls.map((url) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noreferrer" className="text-sun-700 hover:underline">
                  🔗 {url.split('/').pop()}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card p-5">
        <h2 className="font-semibold">Konfirmasi kehadiran</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {RSVP_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={rsvp.isPending}
              onClick={() => rsvp.mutate(opt.value)}
              className={event.myRsvp === opt.value ? 'btn-primary' : 'btn-secondary'}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium text-neutral-500">Hadir ({going.length})</h3>
            <ul className="mt-2 space-y-1.5">
              {going.map((r) => (
                <li key={r.userId} className="flex items-center gap-2 text-sm">
                  <Avatar name={r.user.name} src={r.user.avatarUrl} size={26} />
                  {r.user.name}
                  {r.user.division && <span className="text-xs text-neutral-400">({r.user.division})</span>}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-medium text-neutral-500">Mungkin ({maybe.length})</h3>
            <ul className="mt-2 space-y-1.5">
              {maybe.map((r) => (
                <li key={r.userId} className="flex items-center gap-2 text-sm">
                  <Avatar name={r.user.name} src={r.user.avatarUrl} size={26} />
                  {r.user.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {(event.folders ?? []).length > 0 && (
        <div className="card p-5">
          <h2 className="mb-2 font-semibold">Folder dokumentasi</h2>
          <ul className="space-y-1 text-sm">
            {event.folders!.map((f) => (
              <li key={f.id}>
                <Link href={`/files/${f.id}`} className="text-sun-700 hover:underline">
                  📁 {f.name} ({f._count.files} file)
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
