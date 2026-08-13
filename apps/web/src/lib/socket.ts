import { io, type Socket } from 'socket.io-client';
import { API_URL } from './api';

let socket: Socket | null = null;
let heartbeat: ReturnType<typeof setInterval> | null = null;

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;
  disconnectSocket();
  socket = io(API_URL, {
    auth: { token },
    transports: ['polling', 'websocket'],
    reconnectionAttempts: 3,
    timeout: 5000,
    autoConnect: true,
  });
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
