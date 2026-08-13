import { Router } from 'express';
import { z } from 'zod';
import { Role, UserStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { asyncHandler, badRequest, notFound } from '../../lib/errors';
import { hashPassword } from '../../lib/passwords';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { logActivity } from '../activity/log';
import { listOnlineUserIds } from '../../realtime/gateway';

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
  mustChangePassword: true,
  lastSeenAt: true,
  createdAt: true,
} as const;

const DEFAULT_INITIAL_PASSWORD = 'Sunflower123';

// Member directory with live presence
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

// ---- Admin: Add / Invite New Member (Direct creation with default password Sunflower123) ----

const inviteSchema = z.object({
  email: z.string().email().toLowerCase(),
  name: z.string().min(2).max(100).optional(),
  role: z.nativeEnum(Role).default('MEMBER'),
  division: z.string().max(60).optional(),
});

usersRouter.post(
  '/invitations',
  requirePermission('users:manage'),
  validateBody(inviteSchema),
  asyncHandler(async (req, res) => {
    const { email, name, role, division } = req.body as z.infer<typeof inviteSchema>;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw badRequest('Pengguna dengan email ini sudah terdaftar');

    const defaultName = name || email.split('@')[0] || 'Anggota SYT';
    const passwordHash = await hashPassword(DEFAULT_INITIAL_PASSWORD);

    const user = await prisma.user.create({
      data: {
        email,
        name: defaultName,
        role,
        division,
        passwordHash,
        status: 'ACTIVE',
        mustChangePassword: true,
      },
      select: directorySelect,
    });

    logActivity({
      userId: req.auth!.sub,
      actionType: 'invite_user',
      targetType: 'user',
      targetId: user.id,
      metadata: { email, role, defaultPassword: DEFAULT_INITIAL_PASSWORD },
      req,
    });

    res.status(201).json({
      ok: true,
      user,
      defaultPassword: DEFAULT_INITIAL_PASSWORD,
    });
  }),
);

// Legacy/Compatibility endpoint for invitations list
usersRouter.get(
  '/invitations',
  requirePermission('users:manage'),
  asyncHandler(async (_req, res) => {
    res.json({ invitations: [] });
  }),
);

// ---- Super Admin / Admin: Reset User Password to Default Sunflower123 ----

usersRouter.post(
  '/:id/reset-password',
  requirePermission('users:manage'),
  asyncHandler(async (req, res) => {
    const targetUserId = req.params.id;
    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw notFound('User');

    const passwordHash = await hashPassword(DEFAULT_INITIAL_PASSWORD);
    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
    });

    // Revoke any existing refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId: targetUserId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    logActivity({
      userId: req.auth!.sub,
      actionType: 'update_user',
      targetType: 'user',
      targetId: targetUserId,
      metadata: { resetPassword: true, defaultPassword: DEFAULT_INITIAL_PASSWORD },
      req,
    });

    res.json({
      ok: true,
      message: `Password berhasil direset ke ${DEFAULT_INITIAL_PASSWORD}`,
      defaultPassword: DEFAULT_INITIAL_PASSWORD,
    });
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
