import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../lib/errors';
import { requireAuth } from '../../middleware/auth';
import { parseQuery } from '../../middleware/validate';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

notificationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = parseQuery(listQuery, req);
    const where = { userId: req.auth!.sub };
    const [notifications, total, unread] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { ...where, isRead: false } }),
    ]);
    res.json({ notifications, total, unread });
  }),
);

notificationsRouter.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { userId: req.auth!.sub, isRead: false },
      data: { isRead: true },
    });
    res.json({ ok: true });
  }),
);

notificationsRouter.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.auth!.sub },
      data: { isRead: true },
    });
    res.json({ ok: true });
  }),
);
