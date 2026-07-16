import { prisma } from '../../lib/prisma';
import { emitToUser } from '../../realtime/gateway';

interface NotifyInput {
  type: string; // e.g. 'video', 'music', 'news', 'event'
  title: string;
  message: string;
  link?: string;
}

/**
 * Create an in-app notification for every active non-guest member and push it
 * over WebSocket to whoever is currently connected (PRD §5.1.8).
 */
export async function notifyAllMembers(input: NotifyInput, excludeUserId?: string): Promise<void> {
  const users = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      role: { not: 'GUEST' },
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  });
  if (users.length === 0) return;

  await prisma.notification.createMany({
    data: users.map((u) => ({ userId: u.id, ...input })),
  });

  for (const u of users) {
    emitToUser(u.id, 'notification:new', { ...input, createdAt: new Date().toISOString() });
  }
}

export async function notifyUser(userId: string, input: NotifyInput): Promise<void> {
  await prisma.notification.create({ data: { userId, ...input } });
  emitToUser(userId, 'notification:new', { ...input, createdAt: new Date().toISOString() });
}
