import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import type { Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { kv } from '../../lib/redis';
import { config } from '../../config';
import { asyncHandler, badRequest, unauthorized, HttpError } from '../../lib/errors';
import { hashPassword, verifyPassword } from '../../lib/passwords';
import { generateRefreshToken, hashToken, signAccessToken } from '../../lib/jwt';
import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { logActivity } from '../activity/log';

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30, // coarse per-IP guard
  standardHeaders: true,
  legacyHeaders: false,
});

const publicUser = (u: {
  id: string;
  name: string;
  email: string;
  nim: string | null;
  division: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  status: string;
  mustChangePassword?: boolean;
  lastSeenAt: Date | null;
}) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  nim: u.nim,
  division: u.division,
  phone: u.phone,
  avatarUrl: u.avatarUrl,
  role: u.role,
  status: u.status,
  mustChangePassword: Boolean(u.mustChangePassword),
  lastSeenAt: u.lastSeenAt,
});

async function issueTokens(user: { id: string; role: Role; name: string }) {
  const accessToken = signAccessToken({ sub: user.id, role: user.role, name: user.name });
  const refreshToken = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + config.jwt.refreshTtlSec * 1000),
    },
  });
  return { accessToken, refreshToken };
}

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

authRouter.post(
  '/login',
  authLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof loginSchema>;
    const lockKey = `lockout:${email}`;

    const failures = Number((await kv.get(lockKey)) ?? 0);
    if (failures >= config.limits.loginMaxAttempts) {
      throw new HttpError(429, 'Too many failed attempts. Try again in 15 minutes.');
    }

    const user = await prisma.user.findUnique({ where: { email } });
    const valid = user?.passwordHash ? await verifyPassword(user.passwordHash, password) : false;

    if (!user || !valid || user.status !== 'ACTIVE') {
      await kv.incrWithTtl(lockKey, config.limits.loginWindowMin * 60);
      logActivity({ userId: user?.id, actionType: 'login_failed', metadata: { email }, req });
      throw unauthorized(
        user && user.status !== 'ACTIVE' ? 'Account is inactive. Contact an admin.' : 'Invalid email or password',
      );
    }

    await kv.del(lockKey);
    const tokens = await issueTokens(user);
    logActivity({ userId: user.id, actionType: 'login', req });

    res.json({
      ...tokens,
      mustChangePassword: Boolean(user.mustChangePassword),
      user: publicUser(user),
    });
  }),
);

const setupPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password minimal 8 karakter'),
});

// Setup new password for first-time login / after reset
authRouter.post(
  '/setup-password',
  requireAuth,
  validateBody(setupPasswordSchema),
  asyncHandler(async (req, res) => {
    const { newPassword } = req.body as z.infer<typeof setupPasswordSchema>;
    const userId = req.auth!.sub;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw unauthorized();

    const passwordHash = await hashPassword(newPassword);
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    logActivity({ userId, actionType: 'update_profile', metadata: { setupPassword: true }, req });
    const tokens = await issueTokens(updated);
    res.json({ ...tokens, mustChangePassword: false, user: publicUser(updated) });
  }),
);

const refreshSchema = z.object({ refreshToken: z.string().min(20) });

authRouter.post(
  '/refresh',
  authLimiter,
  validateBody(refreshSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body as z.infer<typeof refreshSchema>;
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { user: true },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date() || stored.user.status !== 'ACTIVE') {
      throw unauthorized('Invalid refresh token');
    }
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    const tokens = await issueTokens(stored.user);
    res.json({ ...tokens, user: publicUser(stored.user) });
  }),
);

authRouter.post(
  '/logout',
  validateBody(z.object({ refreshToken: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (refreshToken) {
      const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(refreshToken) } });
      if (stored && !stored.revokedAt) {
        await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
        logActivity({ userId: stored.userId, actionType: 'logout', req });
      }
    }
    res.json({ ok: true });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.auth!.sub } });
    if (!user) throw unauthorized();
    res.json({ user: publicUser(user) });
  }),
);
