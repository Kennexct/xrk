import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import { verifyAccessToken } from '../lib/jwt';
import { kv } from '../lib/redis';
import { prisma } from '../lib/prisma';
import { config } from '../config';

/**
 * Realtime gateway (master.md §5):
 *  - presence:{userId} key with 60s TTL, refreshed by client heartbeat every 30s
 *  - last_seen persisted to PostgreSQL when the last socket disconnects
 *  - per-user rooms (`user:{id}`) for targeted notification pushes
 */

const PRESENCE_PREFIX = 'presence:';
let io: Server | null = null;

// userId → number of live sockets on this instance
const localSockets = new Map<string, number>();

export function getIo(): Server | null {
  return io;
}

export async function listOnlineUserIds(): Promise<string[]> {
  const keys = await kv.keys(PRESENCE_PREFIX);
  return keys.map((k) => k.slice(PRESENCE_PREFIX.length));
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function emitToAll(event: string, payload: unknown): void {
  io?.emit(event, payload);
}

async function markOnline(userId: string) {
  await kv.setex(`${PRESENCE_PREFIX}${userId}`, config.presence.ttlSec, '1');
}

export function createRealtimeGateway(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: config.webOrigin, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error('unauthorized'));
      socket.data.auth = verifyAccessToken(token);
      return next();
    } catch {
      return next(new Error('unauthorized'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const userId = socket.data.auth.sub as string;
    socket.join(`user:${userId}`);

    localSockets.set(userId, (localSockets.get(userId) ?? 0) + 1);
    await markOnline(userId);
    socket.broadcast.emit('presence:update', { userId, online: true });

    socket.on('presence:ping', async () => {
      await markOnline(userId);
    });

    socket.on('disconnect', async () => {
      const remaining = (localSockets.get(userId) ?? 1) - 1;
      if (remaining > 0) {
        localSockets.set(userId, remaining);
        return;
      }
      localSockets.delete(userId);
      await kv.del(`${PRESENCE_PREFIX}${userId}`);
      const lastSeenAt = new Date();
      await prisma.user
        .update({ where: { id: userId }, data: { lastSeenAt } })
        .catch(() => undefined);
      socket.broadcast.emit('presence:update', { userId, online: false, lastSeenAt });
    });
  });

  return io;
}
