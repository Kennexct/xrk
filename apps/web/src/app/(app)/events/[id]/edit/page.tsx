'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader, PageLoader } from '@/components/ui';
import { EventForm } from '@/components/EventForm';
import type { SytEvent } from '@/lib/types';

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api<{ event: SytEvent }>(`/api/events/${id}`),
  });

  if (isLoading) return <PageLoader />;
  if (!data?.event) return <p className="py-20 text-center text-neutral-500">Kegiatan tidak ditemukan.</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Edit Kegiatan" />
      <EventForm existing={data.event} />
    </div>
  );
}
