'use client';

import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { ErrorNote, Spinner } from './ui';
import { IconUserPlus, IconX, IconCopy, IconCheck, IconMail } from './Icons';
import { ROLE_LABELS, type Invitation, type Role } from '@/lib/types';

const ROLES = Object.keys(ROLE_LABELS) as Role[];

export function InviteMemberModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTheme();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('MEMBER');
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const invite = useMutation({
    mutationFn: () =>
      api<{ invitation: { id: string; email: string; role: Role; inviteUrl: string } }>('/api/users/invitations', {
        method: 'POST',
        body: { email, role },
      }),
    onSuccess: (res) => {
      setGeneratedUrl(res.invitation.inviteUrl);
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      void queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setGeneratedUrl(null);
    setCopied(false);
    invite.mutate();
  };

  const handleCopy = async () => {
    if (!generatedUrl) return;
    await navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
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
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <IconX size={18} />
          </button>
        </div>

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

          {invite.error && <ErrorNote error={invite.error} />}

          {!generatedUrl ? (
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary">
                {t.cancel}
              </button>
              <button type="submit" disabled={invite.isPending} className="btn-primary">
                {invite.isPending ? <Spinner /> : t.createInviteLink}
              </button>
            </div>
          ) : (
            <div className="p-4 bg-sun-50 dark:bg-sun-950/40 border border-sun-200 dark:border-sun-800/60 rounded-xl space-y-2">
              <p className="text-xs font-semibold text-sun-800 dark:text-sun-300">Tautan undangan berhasil dibuat:</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedUrl}
                  className="input text-xs font-mono select-all bg-white dark:bg-neutral-900"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`btn ${copied ? 'bg-green-600 text-white' : 'btn-primary'} px-3 shrink-0 text-xs`}
                >
                  {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                  <span>{copied ? t.linkCopied : t.copyInviteLink}</span>
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
