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
  limit: 30, // coarse per-IP guard; fine-grained lockout below
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

// 5 failed attempts → 15 minute lockout (master.md §6)
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
    res.json({ ...tokens, user: publicUser(user) });
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
    // Rotate: revoke old token, issue a fresh pair.
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

// Invitation preview (name of org member who invited, email, role)
authRouter.get(
  '/invitations/:token',
  asyncHandler(async (req, res) => {
    const invitation = await prisma.invitation.findUnique({
      where: { token: req.params.token },
      include: { invitedBy: { select: { name: true } } },
    });
    if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
      throw badRequest('Invitation is invalid or has expired');
    }
    res.json({
      email: invitation.email,
      role: invitation.role,
      invitedBy: invitation.invitedBy.name,
      expiresAt: invitation.expiresAt,
    });
  }),
);

const acceptSchema = z.object({
  token: z.string().min(10),
  name: z.string().min(2).max(100),
  password: z.string().min(8).max(128),
  nim: z.string().max(30).optional(),
  division: z.string().max(60).optional(),
  phone: z.string().max(30).optional(),
});

// Registration is invitation-only (PRD §5.1.1)
authRouter.post(
  '/accept-invitation',
  authLimiter,
  validateBody(acceptSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof acceptSchema>;
    const invitation = await prisma.invitation.findUnique({ where: { token: body.token } });
    if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
      throw badRequest('Invitation is invalid or has expired');
    }
    const existing = await prisma.user.findUnique({ where: { email: invitation.email } });
    if (existing) throw badRequest('An account with this email already exists');

    const passwordHash = await hashPassword(body.password);
    const [user] = await prisma.$transaction([
      prisma.user.create({
        data: {
          email: invitation.email,
          role: invitation.role,
          name: body.name,
          nim: body.nim,
          division: body.division,
          phone: body.phone,
          passwordHash,
        },
      }),
      prisma.invitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } }),
    ]);

    const tokens = await issueTokens(user);
    logActivity({ userId: user.id, actionType: 'accept_invitation', req });
    res.status(201).json({ ...tokens, user: publicUser(user) });
  }),
);
