'use client';

import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { ErrorNote, Spinner } from './ui';
import { IconUserPlus, IconX, IconCheck, IconMail, IconUser } from './Icons';
import { ROLE_LABELS, type Role, type User } from '@/lib/types';

const ROLES = Object.keys(ROLE_LABELS) as Role[];

export function InviteMemberModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTheme();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('MEMBER');
  const [division, setDivision] = useState('');
  const [createdUser, setCreatedUser] = useState<{ user: User; defaultPassword: string } | null>(null);

  const invite = useMutation({
    mutationFn: () =>
      api<{ ok: boolean; user: User; defaultPassword: string }>('/api/users/invitations', {
        method: 'POST',
        body: { email, name: name || undefined, role, division: division || undefined },
      }),
    onSuccess: (res) => {
      setCreatedUser({ user: res.user, defaultPassword: res.defaultPassword });
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      setEmail('');
      setName('');
      setDivision('');
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setCreatedUser(null);
    invite.mutate();
  };

  const handleClose = () => {
    setCreatedUser(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} aria-hidden />
      <div className="relative w-full max-w-md card p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 z-10 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sun-100 dark:bg-sun-900/40 text-sun-600 dark:text-sun-400 rounded-xl">
              <IconUserPlus size={20} />
            </div>
            <h2 className="font-bold text-lg text-neutral-900 dark:text-neutral-100">{t.addMember}</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <IconX size={18} />
          </button>
        </div>

        {!createdUser ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">{t.email} *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-400">
                  <IconMail size={18} />
                </span>
                <input
                  type="email"
                  required
                  placeholder={t.inviteEmailPlaceholder}
                  className="input pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="label">Nama Lengkap (opsional)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-400">
                  <IconUser size={18} />
                </span>
                <input
                  type="text"
                  placeholder="Masukkan nama lengkap"
                  className="input pl-10"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{t.selectRole}</label>
                <select
                  className="input bg-white dark:bg-neutral-900"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Divisi (opsional)</label>
                <input
                  type="text"
                  placeholder="Pengurus / Media / dll"
                  className="input"
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                />
              </div>
            </div>

            {invite.error && <ErrorNote error={invite.error} />}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={handleClose} className="btn-secondary">
                {t.cancel}
              </button>
              <button type="submit" disabled={invite.isPending} className="btn-primary">
                {invite.isPending ? <Spinner /> : 'Tambah Anggota'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/60 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-bold">
              <IconCheck size={20} />
              <span>Anggota Berhasil Ditambahkan!</span>
            </div>
            <div className="text-xs space-y-1 text-neutral-700 dark:text-neutral-300">
              <p>
                Email: <strong>{createdUser.user.email}</strong>
              </p>
              <p>
                Password Default: <strong className="text-sun-600 dark:text-sun-400 font-mono text-sm">{createdUser.defaultPassword}</strong>
              </p>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Saat anggota ini login pertama kali dengan password default <strong>{createdUser.defaultPassword}</strong>, sistem akan otomatis meminta mereka membuat password baru.
            </p>
            <div className="pt-2 flex justify-end">
              <button type="button" onClick={handleClose} className="btn-primary px-4 py-2 text-xs">
                Selesai
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
