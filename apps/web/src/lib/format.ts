import { format, formatDistanceToNow } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export const formatDate = (d: string | Date) => format(new Date(d), 'd MMM yyyy', { locale: localeId });

export const formatDateTime = (d: string | Date) =>
  format(new Date(d), 'd MMM yyyy, HH:mm', { locale: localeId });

export const formatRelative = (d: string | Date) =>
  formatDistanceToNow(new Date(d), { addSuffix: true, locale: localeId });

export const formatDuration = (sec: number | null | undefined): string => {
  if (!sec) return '';
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  return h > 0
    ? `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
    : `${m}:${String(s % 60).padStart(2, '0')}`;
};

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};
