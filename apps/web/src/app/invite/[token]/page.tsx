'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ErrorNote, PageLoader, Spinner } from '@/components/ui';
import { ROLE_LABELS, type Role, type User } from '@/lib/types';

import { IconSunflower } from '@/components/Icons';

interface InvitePreview {
  email: string;
  role: Role;
  invitedBy: string;
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { setSession } = useAuth();

  const { data, isLoading, error: loadError } = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => api<InvitePreview>(`/api/auth/invitations/${token}`),
    retry: false,
  });

  const [form, setForm] = useState({ name: '', password: '', confirm: '', nim: '', division: '', phone: '' });
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) return <PageLoader />;
  if (loadError || !data) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <div className="card max-w-md p-8 text-center">
          <p className="text-lg font-medium">Undangan tidak valid</p>
          <p className="mt-1 text-sm text-neutral-500">Tautan undangan sudah dipakai atau kedaluwarsa. Hubungi pengurus.</p>
        </div>
      </main>
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError(new Error('Konfirmasi password tidak cocok'));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const session = await api<{ accessToken: string; refreshToken: string; user: User }>(
        '/api/auth/accept-invitation',
        {
          method: 'POST',
          body: {
            token,
            name: form.name,
            password: form.password,
            nim: form.nim || undefined,
            division: form.division || undefined,
            phone: form.phone || undefined,
          },
        },
      );
      setSession(session);
      router.replace('/dashboard');
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  };

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-sun-50 to-amber-100 px-4 py-8">
      <div className="card w-full max-w-md p-8 shadow-xl">
        <div className="mb-6 text-center flex flex-col items-center">
          <IconSunflower size={44} className="mb-2" />
          <h1 className="text-xl font-bold">Selamat datang!</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {data.invitedBy} mengundang <strong>{data.email}</strong> bergabung sebagai{' '}
            <strong>{ROLE_LABELS[data.role]}</strong>.
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="label" htmlFor="name">Nama lengkap *</label>
            <input id="name" required minLength={2} className="input" value={form.name} onChange={set('name')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="nim">NIM</label>
              <input id="nim" className="input" value={form.nim} onChange={set('nim')} />
            </div>
            <div>
              <label className="label" htmlFor="division">Divisi</label>
              <input id="division" className="input" value={form.division} onChange={set('division')} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="phone">No. HP / WA</label>
            <input id="phone" className="input" value={form.phone} onChange={set('phone')} />
          </div>
          <div>
            <label className="label" htmlFor="password">Password (min. 8 karakter) *</label>
            <input id="password" type="password" required minLength={8} className="input" value={form.password} onChange={set('password')} />
          </div>
          <div>
            <label className="label" htmlFor="confirm">Ulangi password *</label>
            <input id="confirm" type="password" required className="input" value={form.confirm} onChange={set('confirm')} />
          </div>
          <ErrorNote error={error} />
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? <Spinner /> : 'Buat Akun & Masuk'}
          </button>
        </form>
      </div>
    </main>
  );
}
