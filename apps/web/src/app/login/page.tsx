'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import { ErrorNote, Spinner } from '@/components/ui';
import { IconSunflower, IconMail, IconLock } from '@/components/Icons';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [loading, user, router]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace('/dashboard');
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-amber-50/80 via-sun-50 to-amber-100/60 px-4">
      <div className="card w-full max-w-md p-8 shadow-xl border border-white/60 backdrop-blur-md bg-white/90">
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="p-3 bg-amber-100/70 rounded-2xl mb-3 shadow-inner">
            <IconSunflower size={48} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">Sunflower Youth Team</h1>
          <p className="mt-1 text-sm text-neutral-500 font-medium">Portal Resmi Anggota & Pengurus</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5 block" htmlFor="email">
              Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-400">
                <IconMail size={18} />
              </span>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="nama@email.com"
                className="input pl-10 focus:ring-2 focus:ring-sun-500 focus:border-sun-500 border-neutral-300 rounded-xl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5 block" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-400">
                <IconLock size={18} />
              </span>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="input pl-10 focus:ring-2 focus:ring-sun-500 focus:border-sun-500 border-neutral-300 rounded-xl"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <ErrorNote error={error} />
          <button type="submit" disabled={submitting} className="btn-primary w-full py-3 rounded-xl font-semibold shadow-lg shadow-sun-500/25">
            {submitting ? <Spinner /> : 'Masuk ke Portal'}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-neutral-500 leading-relaxed">
          Akun dibuat melalui undangan pengurus. Hubungi admin jika belum menerima undangan.
        </p>
      </div>
    </main>
  );
}
