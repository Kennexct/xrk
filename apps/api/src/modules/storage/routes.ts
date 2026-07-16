import { Router, raw } from 'express';
import { z } from 'zod';
import path from 'node:path';
import fs from 'node:fs';
import { config } from '../../config';
import { asyncHandler, badRequest, notFound } from '../../lib/errors';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { presignUpload, type UploadKind } from './service';

export const storageRouter = Router();

const presignSchema = z.object({
  kind: z.enum(['image', 'document'] satisfies [UploadKind, UploadKind]),
  fileName: z.string().min(1).max(200),
  contentType: z.string().min(3).max(100),
  sizeBytes: z.number().int().positive(),
});

// Generic presign for cover images / avatars (music & folder uploads have
// their own scoped endpoints).
storageRouter.post(
  '/presign',
  requireAuth,
  requirePermission('files:upload'),
  validateBody(presignSchema),
  asyncHandler(async (req, res) => {
    const presigned = await presignUpload(req.body as z.infer<typeof presignSchema>);
    res.json(presigned);
  }),
);

/**
 * Dev-only mock object storage (STORAGE_DRIVER=mock). Emulates R2 presigned
 * PUT/GET so the full upload flow works locally with zero cloud accounts.
 * Never enabled in production — the real flow keeps bytes off this server.
 */
export const devStorageRouter = Router();

const DEV_DIR = path.resolve(process.cwd(), '.devstorage');
const safePath = (key: string) => {
  const resolved = path.resolve(DEV_DIR, key.replace(/^\/+/, ''));
  if (!resolved.startsWith(DEV_DIR + path.sep) && resolved !== DEV_DIR) {
    throw badRequest('Invalid storage key');
  }
  return resolved;
};

if (config.storage.driver === 'mock') {
  devStorageRouter.put(
    '/:key(*)',
    raw({ type: () => true, limit: '120mb' }),
    asyncHandler(async (req, res) => {
      const file = safePath(decodeURIComponent(req.params.key));
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, req.body as Buffer);
      fs.writeFileSync(`${file}.meta`, req.headers['content-type'] ?? 'application/octet-stream');
      res.status(200).json({ ok: true });
    }),
  );

  devStorageRouter.get(
    '/:key(*)',
    asyncHandler(async (req, res) => {
      const file = safePath(decodeURIComponent(req.params.key));
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) throw notFound('File');
      const contentType = fs.existsSync(`${file}.meta`)
        ? fs.readFileSync(`${file}.meta`, 'utf8')
        : 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Accept-Ranges', 'bytes');
      fs.createReadStream(file).pipe(res);
    }),
  );
}
