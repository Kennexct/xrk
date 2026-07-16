import { io, type Socket } from 'socket.io-client';
import { API_URL } from './api';

let socket: Socket | null = null;
let heartbeat: ReturnType<typeof setInterval> | null = null;

/** Connect the presence/notification socket (master.md §5: heartbeat every 30s). */
export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;
  disconnectSocket();
  socket = io(API_URL, { auth: { token }, transports: ['websocket', 'polling'] });
  heartbeat = setInterval(() => socket?.emit('presence:ping'), 30_000);
  return socket;
}

export function disconnectSocket(): void {
  if (heartbeat) clearInterval(heartbeat);
  heartbeat = null;
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}
