'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { Avatar, PageHeader, PageLoader, StatusBadge } from '@/components/ui';
import { IconUserPlus, IconLock } from '@/components/Icons';
import { InviteMemberModal } from '@/components/InviteMemberModal';
import { formatDate } from '@/lib/format';
import { ROLE_LABELS, type Role, type User } from '@/lib/types';

const ROLES = Object.keys(ROLE_LABELS) as Role[];

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const { t } = useTheme();
  const queryClient = useQueryClient();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  const users = useQuery({ queryKey: ['users'], queryFn: () => api<{ users: User[] }>('/api/users') });

  const updateUser = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api(`/api/users/${id}`, { method: 'PATCH', body }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const resetPassword = useMutation({
    mutationFn: (userId: string) =>
      api<{ ok: boolean; message: string; defaultPassword: string }>(`/api/users/${userId}/reset-password`, {
        method: 'POST',
      }),
    onSuccess: (res, userId) => {
      const u = users.data?.users.find((user) => user.id === userId);
      setResetSuccessMsg(`Password ${u?.name ?? 'anggota'} berhasil direset ke ${res.defaultPassword}!`);
      setTimeout(() => setResetSuccessMsg(null), 5000);
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  if (users.isLoading) return <PageLoader />;

  return (
    <div className="space-y-8">
      <PageHeader
        title={t.memberDirectory}
        subtitle="Registrasi anggota oleh Pengurus / Admin"
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

      {resetSuccessMsg && (
        <div className="p-4 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-xl text-sm font-semibold text-green-800 dark:text-green-300">
          ✅ {resetSuccessMsg}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="font-bold text-lg text-neutral-900 dark:text-neutral-100">
          Anggota Terdaftar ({users.data?.users.length ?? 0})
        </h2>
        <div className="card overflow-x-auto border border-neutral-200/80 dark:border-neutral-800">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left text-xs font-bold uppercase tracking-wider text-neutral-500 bg-neutral-50/50 dark:bg-neutral-900/50">
                <th className="px-4 py-3.5">Nama</th>
                <th className="px-4 py-3.5">Divisi</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Aksi</th>
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
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={resetPassword.isPending}
                      onClick={() => {
                        if (confirm(`Reset password ${u.name} ke default (Sunflower123)?`)) {
                          resetPassword.mutate(u.id);
                        }
                      }}
                      className="btn-secondary !py-1 text-xs flex items-center gap-1.5 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400 transition"
                      title="Reset password ke Sunflower123"
                    >
                      <IconLock size={14} />
                      <span>Reset Password</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Invite / Add Modal */}
      <InviteMemberModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} />
    </div>
  );
}
