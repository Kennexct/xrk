import type { Request } from 'express';
import { prisma } from '../../lib/prisma';

export type ActionType =
  | 'login'
  | 'login_failed'
  | 'logout'
  | 'accept_invitation'
  | 'invite_user'
  | 'revoke_invitation'
  | 'update_user'
  | 'update_profile'
  | 'upload_video'
  | 'video_ready'
  | 'delete_video'
  | 'upload_music'
  | 'delete_music'
  | 'create_news'
  | 'update_news'
  | 'publish_news'
  | 'archive_news'
  | 'delete_news'
  | 'create_event'
  | 'update_event'
  | 'delete_event'
  | 'rsvp_event'
  | 'create_folder'
  | 'upload_file'
  | 'delete_file';

interface LogInput {
  userId?: string | null;
  actionType: ActionType;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  req?: Request;
}

/**
 * Append-only audit trail (PRD §5.1.7). Writes are fire-and-forget so logging
 * never blocks or fails the main request (master.md §5.3).
 */
export function logActivity(input: LogInput): void {
  const { req, metadata, ...rest } = input;
  void prisma.activityLog
    .create({
      data: {
        ...rest,
        metadata: metadata as never,
        ipAddress: req ? (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip : undefined,
        userAgent: req?.headers['user-agent']?.slice(0, 500),
      },
    })
    .catch((err: any) => console.error('activity log write failed:', err.message));
}
