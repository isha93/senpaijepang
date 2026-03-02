import { createContext, useContext, useMemo, useState } from 'react';
import { apiRequest } from '../lib/api';
import {
  AuthUser,
  clearSession,
  getRefreshToken,
  getUser,
  setTokens,
  setUser
} from './tokenStore';

type LoginInput = {
  identifier: string;
  password: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => void;
};

type AuthResponse = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(() => getUser());
  const [isLoading, setIsLoading] = useState(false);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      async login(input) {
        setIsLoading(true);
        try {
          const data = await apiRequest<AuthResponse>('/auth/login', {
            method: 'POST',
            body: input
          });
          setTokens(data.accessToken, data.refreshToken);
          setUser(data.user);
          setUserState(data.user);
        } finally {
          setIsLoading(false);
        }
      },
      logout() {
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          apiRequest('/auth/logout', {
            method: 'POST',
            body: { refreshToken }
          }).catch(() => undefined);
        }
        clearSession();
        setUserState(null);
      }
    }),
    [isLoading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
