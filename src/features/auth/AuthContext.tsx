import { createContext, useContext, useState, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AuthUser, LoginCredentials, loginRequest } from './api';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function extractRoleName(rawRole: unknown): string {
  if (typeof rawRole === 'string') return rawRole.toLowerCase();
  if (rawRole && typeof rawRole === 'object' && 'role' in rawRole) {
    return String((rawRole as { role?: string }).role ?? '').toLowerCase();
  }
  return '';
}

function normalizeUser(raw: any): AuthUser | null {
  if (!raw || typeof raw !== 'object') return null;
  const roleStr = extractRoleName(raw.role);
  const roleId = Number(raw.roleId ?? raw.role?.id ?? 0);

  const normalizedRole =
    roleId === 7
      ? 'admin'
      : roleStr === 'trainer'
        ? 'worker'
        : roleStr || 'worker';

  return {
    ...raw,
    roleId,
    role: normalizedRole,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const [token, setToken] = useState<string | null>(() => {
    const saved = localStorage.getItem('token');
    return saved && saved !== 'undefined' ? saved : null;
  });

  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('user');
    if (!saved || saved === 'undefined') return null;
    try {
      return normalizeUser(JSON.parse(saved));
    } catch {
      return null;
    }
  });

  const login = async (credentials: LoginCredentials) => {
    const response = await loginRequest(credentials);
    const normalized = normalizeUser(response.user);

    if (!response.access_token || !normalized) {
      throw new Error('Respuesta de autenticación inválida');
    }

    localStorage.setItem('token', response.access_token);
    localStorage.setItem('user', JSON.stringify(normalized));
    setToken(response.access_token);
    setUser(normalized);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    queryClient.clear();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
