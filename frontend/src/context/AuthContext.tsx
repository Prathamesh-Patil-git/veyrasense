import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, type ApiAdminProfile } from '../services/api';

export interface UserProfile {
  id?: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(api.getToken());
  });
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshProfile = useCallback(async () => {
    const token = api.getToken();
    if (!token) {
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }

    try {
      const profile: ApiAdminProfile = await api.getMe();
      setUser({
        id: profile.id,
        name: profile.full_name,
        email: profile.email,
        role: 'Administrator',
        isActive: profile.is_active,
        lastLoginAt: profile.last_login_at,
        createdAt: profile.created_at,
      });
      setIsAuthenticated(true);
    } catch {
      // If token is invalid or backend unreachable with current token
      // preserve session if offline or reset on auth error
      setIsAuthenticated(Boolean(api.getToken()));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const login = async (email: string, password?: string) => {
    if (password) {
      await api.login(email, password);
    }
    await refreshProfile();
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      api.setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
