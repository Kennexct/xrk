'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, getRefreshToken, setAccessToken, setRefreshToken, tryRefresh } from './api';
import { connectSocket, disconnectSocket } from './socket';
import type { Role, User } from './types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ mustChangePassword?: boolean; user: User }>;
  setupPassword: (newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setSession: (data: { accessToken: string; refreshToken: string; user: User }) => void;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const setSession = useCallback((data: { accessToken: string; refreshToken: string; user: User }) => {
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setUser(data.user);
    connectSocket(data.accessToken);
  }, []);

  useEffect(() => {
    (async () => {
      if (getRefreshToken() && (await tryRefresh())) {
        try {
          const { user } = await api<{ user: User }>('/api/auth/me');
          setUser(user);
          const { getAccessToken } = await import('./api');
          const token = getAccessToken();
          if (token) connectSocket(token);
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await api<{ accessToken: string; refreshToken: string; mustChangePassword?: boolean; user: User }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: { email, password },
        },
      );
      setSession(data);
      return { mustChangePassword: data.mustChangePassword, user: data.user };
    },
    [setSession],
  );

  const setupPassword = useCallback(
    async (newPassword: string) => {
      const data = await api<{ accessToken: string; refreshToken: string; user: User }>('/api/auth/setup-password', {
        method: 'POST',
        body: { newPassword },
      });
      setSession(data);
    },
    [setSession],
  );

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    await api('/api/auth/logout', { method: 'POST', body: { refreshToken } }).catch(() => undefined);
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    disconnectSocket();
  }, []);

  const refreshUser = useCallback(async () => {
    const { user } = await api<{ user: User }>('/api/auth/me');
    setUser(user);
  }, []);

  const hasRole = useCallback((...roles: Role[]) => (user ? roles.includes(user.role) : false), [user]);

  const value = useMemo(
    () => ({ user, loading, login, setupPassword, logout, refreshUser, setSession, hasRole }),
    [user, loading, login, setupPassword, logout, refreshUser, setSession, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
