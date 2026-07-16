import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import type { Role } from '@prisma/client';
import { config } from '../config';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  name: string;
}

export const signAccessToken = (payload: AccessTokenPayload) =>
  jwt.sign(payload, config.jwt.accessSecret, { expiresIn: config.jwt.accessTtlSec });

export const verifyAccessToken = (token: string): AccessTokenPayload =>
  jwt.verify(token, config.jwt.accessSecret) as AccessTokenPayload;

/** Refresh tokens are opaque random strings; only their SHA-256 hash is stored. */
export const generateRefreshToken = () => crypto.randomBytes(48).toString('base64url');

export const hashToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');
