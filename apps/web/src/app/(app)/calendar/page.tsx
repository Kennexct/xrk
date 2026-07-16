'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { EmptyState, PageHeader, PageLoader, StatusBadge } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import type { SytEvent } from '@/lib/types';

type View = 'month' | 'timeline';

export default function CalendarPage() {
  const { hasRole } = useAuth();
  const [view, setView] = useState<View>('month');
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });

  const { data, isLoading } = useQuery({
    queryKey: ['events', cursor.toISOString(), view],
    queryFn: () =>
      api<{ events: SytEvent[] }>('/api/events', {
        query:
          view === 'month'
            ? { from: gridStart.toISOString(), to: gridEnd.toISOString(), pageSize: 100 }
            : { pageSize: 100 },
      }),
  });

  const events = data?.events ?? [];
  const days = useMemo(() => {
    const out: Date[] = [];
    for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) out.push(d);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  const canWrite = hasRole('SUPER_ADMIN', 'EVENT_COORDINATOR');

  return (
    <div>
      <PageHeader
        title="Kalender Kegiatan"
        action={canWrite && <Link href="/events/new" className="btn-primary">+ Buat Kegiatan</Link>}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary" onClick={() => setCursor((c) => addMonths(c, -1))} aria-label="Bulan sebelumnya">←</button>
          <span className="min-w-36 text-center font-semibold capitalize">
            {format(cursor, 'MMMM yyyy', { locale: localeId })}
          </span>
          <button type="button" className="btn-secondary" onClick={() => setCursor((c) => addMonths(c, 1))} aria-label="Bulan berikutnya">→</button>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setView('month')} className={view === 'month' ? 'btn-primary' : 'btn-secondary'}>
            📅 Bulanan
          </button>
          <button type="button" onClick={() => setView('timeline')} className={view === 'timeline' ? 'btn-primary' : 'btn-secondary'}>
            📋 Timeline
          </button>
        </div>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : view === 'month' ? (
        <div className="card overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-7 border-b border-neutral-200 text-center text-xs font-medium text-neutral-500">
              {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d) => (
                <div key={d} className="py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const dayEvents = events.filter((e) => isSameDay(new Date(e.startTime), day));
                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-24 border-b border-r border-neutral-100 p-1.5 ${
                      isSameMonth(day, cursor) ? '' : 'bg-neutral-50 text-neutral-400'
                    }`}
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                        isToday(day) ? 'bg-sun-500 font-bold text-neutral-900' : ''
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    <ul className="mt-0.5 space-y-0.5">
                      {dayEvents.slice(0, 3).map((e) => (
                        <li key={e.id}>
                          <Link
                            href={`/events/${e.id}`}
                            className="block truncate rounded bg-sun-100 px-1.5 py-0.5 text-[11px] text-sun-900 hover:bg-sun-200"
                          >
                            {e.title}
                          </Link>
                        </li>
                      ))}
                      {dayEvents.length > 3 && (
                        <li className="px-1.5 text-[11px] text-neutral-400">+{dayEvents.length - 3} lagi</li>
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : events.length === 0 ? (
        <EmptyState icon="📅" title="Belum ada kegiatan" />
      ) : (
        <ol className="relative ml-3 space-y-4 border-l-2 border-sun-200 pl-6">
          {events.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full bg-sun-500 ring-4 ring-sun-100" aria-hidden />
              <Link href={`/events/${e.id}`} className="card block p-4 hover:bg-neutral-50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">{e.title}</h3>
                  <StatusBadge status={e.status} />
                </div>
                <p className="mt-1 text-sm text-neutral-500">
                  {formatDateTime(e.startTime)}
                  {e.location ? ` · 📍 ${e.location}` : ''}
                  {e.picName ? ` · PIC: ${e.picName}` : ''}
                </p>
                {typeof e.goingCount === 'number' && e.goingCount > 0 && (
                  <p className="mt-1 text-xs text-neutral-400">✅ {e.goingCount} hadir</p>
                )}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
