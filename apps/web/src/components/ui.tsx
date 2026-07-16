'use client';

import type { ReactNode } from 'react';

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-sun-500 ${className}`}
      role="status"
      aria-label="Memuat"
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon?: string; title: string; subtitle?: string }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
      {icon && <span className="text-4xl" aria-hidden>{icon}</span>}
      <p className="font-medium text-neutral-700">{title}</p>
      {subtitle && <p className="text-sm text-neutral-500">{subtitle}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Avatar({
  name,
  src,
  size = 36,
  online,
}: {
  name: string;
  src?: string | null;
  size?: number;
  online?: boolean;
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full rounded-full object-cover" />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center rounded-full bg-sun-200 font-medium text-sun-900"
          style={{ fontSize: size * 0.38 }}
          aria-label={name}
        >
          {initials}
        </span>
      )}
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 block h-[30%] w-[30%] rounded-full ring-2 ring-white ${online ? 'bg-green-500' : 'bg-neutral-300'}`}
          title={online ? 'Online' : 'Offline'}
        />
      )}
    </span>
  );
}

const STATUS_STYLES: Record<string, string> = {
  UPCOMING: 'bg-blue-100 text-blue-700',
  ONGOING: 'bg-green-100 text-green-700',
  DONE: 'bg-neutral-200 text-neutral-600',
  PROCESSING: 'bg-amber-100 text-amber-700',
  READY: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  DRAFT: 'bg-neutral-200 text-neutral-600',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  PUBLISHED: 'bg-green-100 text-green-700',
  ARCHIVED: 'bg-neutral-200 text-neutral-500',
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-neutral-200 text-neutral-600',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <span className={`badge ${STATUS_STYLES[status] ?? 'bg-neutral-100 text-neutral-600'}`}>{label ?? status}</span>;
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : 'Terjadi kesalahan';
  return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>;
}
