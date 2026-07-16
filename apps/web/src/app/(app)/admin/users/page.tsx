'use client';

import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Avatar, ErrorNote, PageHeader, PageLoader, StatusBadge } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { ROLE_LABELS, type Invitation, type Role, type User } from '@/lib/types';

const ROLES = Object.keys(ROLE_LABELS) as Role[];

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('MEMBER');
  const [copied, setCopied] = useState<string | null>(null);

  const users = useQuery({ queryKey: ['users'], queryFn: () => api<{ users: User[] }>('/api/users') });
  const invitations = useQuery({
    queryKey: ['invitations'],
    queryFn: () => api<{ invitations: Invitation[] }>('/api/users/invitations'),
  });

  const invite = useMutation({
    mutationFn: () =>
      api<{ invitation: Invitation }>('/api/users/invitations', { method: 'POST', body: { email, role } }),
    onSuccess: () => {
      setEmail('');
      void queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });

  const updateUser = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api(`/api/users/${id}`, { method: 'PATCH', body }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const copy = async (url: string, id: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const onInvite = (e: FormEvent) => {
    e.preventDefault();
    invite.mutate();
  };

  if (users.isLoading) return <PageLoader />;

  const pending = (invitations.data?.invitations ?? []).filter((i) => !i.acceptedAt);

  return (
    <div className="space-y-8">
      <PageHeader title="Kelola Anggota" subtitle="Registrasi hanya melalui undangan (PRD §5.1.1)" />

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">Undang anggota baru</h2>
        <form onSubmit={onInvite} className="flex flex-wrap gap-2">
          <input
            type="email"
            required
            placeholder="email@kampus.ac.id"
            className="input max-w-xs flex-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <select className="input w-auto" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
          <button type="submit" disabled={invite.isPending} className="btn-primary">Buat Undangan</button>
        </form>
        {invite.error ? <div className="mt-2"><ErrorNote error={invite.error} /></div> : null}

        {pending.length > 0 && (
          <ul className="mt-4 divide-y divide-neutral-100 border-t border-neutral-100">
            {pending.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
                <span className="font-medium">{inv.email}</span>
                <span className="badge bg-neutral-100 text-neutral-600">{ROLE_LABELS[inv.role]}</span>
                <span className="text-xs text-neutral-400">kedaluwarsa {formatDate(inv.expiresAt)}</span>
                <span className="ml-auto flex gap-2">
                  {inv.inviteUrl && (
                    <button type="button" className="btn-secondary !py-1 text-xs" onClick={() => void copy(inv.inviteUrl!, inv.id)}>
                      {copied === inv.id ? '✓ Disalin' : '🔗 Salin tautan'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-secondary !py-1 text-xs text-red-600"
                    onClick={async () => {
                      await api(`/api/users/invitations/${inv.id}`, { method: 'DELETE' });
                      void queryClient.invalidateQueries({ queryKey: ['invitations'] });
                    }}
                  >
                    Batalkan
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Anggota ({users.data?.users.length ?? 0})</h2>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase text-neutral-500">
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Divisi</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Bergabung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {users.data!.users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2.5">
                      <Avatar name={u.name} src={u.avatarUrl} size={30} online={u.isOnline} />
                      <span>
                        <span className="block font-medium">{u.name}</span>
                        <span className="block text-xs text-neutral-400">{u.email}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5">{u.division ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <select
                      className="input !w-auto !py-1 text-xs"
                      value={u.role}
                      disabled={u.id === me?.id || updateUser.isPending}
                      onChange={(e) => updateUser.mutate({ id: u.id, body: { role: e.target.value } })}
                      aria-label={`Role ${u.name}`}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
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
                  <td className="px-4 py-2.5 text-neutral-500">{formatDate(u.lastSeenAt ?? new Date().toISOString())}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
