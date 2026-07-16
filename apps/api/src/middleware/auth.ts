import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { verifyAccessToken, type AccessTokenPayload } from '../lib/jwt';
import { forbidden, unauthorized } from '../lib/errors';
import { can, type Permission } from '../lib/rbac';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(unauthorized());
  try {
    req.auth = verifyAccessToken(header.slice('Bearer '.length));
    return next();
  } catch {
    return next(unauthorized('Invalid or expired token'));
  }
}

export const requirePermission =
  (permission: Permission) => (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(unauthorized());
    if (!can(req.auth.role, permission)) return next(forbidden());
    return next();
  };

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(unauthorized());
    if (!roles.includes(req.auth.role)) return next(forbidden());
    return next();
  };
