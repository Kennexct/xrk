'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import { ErrorNote, Spinner } from '@/components/ui';

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
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-sun-50 to-amber-100 px-4">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <span className="text-4xl" aria-hidden>🌻</span>
          <h1 className="mt-2 text-xl font-semibold">Sunflower Youth Team</h1>
          <p className="text-sm text-neutral-500">Masuk ke portal organisasi</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <ErrorNote error={error} />
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? <Spinner /> : 'Masuk'}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-neutral-500">
          Akun dibuat melalui undangan pengurus. Hubungi admin jika belum menerima undangan.
        </p>
      </div>
    </main>
  );
}
