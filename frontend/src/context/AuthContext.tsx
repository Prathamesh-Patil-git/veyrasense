import React, { createContext, useContext, useState } from 'react';

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  deploymentTarget: string;
  isDemo: boolean;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserProfile;
  login: (email?: string) => void;
  logout: () => void;
}

const DEFAULT_USER: UserProfile = {
  name: 'Lead Edge Operator',
  email: 'admin@veyrasense.local',
  role: 'Systems Reliability Architect',
  deploymentTarget: 'Raspberry Pi 5 (4GB / 64GB)',
  isDemo: true,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [user, setUser] = useState<UserProfile>(DEFAULT_USER);

  const login = (email?: string) => {
    setIsAuthenticated(true);
    if (email) {
      setUser((prev) => ({ ...prev, email }));
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
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
