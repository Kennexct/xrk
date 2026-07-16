import { prisma } from '../../lib/prisma';
import { logActivity } from '../activity/log';
import { notifyAllMembers } from '../notifications/service';

/**
 * Scheduled publishing (PRD §5.1.4): every minute, flip SCHEDULED posts whose
 * publishAt has passed to PUBLISHED and notify members.
 */
async function publishDueNews(): Promise<void> {
  const due = await prisma.news.findMany({
    where: { status: 'SCHEDULED', publishAt: { lte: new Date() } },
  });
  for (const post of due) {
    await prisma.news.update({
      where: { id: post.id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
    logActivity({
      userId: post.authorId,
      actionType: 'publish_news',
      targetType: 'news',
      targetId: post.id,
      metadata: { title: post.title, scheduled: true },
    });
    void notifyAllMembers(
      { type: 'news', title: 'Berita baru', message: post.title, link: `/news/${post.slug}` },
      post.authorId,
    );
  }
}

export function startNewsScheduler(): NodeJS.Timeout {
  const timer = setInterval(() => {
    publishDueNews().catch((err) => console.error('news scheduler error:', err.message));
  }, 60_000);
  timer.unref();
  return timer;
}
