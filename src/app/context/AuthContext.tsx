

'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: {
    token: string;
    role: string;
    username?: string;
    name?: string;
    phone?: string;
  } | null;
  login: (userData: AuthContextType['user']) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthContextType['user'] | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setLoading(false);
      return;
    }
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.id) {
          const userData = {
            id: data.id,
            name: data.name ?? null,
            username: data.name ?? data.phone ?? "",
            phone: data.phone ?? "",
            role: data.role ?? "user",
            token: "cookie",
          };
          setUser(userData);
          localStorage.setItem("user", JSON.stringify(userData));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = (userData: AuthContextType['user']) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
