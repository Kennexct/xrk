import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { Role, UserStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { asyncHandler, badRequest, notFound } from '../../lib/errors';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { logActivity } from '../activity/log';
import { listOnlineUserIds } from '../../realtime/gateway';
import { config } from '../../config';

export const usersRouter = Router();
usersRouter.use(requireAuth);

const directorySelect = {
  id: true,
  name: true,
  email: true,
  nim: true,
  division: true,
  phone: true,
  avatarUrl: true,
  role: true,
  status: true,
  lastSeenAt: true,
  createdAt: true,
} as const;

// Member directory with live presence (PRD §5.1.7 — online dot + last seen)
usersRouter.get(
  '/',
  requirePermission('users:view_directory'),
  asyncHandler(async (req, res) => {
    const [users, onlineIds] = await Promise.all([
      prisma.user.findMany({ select: directorySelect, orderBy: { name: 'asc' } }),
      listOnlineUserIds(),
    ]);
    const online = new Set(onlineIds);
    res.json({ users: users.map((u: any) => ({ ...u, isOnline: online.has(u.id) })) });
  }),
);

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  nim: z.string().max(30).nullish(),
  division: z.string().max(60).nullish(),
  phone: z.string().max(30).nullish(),
  avatarUrl: z.string().url().max(500).nullish(),
});

usersRouter.patch(
  '/me',
  validateBody(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({
      where: { id: req.auth!.sub },
      data: req.body,
      select: directorySelect,
    });
    logActivity({ userId: req.auth!.sub, actionType: 'update_profile', req });
    res.json({ user });
  }),
);

// ---- Admin: invitations (registration is invite-only, PRD §5.1.1) ----

const inviteSchema = z.object({
  email: z.string().email().toLowerCase(),
  role: z.nativeEnum(Role).default('MEMBER'),
});

usersRouter.post(
  '/invitations',
  requirePermission('users:manage'),
  validateBody(inviteSchema),
  asyncHandler(async (req, res) => {
    const { email, role } = req.body as z.infer<typeof inviteSchema>;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw badRequest('A user with this email already exists');

    const invitation = await prisma.invitation.create({
      data: {
        email,
        role,
        token: crypto.randomBytes(24).toString('base64url'),
        invitedById: req.auth!.sub,
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      },
    });
    logActivity({
      userId: req.auth!.sub,
      actionType: 'invite_user',
      targetType: 'invitation',
      targetId: invitation.id,
      metadata: { email, role },
      req,
    });
    // The invite link is shared manually via WA/email (PRD §10 — simple onboarding).
    res.status(201).json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        inviteUrl: `${config.webOrigin}/invite/${invitation.token}`,
      },
    });
  }),
);

usersRouter.get(
  '/invitations',
  requirePermission('users:manage'),
  asyncHandler(async (_req, res) => {
    const invitations = await prisma.invitation.findMany({
      orderBy: { createdAt: 'desc' },
      include: { invitedBy: { select: { name: true } } },
    });
    res.json({
      invitations: invitations.map((i: any) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        invitedBy: i.invitedBy.name,
        expiresAt: i.expiresAt,
        acceptedAt: i.acceptedAt,
        inviteUrl: i.acceptedAt ? null : `${config.webOrigin}/invite/${i.token}`,
        createdAt: i.createdAt,
      })),
    });
  }),
);

usersRouter.delete(
  '/invitations/:id',
  requirePermission('users:manage'),
  asyncHandler(async (req, res) => {
    await prisma.invitation.delete({ where: { id: req.params.id } }).catch(() => {
      throw notFound('Invitation');
    });
    logActivity({
      userId: req.auth!.sub,
      actionType: 'revoke_invitation',
      targetType: 'invitation',
      targetId: req.params.id,
      req,
    });
    res.json({ ok: true });
  }),
);

// ---- Admin: manage users (role / status) ----

const adminUpdateSchema = z.object({
  role: z.nativeEnum(Role).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  division: z.string().max(60).nullish(),
});

usersRouter.patch(
  '/:id',
  requirePermission('users:manage'),
  validateBody(adminUpdateSchema),
  asyncHandler(async (req, res) => {
    if (req.params.id === req.auth!.sub && (req.body as { role?: Role }).role) {
      throw badRequest('You cannot change your own role');
    }
    const user = await prisma.user
      .update({ where: { id: req.params.id }, data: req.body, select: directorySelect })
      .catch(() => {
        throw notFound('User');
      });
    logActivity({
      userId: req.auth!.sub,
      actionType: 'update_user',
      targetType: 'user',
      targetId: req.params.id,
      metadata: req.body as Record<string, unknown>,
      req,
    });
    res.json({ user });
  }),
);
