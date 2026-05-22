'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Rehydrate on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('lexis_token');
    const savedUser = localStorage.getItem('lexis_user');
    if (savedToken && savedUser) {
      try {
        const user = JSON.parse(savedUser) as User;
        setState({ user, token: savedToken, isLoading: false, isAuthenticated: true });
      } catch {
        setState((p) => ({ ...p, isLoading: false }));
      }
    } else {
      setState((p) => ({ ...p, isLoading: false }));
    }
  }, []);

  const login = useCallback((token: string, user: User) => {
    localStorage.setItem('lexis_token', token);
    localStorage.setItem('lexis_user', JSON.stringify(user));
    setState({ user, token, isLoading: false, isAuthenticated: true });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('lexis_token');
    localStorage.removeItem('lexis_user');
    setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
