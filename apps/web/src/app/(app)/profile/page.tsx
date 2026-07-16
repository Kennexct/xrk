'use client';

import { useState, type FormEvent } from 'react';
import { api, uploadToPresignedUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Avatar, ErrorNote, PageHeader, PageLoader, Spinner } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/types';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState(() => ({
    name: user?.name ?? '',
    nim: user?.nim ?? '',
    division: user?.division ?? '',
    phone: user?.phone ?? '',
  }));
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  if (!user) return <PageLoader />;

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      await api('/api/users/me', {
        method: 'PATCH',
        body: {
          name: form.name,
          nim: form.nim || null,
          division: form.division || null,
          phone: form.phone || null,
        },
      });
      await refreshUser();
      setSaved(true);
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true);
    setError(null);
    try {
      const presigned = await api<{ uploadUrl: string; fileUrl: string }>('/api/storage/presign', {
        method: 'POST',
        body: { kind: 'image', fileName: file.name, contentType: file.type, sizeBytes: file.size },
      });
      await uploadToPresignedUrl(presigned.uploadUrl, file);
      await api('/api/users/me', { method: 'PATCH', body: { avatarUrl: presigned.fileUrl } });
      await refreshUser();
    } catch (err) {
      setError(err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Profil Saya" />
      <div className="card space-y-5 p-6">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} src={user.avatarUrl} size={64} />
          <div>
            <p className="font-semibold">{user.email}</p>
            <p className="text-sm text-neutral-500">{ROLE_LABELS[user.role]}</p>
            <label className="mt-1 inline-block cursor-pointer text-sm text-sun-700 hover:underline">
              {uploadingAvatar ? 'Mengunggah…' : 'Ganti foto profil'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingAvatar}
                onChange={(e) => e.target.files?.[0] && void uploadAvatar(e.target.files[0])}
              />
            </label>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="label" htmlFor="name">Nama lengkap</label>
            <input id="name" required className="input" value={form.name} onChange={set('name')} />
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
          <ErrorNote error={error} />
          {saved && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Profil tersimpan ✓</p>}
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? <Spinner /> : 'Simpan'}
          </button>
        </form>
      </div>
    </div>
  );
}
