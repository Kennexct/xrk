import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { asyncHandler, forbidden, notFound } from '../../lib/errors';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { can } from '../../lib/rbac';
import { logActivity } from '../activity/log';
import { presignUpload } from '../storage/service';

/**
 * Activity Folders (PRD §5.1.6): supporting docs/photos per event/division.
 * Files ≤25MB, stored in R2 — server keeps only the reference.
 */
export const foldersRouter = Router();
foldersRouter.use(requireAuth);

foldersRouter.get(
  '/',
  requirePermission('content:view'),
  asyncHandler(async (_req, res) => {
    const folders = await prisma.activityFolder.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        event: { select: { id: true, title: true } },
        _count: { select: { files: true } },
      },
    });
    res.json({ folders });
  }),
);

const createFolderSchema = z.object({
  name: z.string().min(1).max(120),
  eventId: z.string().nullish(),
  division: z.string().max(60).nullish(),
});

foldersRouter.post(
  '/',
  requirePermission('files:manage'),
  validateBody(createFolderSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createFolderSchema>;
    if (body.eventId) {
      const event = await prisma.event.findUnique({ where: { id: body.eventId } });
      if (!event) throw notFound('Event');
    }
    const folder = await prisma.activityFolder.create({
      data: { name: body.name, eventId: body.eventId ?? undefined, division: body.division ?? undefined },
    });
    logActivity({
      userId: req.auth!.sub,
      actionType: 'create_folder',
      targetType: 'folder',
      targetId: folder.id,
      metadata: { name: folder.name },
      req,
    });
    res.status(201).json({ folder });
  }),
);

foldersRouter.get(
  '/:id',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const folder = await prisma.activityFolder.findUnique({
      where: { id: req.params.id },
      include: {
        event: { select: { id: true, title: true } },
        files: {
          orderBy: { createdAt: 'desc' },
          include: { uploader: { select: { id: true, name: true } } },
        },
      },
    });
    if (!folder) throw notFound('Folder');
    res.json({ folder });
  }),
);

const presignSchema = z.object({
  fileName: z.string().min(1).max(200),
  contentType: z.string().min(3).max(100),
  sizeBytes: z.number().int().positive(),
});

foldersRouter.post(
  '/:id/upload-url',
  requirePermission('files:upload'),
  validateBody(presignSchema),
  asyncHandler(async (req, res) => {
    const folder = await prisma.activityFolder.findUnique({ where: { id: req.params.id } });
    if (!folder) throw notFound('Folder');
    const presigned = await presignUpload({ kind: 'document', ...(req.body as z.infer<typeof presignSchema>) });
    res.json(presigned);
  }),
);

const registerFileSchema = z.object({
  fileName: z.string().min(1).max(200),
  fileKey: z.string().min(1).max(500),
  fileUrl: z.string().url().max(1000),
  fileType: z.string().min(3).max(100),
  sizeBytes: z.number().int().positive(),
});

foldersRouter.post(
  '/:id/files',
  requirePermission('files:upload'),
  validateBody(registerFileSchema),
  asyncHandler(async (req, res) => {
    const folder = await prisma.activityFolder.findUnique({ where: { id: req.params.id } });
    if (!folder) throw notFound('Folder');
    const file = await prisma.activityFile.create({
      data: { ...(req.body as z.infer<typeof registerFileSchema>), folderId: folder.id, uploaderId: req.auth!.sub },
      include: { uploader: { select: { id: true, name: true } } },
    });
    logActivity({
      userId: req.auth!.sub,
      actionType: 'upload_file',
      targetType: 'file',
      targetId: file.id,
      metadata: { fileName: file.fileName, folder: folder.name },
      req,
    });
    res.status(201).json({ file });
  }),
);

foldersRouter.delete(
  '/files/:fileId',
  asyncHandler(async (req, res) => {
    const file = await prisma.activityFile.findUnique({ where: { id: req.params.fileId } });
    if (!file) throw notFound('File');
    if (file.uploaderId !== req.auth!.sub && !can(req.auth!.role, 'files:manage')) throw forbidden();
    await prisma.activityFile.delete({ where: { id: file.id } });
    logActivity({
      userId: req.auth!.sub,
      actionType: 'delete_file',
      targetType: 'file',
      targetId: file.id,
      metadata: { fileName: file.fileName },
      req,
    });
    res.json({ ok: true });
  }),
);
