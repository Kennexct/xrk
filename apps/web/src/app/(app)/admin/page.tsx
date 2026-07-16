'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui';

interface Summary {
  totalUsers: number;
  activeUsersLast30d: number;
  onlineNow: number;
  topActionsLast30d: { actionType: string; count: number }[];
}

export default function AdminHomePage() {
  const { data } = useQuery({
    queryKey: ['admin-summary'],
    queryFn: () => api<Summary>('/api/activity/summary'),
  });

  return (
    <div>
      <PageHeader title="Dashboard Admin" subtitle="Ringkasan aktivitas organisasi (30 hari terakhir)" />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Anggota terdaftar" value={data?.totalUsers} icon="👥" />
        <StatCard label="Aktif login (30 hari)" value={data?.activeUsersLast30d} icon="📈" />
        <StatCard label="Online sekarang" value={data?.onlineNow} icon="🟢" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link href="/admin/users" className="card p-5 hover:bg-neutral-50">
          <p className="font-semibold">🛡️ Kelola Anggota & Undangan</p>
          <p className="mt-1 text-sm text-neutral-500">Undang anggota baru, atur role dan status akun.</p>
        </Link>
        <Link href="/admin/activity" className="card p-5 hover:bg-neutral-50">
          <p className="font-semibold">📋 Log Aktivitas</p>
          <p className="mt-1 text-sm text-neutral-500">Siapa online, riwayat aksi per user, ekspor CSV.</p>
        </Link>
      </div>

      {(data?.topActionsLast30d ?? []).length > 0 && (
        <div className="card mt-6 p-5">
          <h2 className="mb-3 font-semibold">Aksi terbanyak (30 hari)</h2>
          <ul className="space-y-1.5">
            {data!.topActionsLast30d.map((a) => (
              <li key={a.actionType} className="flex items-center justify-between text-sm">
                <code className="text-neutral-600">{a.actionType}</code>
                <span className="font-medium">{a.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value?: number; icon: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-neutral-500">{icon} {label}</p>
      <p className="mt-1 text-3xl font-bold">{value ?? '—'}</p>
    </div>
  );
}
