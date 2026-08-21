// src/store/auth.tsx — web'deki store/auth.tsx'in SecureStore tabanlı mobil
// karşılığı. 401 durumunda api/client.ts'teki unauthorized event'i burada
// dinlenir ve logout() tetiklenir (web'deki window.location.href yerine).
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { secureStorage, bulkStorage } from '@/utils/storage';
import { setUnauthorizedHandler, TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/api/client';
import type { User } from '@/api/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const USER_KEY = 'lexis_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    await secureStorage.removeItem(TOKEN_KEY);
    await secureStorage.removeItem(REFRESH_TOKEN_KEY);
    await bulkStorage.removeItem(USER_KEY);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    (async () => {
      try {
        const savedToken = await secureStorage.getItem(TOKEN_KEY);
        const savedUser = await bulkStorage.getItem(USER_KEY);
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } catch {
        await secureStorage.removeItem(TOKEN_KEY);
        await bulkStorage.removeItem(USER_KEY);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (accessToken: string, refreshToken: string, newUser: User) => {
    setToken(accessToken);
    setUser(newUser);
    await secureStorage.setItem(TOKEN_KEY, accessToken);
    await secureStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    await bulkStorage.setItem(USER_KEY, JSON.stringify(newUser));
  }, []);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      bulkStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, isAuthenticated: !!token && !!user, login, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
