'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { formatRelative } from '@/lib/format';
import type { Notification } from '@/lib/types';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<{ notifications: Notification[]; unread: number }>('/api/notifications'),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onNew = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
    socket.on('notification:new', onNew);
    return () => {
      socket.off('notification:new', onNew);
    };
  }, [queryClient]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const readAll = useMutation({
    mutationFn: () => api('/api/notifications/read-all', { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = data?.unread ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 text-neutral-600 hover:bg-neutral-100"
        aria-label={`Notifikasi${unread ? ` (${unread} belum dibaca)` : ''}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2.5">
            <span className="text-sm font-semibold">Notifikasi</span>
            {unread > 0 && (
              <button type="button" onClick={() => readAll.mutate()} className="text-xs text-sun-700 hover:underline">
                Tandai semua dibaca
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {(data?.notifications ?? []).length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-neutral-500">Belum ada notifikasi</li>
            )}
            {(data?.notifications ?? []).map((n) => (
              <li key={n.id} className={n.isRead ? '' : 'bg-sun-50'}>
                <Link
                  href={n.link ?? '#'}
                  onClick={() => {
                    setOpen(false);
                    void api(`/api/notifications/${n.id}/read`, { method: 'POST' }).then(() =>
                      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
                    );
                  }}
                  className="block px-4 py-3 hover:bg-neutral-50"
                >
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="truncate text-sm text-neutral-600">{n.message}</p>
                  <p className="mt-0.5 text-xs text-neutral-400">{formatRelative(n.createdAt)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
