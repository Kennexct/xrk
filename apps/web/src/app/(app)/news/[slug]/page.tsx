'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Avatar, PageLoader, StatusBadge } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import { NEWS_CATEGORY_LABELS, type News } from '@/lib/types';

export default function NewsDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { hasRole } = useAuth();
  const isEditor = hasRole('SUPER_ADMIN', 'CONTENT_ADMIN');

  const { data, isLoading } = useQuery({
    queryKey: ['news-post', slug],
    queryFn: () => api<{ post: News }>(`/api/news/${slug}`),
  });

  if (isLoading) return <PageLoader />;
  if (!data?.post) return <p className="py-20 text-center text-neutral-500">Berita tidak ditemukan.</p>;

  const post = data.post;

  return (
    <article className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="badge bg-sun-100 text-sun-800">{NEWS_CATEGORY_LABELS[post.category]}</span>
        {post.status !== 'PUBLISHED' && <StatusBadge status={post.status} />}
        {isEditor && (
          <span className="ml-auto flex gap-2">
            <Link href={`/news/editor?id=${post.id}`} className="btn-secondary">✏️ Edit</Link>
            <button
              type="button"
              className="btn-danger"
              onClick={async () => {
                if (!confirm('Hapus berita ini?')) return;
                await api(`/api/news/${post.id}`, { method: 'DELETE' });
                router.replace('/news');
              }}
            >
              Hapus
            </button>
          </span>
        )}
      </div>

      <h1 className="text-2xl font-bold sm:text-3xl">{post.title}</h1>
      <div className="mt-3 flex items-center gap-2 text-sm text-neutral-500">
        <Avatar name={post.author?.name ?? '?'} src={post.author?.avatarUrl} size={28} />
        <span>{post.author?.name}</span>
        <span>·</span>
        <time>{formatDateTime(post.publishedAt ?? post.createdAt)}</time>
      </div>

      {post.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.coverImageUrl} alt="" className="mt-5 max-h-96 w-full rounded-xl object-cover" />
      )}

      <div className="prose-syt mt-6 whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-800">
        {post.content}
      </div>

      {post.tags.length > 0 && (
        <p className="mt-6 text-sm text-sun-700">{post.tags.map((t) => `#${t}`).join('  ')}</p>
      )}
    </article>
  );
}
