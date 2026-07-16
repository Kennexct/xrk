import { Router } from 'express';
import { z } from 'zod';
import { VideoCategory } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { asyncHandler, badRequest, forbidden, notFound } from '../../lib/errors';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { validateBody, parseQuery } from '../../middleware/validate';
import { can } from '../../lib/rbac';
import { logActivity } from '../activity/log';
import { notifyAllMembers } from '../notifications/service';
import { createDirectUpload, parseYouTubeId } from './provider';

export const videosRouter = Router();
videosRouter.use(requireAuth);

const listQuery = z.object({
  category: z.nativeEnum(VideoCategory).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

videosRouter.get(
  '/',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const q = parseQuery(listQuery, req);
    const where = { status: 'READY' as const, ...(q.category ? { category: q.category } : {}) };
    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(q.page) - 1) * Number(q.pageSize),
        take: Number(q.pageSize),
        include: { uploader: { select: { id: true, name: true, division: true } } },
      }),
      prisma.video.count({ where }),
    ]);
    res.json({ videos, total, page: Number(q.page), pageSize: Number(q.pageSize) });
  }),
);

videosRouter.get(
  '/:id',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const video = await prisma.video.findUnique({
      where: { id: req.params.id },
      include: { uploader: { select: { id: true, name: true, division: true } } },
    });
    if (!video) throw notFound('Video');
    res.json({ video });
  }),
);

const createUploadSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(5000).optional(),
  category: z.nativeEnum(VideoCategory).default('DOKUMENTASI_ACARA'),
});

// Step 1 of direct-to-cloud upload (master.md §1): client asks for an upload
// URL; the video bytes then go straight from the browser to the provider.
videosRouter.post(
  '/upload-url',
  requirePermission('video:upload'),
  validateBody(createUploadSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createUploadSchema>;
    const upload = await createDirectUpload({ title: body.title as string, uploaderId: req.auth!.sub });

    const video = await prisma.video.create({
      data: {
        uploaderId: req.auth!.sub,
        title: body.title,
        description: body.description,
        category: body.category,
        provider: upload.provider,
        providerVideoId: upload.providerVideoId,
        ...(upload.instantReady
          ? { status: 'READY', ...upload.instantReady }
          : { status: 'PROCESSING' }),
      },
    });

    logActivity({
      userId: req.auth!.sub,
      actionType: 'upload_video',
      targetType: 'video',
      targetId: video.id,
      metadata: { title: body.title, provider: upload.provider },
      req,
    });
    if (upload.instantReady) {
      void notifyAllMembers(
        { type: 'video', title: 'Video baru', message: body.title as string, link: `/videos/${video.id}` },
        req.auth!.sub,
      );
    }
    res.status(201).json({ video, uploadUrl: upload.uploadUrl });
  }),
);

const youtubeSchema = createUploadSchema.extend({ url: z.string().url() });

// Budget option for MVP phase: register an existing (unlisted) YouTube video.
videosRouter.post(
  '/youtube',
  requirePermission('video:upload'),
  validateBody(youtubeSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof youtubeSchema>;
    const ytId = parseYouTubeId(body.url as string);
    if (!ytId) throw badRequest('Could not extract a YouTube video id from that URL');

    const video = await prisma.video.create({
      data: {
        uploaderId: req.auth!.sub,
        title: body.title,
        description: body.description,
        category: body.category,
        provider: 'YOUTUBE',
        providerVideoId: ytId,
        embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}`,
        thumbnailUrl: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
        status: 'READY',
      },
    });
    logActivity({
      userId: req.auth!.sub,
      actionType: 'upload_video',
      targetType: 'video',
      targetId: video.id,
      metadata: { title: body.title, provider: 'YOUTUBE' },
      req,
    });
    void notifyAllMembers(
      { type: 'video', title: 'Video baru', message: body.title as string, link: `/videos/${video.id}` },
      req.auth!.sub,
    );
    res.status(201).json({ video });
  }),
);

videosRouter.post(
  '/:id/view',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    await prisma.video
      .update({ where: { id: req.params.id }, data: { viewCount: { increment: 1 } } })
      .catch(() => {
        throw notFound('Video');
      });
    res.json({ ok: true });
  }),
);

videosRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const video = await prisma.video.findUnique({ where: { id: req.params.id } });
    if (!video) throw notFound('Video');
    const isOwner = video.uploaderId === req.auth!.sub;
    if (!isOwner && !can(req.auth!.role, 'video:manage')) throw forbidden();
    await prisma.video.delete({ where: { id: video.id } });
    logActivity({
      userId: req.auth!.sub,
      actionType: 'delete_video',
      targetType: 'video',
      targetId: video.id,
      metadata: { title: video.title },
      req,
    });
    res.json({ ok: true });
  }),
);
