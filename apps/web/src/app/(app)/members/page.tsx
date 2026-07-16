'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Avatar, PageHeader, PageLoader } from '@/components/ui';
import { formatRelative } from '@/lib/format';
import { ROLE_LABELS, type User } from '@/lib/types';

export default function MembersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api<{ users: User[] }>('/api/users'),
  });

  // Presence updates arrive over WebSocket → refresh the directory live.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onPresence = () => queryClient.invalidateQueries({ queryKey: ['users'] });
    socket.on('presence:update', onPresence);
    return () => {
      socket.off('presence:update', onPresence);
    };
  }, [queryClient]);

  if (isLoading) return <PageLoader />;

  const q = search.toLowerCase();
  const users = (data?.users ?? []).filter(
    (u) => !q || u.name.toLowerCase().includes(q) || (u.division ?? '').toLowerCase().includes(q),
  );
  const online = users.filter((u) => u.isOnline).length;

  return (
    <div>
      <PageHeader title="Anggota" subtitle={`${data?.users.length ?? 0} anggota terdaftar · ${online} online`} />
      <input
        type="search"
        placeholder="Cari nama atau divisi…"
        className="input mb-4 max-w-sm"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Cari anggota"
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {users.map((u) => (
          <div key={u.id} className="card flex items-center gap-3 p-4">
            <Avatar name={u.name} src={u.avatarUrl} size={44} online={u.isOnline} />
            <div className="min-w-0">
              <p className="truncate font-medium">{u.name}</p>
              <p className="truncate text-xs text-neutral-500">
                {[u.division, ROLE_LABELS[u.role]].filter(Boolean).join(' · ')}
              </p>
              <p className="text-xs text-neutral-400">
                {u.isOnline ? (
                  <span className="text-green-600">● Online</span>
                ) : u.lastSeenAt ? (
                  `Terakhir aktif ${formatRelative(u.lastSeenAt)}`
                ) : (
                  'Belum pernah aktif'
                )}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
