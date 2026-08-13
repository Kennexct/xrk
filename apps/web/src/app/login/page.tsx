'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { ErrorNote, Spinner } from '@/components/ui';
import { IconSunflower, IconMail, IconLock, IconCheck } from '@/components/Icons';

export default function LoginPage() {
  const { user, loading, login, setupPassword } = useAuth();
  const { t } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSetupPasswordMode, setIsSetupPasswordMode] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && !user.mustChangePassword && !isSetupPasswordMode) {
      router.replace('/dashboard');
    }
  }, [loading, user, router, isSetupPasswordMode]);

  const onLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await login(email.trim(), password);
      if (res.mustChangePassword || res.user.mustChangePassword) {
        setIsSetupPasswordMode(true);
      } else {
        router.replace('/dashboard');
      }
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const onSetupPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError(new Error('Konfirmasi password tidak cocok'));
      return;
    }
    if (newPassword.length < 8) {
      setError(new Error('Password minimal 8 karakter'));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await setupPassword(newPassword);
      router.replace('/dashboard');
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-amber-50/80 via-sun-50 to-amber-100/60 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 px-4">
      <div className="card w-full max-w-md p-8 shadow-xl border border-white/60 dark:border-neutral-800 backdrop-blur-md bg-white/90 dark:bg-neutral-900/90">
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="p-3 bg-amber-100/70 dark:bg-amber-950/50 rounded-2xl mb-3 shadow-inner">
            <IconSunflower size={48} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
            Sunflower Youth Team
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 font-medium">
            {isSetupPasswordMode ? 'Atur Password Baru Akun Anda' : t.loginTitle}
          </p>
        </div>

        {!isSetupPasswordMode ? (
          <form onSubmit={onLoginSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">
                {t.email}
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
                  className="input pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="password">
                {t.password}
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
                  className="input pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <ErrorNote error={error} />

            <button type="submit" disabled={submitting} className="btn-primary w-full py-3 shadow-lg shadow-sun-500/25">
              {submitting ? <Spinner /> : t.loginButton}
            </button>
          </form>
        ) : (
          <form onSubmit={onSetupPasswordSubmit} className="space-y-4">
            <div className="p-3 bg-sun-50 dark:bg-sun-950/40 border border-sun-200 dark:border-sun-800/60 rounded-xl text-xs font-semibold text-sun-900 dark:text-sun-300">
              🔑 Ini adalah login pertama / password default Anda (<strong>Sunflower123</strong>). Silakan buat password baru Anda sebelum melanjutkan.
            </div>

            <div>
              <label className="label" htmlFor="newPassword">
                Password Baru (min. 8 karakter) *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-400">
                  <IconLock size={18} />
                </span>
                <input
                  id="newPassword"
                  type="password"
                  required
                  minLength={8}
                  placeholder="Masukkan password baru"
                  className="input pl-10"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="confirmPassword">
                Ulangi Password Baru *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-400">
                  <IconCheck size={18} />
                </span>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  placeholder="Ulangi password baru"
                  className="input pl-10"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <ErrorNote error={error} />

            <button type="submit" disabled={submitting} className="btn-primary w-full py-3 shadow-lg shadow-sun-500/25">
              {submitting ? <Spinner /> : 'Simpan Password & Masuk'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
          Pendaftaran akun dilakukan oleh Admin/Pengurus. Password default login pertama: <strong>Sunflower123</strong>.
        </p>
      </div>
    </main>
  );
}
