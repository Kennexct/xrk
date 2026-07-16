import { Router } from 'express';
import crypto from 'node:crypto';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../lib/errors';
import { config } from '../../config';
import { cloudflarePlaybackUrls } from './provider';
import { logActivity } from '../activity/log';
import { notifyAllMembers } from '../notifications/service';

export const videoWebhookRouter = Router();

/**
 * Cloudflare Stream webhook (master.md §1 step 4): fired when transcoding
 * finishes. Verifies the Webhook-Signature header (HMAC-SHA256) when a
 * secret is configured.
 */
function verifySignature(rawBody: string, header: string | undefined, secret: string): boolean {
  if (!secret) return true; // verification disabled (dev)
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]));
  const time = parts['time'];
  const sig = parts['sig1'];
  if (!time || !sig) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${time}.${rawBody}`).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

videoWebhookRouter.post(
  '/cloudflare-stream',
  asyncHandler(async (req, res) => {
    const raw = (req as { rawBody?: string }).rawBody ?? JSON.stringify(req.body);
    if (!verifySignature(raw, req.headers['webhook-signature'] as string | undefined, config.video.cfWebhookSecret)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const payload = req.body as {
      uid?: string;
      readyToStream?: boolean;
      status?: { state?: string };
      duration?: number;
      thumbnail?: string;
    };
    if (!payload.uid) return res.json({ ok: true });

    const video = await prisma.video.findFirst({ where: { providerVideoId: payload.uid } });
    if (!video) return res.json({ ok: true });

    if (payload.readyToStream || payload.status?.state === 'ready') {
      const urls = cloudflarePlaybackUrls(payload.uid);
      await prisma.video.update({
        where: { id: video.id },
        data: {
          status: 'READY',
          hlsUrl: urls.hlsUrl,
          thumbnailUrl: payload.thumbnail ?? urls.thumbnailUrl,
          durationSec: payload.duration,
        },
      });
      logActivity({
        userId: video.uploaderId,
        actionType: 'video_ready',
        targetType: 'video',
        targetId: video.id,
      });
      void notifyAllMembers(
        { type: 'video', title: 'Video baru', message: video.title, link: `/videos/${video.id}` },
        video.uploaderId,
      );
    } else if (payload.status?.state === 'error') {
      await prisma.video.update({ where: { id: video.id }, data: { status: 'FAILED' } });
    }
    return res.json({ ok: true });
  }),
);
