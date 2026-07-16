import { Router } from 'express';
import { z } from 'zod';
import '@prisma/client';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../lib/errors';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { parseQuery } from '../../middleware/validate';
import { listOnlineUserIds } from '../../realtime/gateway';

/**
 * Admin activity dashboard (PRD §5.1.7): who is online now, per-user history,
 * date filters, CSV export. Read access is Super Admin only (PRD §10 privacy).
 */
export const activityRouter = Router();
activityRouter.use(requireAuth, requirePermission('activity_log:view'));

const listQuery = z.object({
  userId: z.string().optional(),
  actionType: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  format: z.enum(['json', 'csv']).default('json'),
});

const buildWhere = (q: z.infer<typeof listQuery>) => ({
  ...(q.userId ? { userId: q.userId } : {}),
  ...(q.actionType ? { actionType: q.actionType } : {}),
  ...(q.from || q.to
    ? { createdAt: { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) } }
    : {}),
});

activityRouter.get(
  '/logs',
  asyncHandler(async (req, res) => {
    const q = parseQuery(listQuery, req);
    const where = buildWhere(q);

    if (q.format === 'csv') {
      const logs = await prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 10_000,
        include: { user: { select: { name: true, email: true } } },
      });
      const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const rows = [
        ['timestamp', 'user', 'email', 'action', 'target_type', 'target_id', 'ip', 'user_agent'].join(','),
        ...logs.map((l: any) =>
          [
            l.createdAt.toISOString(),
            l.user?.name,
            l.user?.email,
            l.actionType,
            l.targetType,
            l.targetId,
            l.ipAddress,
            l.userAgent,
          ]
            .map(esc)
            .join(','),
        ),
      ];
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="activity-logs.csv"');
      return res.send(rows.join('\n'));
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      }),
      prisma.activityLog.count({ where }),
    ]);
    return res.json({ logs, total, page: q.page, pageSize: q.pageSize });
  }),
);

activityRouter.get(
  '/online',
  asyncHandler(async (_req, res) => {
    const ids = await listOnlineUserIds();
    const users = ids.length
      ? await prisma.user.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true, division: true, role: true, avatarUrl: true },
        })
      : [];
    res.json({ online: users, count: users.length });
  }),
);

activityRouter.get(
  '/summary',
  asyncHandler(async (_req, res) => {
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const [totalUsers, activeUsers, actions, onlineIds] = await Promise.all([
      prisma.user.count(),
      prisma.activityLog
        .groupBy({ by: ['userId'], where: { createdAt: { gte: since }, actionType: 'login' } })
        .then((g: any[]) => g.length),
      prisma.activityLog.groupBy({
        by: ['actionType'],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        orderBy: { _count: { actionType: 'desc' } },
        take: 10,
      }),
      listOnlineUserIds(),
    ]);
    res.json({
      totalUsers,
      activeUsersLast30d: activeUsers,
      onlineNow: onlineIds.length,
      topActionsLast30d: actions.map((a: any) => ({ actionType: a.actionType, count: a._count._all })),
    });
  }),
);
