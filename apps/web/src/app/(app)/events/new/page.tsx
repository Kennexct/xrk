'use client';

import { PageHeader } from '@/components/ui';
import { EventForm } from '@/components/EventForm';

export default function NewEventPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Buat Kegiatan" subtitle="Seluruh anggota akan menerima notifikasi" />
      <EventForm />
    </div>
  );
}
