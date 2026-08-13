'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { Avatar, PageHeader, PageLoader } from '@/components/ui';
import { IconUserPlus, IconSearch } from '@/components/Icons';
import { InviteMemberModal } from '@/components/InviteMemberModal';
import { formatRelative } from '@/lib/format';
import { ROLE_LABELS, type User } from '@/lib/types';

export default function MembersPage() {
  const { hasRole } = useAuth();
  const { t } = useTheme();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api<{ users: User[] }>('/api/users'),
  });

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

  const canManage = hasRole('SUPER_ADMIN', 'CONTENT_ADMIN', 'EVENT_COORDINATOR');
  const q = search.toLowerCase();
  const users = (data?.users ?? []).filter(
    (u) =>
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.division ?? '').toLowerCase().includes(q),
  );
  const onlineCount = users.filter((u) => u.isOnline).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.memberDirectory}
        subtitle={`${data?.users.length ?? 0} ${t.members.toLowerCase()} · ${onlineCount} ${t.onlineNow.toLowerCase()}`}
        action={
          canManage && (
            <button
              type="button"
              onClick={() => setIsInviteOpen(true)}
              className="btn-primary flex items-center gap-2 shadow-sm"
            >
              <IconUserPlus size={18} />
              <span>{t.addMember}</span>
            </button>
          )
        }
      />

      <div className="relative max-w-md">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-400">
          <IconSearch size={18} />
        </span>
        <input
          type="search"
          placeholder={t.searchMembers}
          className="input pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={t.searchMembers}
        />
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
        {users.map((u) => (
          <div
            key={u.id}
            className="card flex items-center gap-3.5 p-4 hover:shadow-md transition border border-neutral-200/80 dark:border-neutral-800"
          >
            <Avatar name={u.name} src={u.avatarUrl} size={46} online={u.isOnline} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-neutral-900 dark:text-neutral-100 text-sm leading-snug">{u.name}</p>
              <p className="truncate text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
                {[u.division, ROLE_LABELS[u.role]].filter(Boolean).join(' · ')}
              </p>
              <p className="text-xs font-medium mt-1">
                {u.isOnline ? (
                  <span className="text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    Online
                  </span>
                ) : u.lastSeenAt ? (
                  <span className="text-neutral-400">{`${t.lastSeen} ${formatRelative(u.lastSeenAt)}`}</span>
                ) : (
                  <span className="text-neutral-400">Offline</span>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Invite Member Modal */}
      <InviteMemberModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} />
    </div>
  );
}
