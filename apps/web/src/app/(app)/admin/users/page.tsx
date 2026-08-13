'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { Avatar, PageHeader, PageLoader, StatusBadge } from '@/components/ui';
import { IconUserPlus, IconCopy, IconCheck, IconTrash } from '@/components/Icons';
import { InviteMemberModal } from '@/components/InviteMemberModal';
import { formatDate } from '@/lib/format';
import { ROLE_LABELS, type Invitation, type Role, type User } from '@/lib/types';

const ROLES = Object.keys(ROLE_LABELS) as Role[];

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const { t } = useTheme();
  const queryClient = useQueryClient();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const users = useQuery({ queryKey: ['users'], queryFn: () => api<{ users: User[] }>('/api/users') });
  const invitations = useQuery({
    queryKey: ['invitations'],
    queryFn: () => api<{ invitations: Invitation[] }>('/api/users/invitations'),
  });

  const updateUser = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api(`/api/users/${id}`, { method: 'PATCH', body }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const copy = async (url: string, id: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2500);
  };

  if (users.isLoading) return <PageLoader />;

  const pending = (invitations.data?.invitations ?? []).filter((i) => !i.acceptedAt);

  return (
    <div className="space-y-8">
      <PageHeader
        title={t.memberDirectory}
        subtitle="Registrasi hanya melalui undangan pengurus"
        action={
          <button
            type="button"
            onClick={() => setIsInviteOpen(true)}
            className="btn-primary flex items-center gap-2 shadow-sm"
          >
            <IconUserPlus size={18} />
            <span>{t.addMember}</span>
          </button>
        }
      />

      {pending.length > 0 && (
        <section className="card p-5 border border-sun-200/80 bg-sun-50/20 dark:bg-sun-950/20 space-y-3">
          <h2 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <IconUserPlus size={18} className="text-sun-600" />
            <span>Undangan Menunggu ({pending.length})</span>
          </h2>
          <ul className="divide-y divide-neutral-200/60 dark:divide-neutral-800">
            {pending.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center gap-2.5 py-3 text-sm">
                <span className="font-bold text-neutral-900 dark:text-neutral-100">{inv.email}</span>
                <span className="badge bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium">
                  {ROLE_LABELS[inv.role]}
                </span>
                <span className="text-xs text-neutral-400">kedaluwarsa {formatDate(inv.expiresAt)}</span>
                <span className="ml-auto flex gap-2">
                  {inv.inviteUrl && (
                    <button
                      type="button"
                      className="btn-secondary !py-1 text-xs flex items-center gap-1.5"
                      onClick={() => void copy(inv.inviteUrl!, inv.id)}
                    >
                      {copied === inv.id ? <IconCheck size={14} className="text-green-600" /> : <IconCopy size={14} />}
                      <span>{copied === inv.id ? t.linkCopied : t.copyInviteLink}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-secondary !py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    onClick={async () => {
                      await api(`/api/users/invitations/${inv.id}`, { method: 'DELETE' });
                      void queryClient.invalidateQueries({ queryKey: ['invitations'] });
                    }}
                  >
                    <IconTrash size={14} />
                    <span>Batalkan</span>
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="font-bold text-lg text-neutral-900 dark:text-neutral-100">
          Anggota Terdaftar ({users.data?.users.length ?? 0})
        </h2>
        <div className="card overflow-x-auto border border-neutral-200/80 dark:border-neutral-800">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left text-xs font-bold uppercase tracking-wider text-neutral-500 bg-neutral-50/50 dark:bg-neutral-900/50">
                <th className="px-4 py-3.5">Nama</th>
                <th className="px-4 py-3.5">Divisi</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Bergabung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {users.data!.users.map((u) => (
                <tr key={u.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50 transition">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-3">
                      <Avatar name={u.name} src={u.avatarUrl} size={34} online={u.isOnline} />
                      <span>
                        <span className="block font-bold text-neutral-900 dark:text-neutral-100">{u.name}</span>
                        <span className="block text-xs font-medium text-neutral-400">{u.email}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-neutral-700 dark:text-neutral-300">{u.division ?? '—'}</td>
                  <td className="px-4 py-3">
                    <select
                      className="input !w-auto !py-1 text-xs font-semibold bg-white dark:bg-neutral-900"
                      value={u.role}
                      disabled={u.id === me?.id || updateUser.isPending}
                      onChange={(e) => updateUser.mutate({ id: u.id, body: { role: e.target.value } })}
                      aria-label={`Role ${u.name}`}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={u.id === me?.id || updateUser.isPending}
                      onClick={() =>
                        updateUser.mutate({ id: u.id, body: { status: u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } })
                      }
                      title="Klik untuk mengubah status"
                    >
                      <StatusBadge status={u.status} label={u.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-neutral-400">
                    {formatDate(u.lastSeenAt ?? new Date().toISOString())}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Invite Modal */}
      <InviteMemberModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} />
    </div>
  );
}
