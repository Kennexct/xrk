import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { asyncHandler, forbidden, notFound } from '../../lib/errors';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { validateBody, parseQuery } from '../../middleware/validate';
import { can } from '../../lib/rbac';
import { logActivity } from '../activity/log';
import { notifyAllMembers } from '../notifications/service';
import { presignUpload } from '../storage/service';

export const musicRouter = Router();
musicRouter.use(requireAuth);

const listQuery = z.object({
  album: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
});

musicRouter.get(
  '/',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const q = parseQuery(listQuery, req);
    const where = q.album ? { album: q.album } : {};
    const [tracks, total, albums] = await Promise.all([
      prisma.music.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: { uploader: { select: { id: true, name: true } } },
      }),
      prisma.music.count({ where }),
      prisma.music.findMany({
        where: { album: { not: null } },
        distinct: ['album'],
        select: { album: true },
        orderBy: { album: 'asc' },
      }),
    ]);
    res.json({ tracks, total, page: q.page, pageSize: q.pageSize, albums: albums.map((a: any) => a.album) });
  }),
);

const presignSchema = z.object({
  fileName: z.string().min(1).max(200),
  contentType: z.string().min(3).max(100),
  sizeBytes: z.number().int().positive(),
});

// Step 1: presigned URL — audio goes browser → R2 directly (PRD §8.7)
musicRouter.post(
  '/upload-url',
  requirePermission('music:upload'),
  validateBody(presignSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof presignSchema>;
    const presigned = await presignUpload({ kind: 'music', ...body });
    res.json(presigned);
  }),
);

const createSchema = z.object({
  title: z.string().min(1).max(200),
  artist: z.string().min(1).max(200),
  division: z.string().max(60).optional(),
  album: z.string().max(120).optional(),
  fileKey: z.string().min(1).max(500),
  fileUrl: z.string().url().max(1000),
  coverUrl: z.string().url().max(1000).optional(),
  durationSec: z.number().positive().optional(),
  releasedAt: z.coerce.date().optional(),
});

// Step 2: after direct upload completes, register track metadata
musicRouter.post(
  '/',
  requirePermission('music:upload'),
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createSchema>;
    const track = await prisma.music.create({
      data: { ...body, uploaderId: req.auth!.sub },
    });
    logActivity({
      userId: req.auth!.sub,
      actionType: 'upload_music',
      targetType: 'music',
      targetId: track.id,
      metadata: { title: body.title },
      req,
    });
    void notifyAllMembers(
      { type: 'music', title: 'Karya musik baru', message: `${body.title} — ${body.artist}`, link: '/music' },
      req.auth!.sub,
    );
    res.status(201).json({ track });
  }),
);

musicRouter.post(
  '/:id/play',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    await prisma.music
      .update({ where: { id: req.params.id }, data: { playCount: { increment: 1 } } })
      .catch(() => {
        throw notFound('Track');
      });
    res.json({ ok: true });
  }),
);

musicRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const track = await prisma.music.findUnique({ where: { id: req.params.id } });
    if (!track) throw notFound('Track');
    if (track.uploaderId !== req.auth!.sub && !can(req.auth!.role, 'music:manage')) throw forbidden();
    await prisma.music.delete({ where: { id: track.id } });
    logActivity({
      userId: req.auth!.sub,
      actionType: 'delete_music',
      targetType: 'music',
      targetId: track.id,
      metadata: { title: track.title },
      req,
    });
    res.json({ ok: true });
  }),
);
