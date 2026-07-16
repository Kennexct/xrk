'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, API_URL, getAccessToken } from '@/lib/api';
import { Avatar, EmptyState, PageHeader, PageLoader } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import type { ActivityLog, User } from '@/lib/types';

export default function AdminActivityPage() {
  const [userId, setUserId] = useState('');
  const [actionType, setActionType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const query = {
    userId: userId || undefined,
    actionType: actionType || undefined,
    from: from ? new Date(from).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
    page,
  };

  const online = useQuery({
    queryKey: ['admin-online'],
    queryFn: () => api<{ online: Pick<User, 'id' | 'name' | 'division' | 'role' | 'avatarUrl'>[]; count: number }>('/api/activity/online'),
    refetchInterval: 15_000,
  });
  const users = useQuery({ queryKey: ['users'], queryFn: () => api<{ users: User[] }>('/api/users') });
  const logs = useQuery({
    queryKey: ['activity-logs', query],
    queryFn: () =>
      api<{ logs: ActivityLog[]; total: number; pageSize: number }>('/api/activity/logs', { query }),
  });

  const exportCsv = async () => {
    const url = new URL(`${API_URL}/api/activity/logs`);
    for (const [k, v] of Object.entries({ ...query, format: 'csv' })) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
    const res = await fetch(url, { headers: { Authorization: `Bearer ${getAccessToken()}` } });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'activity-logs.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const totalPages = logs.data ? Math.max(1, Math.ceil(logs.data.total / logs.data.pageSize)) : 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Log Aktivitas"
        subtitle="Audit trail append-only — hanya Super Admin"
        action={<button type="button" onClick={exportCsv} className="btn-secondary">⬇️ Ekspor CSV</button>}
      />

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">🟢 Online sekarang ({online.data?.count ?? 0})</h2>
        {(online.data?.online ?? []).length === 0 ? (
          <p className="text-sm text-neutral-500">Tidak ada user yang online.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {online.data!.online.map((u) => (
              <span key={u.id} className="flex items-center gap-2 rounded-full bg-green-50 py-1 pl-1 pr-3 text-sm">
                <Avatar name={u.name} src={u.avatarUrl} size={26} online />
                {u.name}
              </span>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 grid gap-2 sm:grid-cols-4">
          <select className="input" value={userId} onChange={(e) => { setUserId(e.target.value); setPage(1); }} aria-label="Filter user">
            <option value="">Semua user</option>
            {(users.data?.users ?? []).map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <input
            placeholder="Jenis aksi (mis. login)"
            className="input"
            value={actionType}
            onChange={(e) => { setActionType(e.target.value); setPage(1); }}
            aria-label="Filter jenis aksi"
          />
          <input type="date" className="input" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} aria-label="Dari tanggal" />
          <input type="date" className="input" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} aria-label="Sampai tanggal" />
        </div>

        {logs.isLoading ? (
          <PageLoader />
        ) : (logs.data?.logs ?? []).length === 0 ? (
          <EmptyState icon="📋" title="Tidak ada log untuk filter ini" />
        ) : (
          <>
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase text-neutral-500">
                    <th className="px-4 py-3">Waktu</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Aksi</th>
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {logs.data!.logs.map((log) => (
                    <tr key={log.id}>
                      <td className="whitespace-nowrap px-4 py-2.5 text-neutral-500">{formatDateTime(log.createdAt)}</td>
                      <td className="px-4 py-2.5">
                        {log.user ? (
                          <span className="flex items-center gap-2">
                            <Avatar name={log.user.name} src={log.user.avatarUrl} size={24} />
                            {log.user.name}
                          </span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5"><code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">{log.actionType}</code></td>
                      <td className="px-4 py-2.5 text-neutral-500">
                        {log.targetType ? `${log.targetType}${log.targetId ? ` · ${log.targetId.slice(0, 10)}…` : ''}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-neutral-400">{log.ipAddress ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <button type="button" className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Sebelumnya
                </button>
                <span className="text-sm text-neutral-500">Hal {page} / {totalPages}</span>
                <button type="button" className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Berikutnya
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
