'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface AdminAuthContextType {
  isAdminLoggedIn: boolean;
  adminUsername: string | null;
  checkAdminAuth: () => void;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminUsername, setAdminUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const checkAdminAuth = () => {
    try {
      const token = localStorage.getItem('admin_token');
      const username = localStorage.getItem('admin_username');
      
      console.log('AdminAuth Check:', { token: !!token, username });
      
      if (token && username) {
        setIsAdminLoggedIn(true);
        setAdminUsername(username);
      } else {
        setIsAdminLoggedIn(false);
        setAdminUsername(null);
      }
    } catch (error) {
      console.error('Failed to check admin auth:', error);
      setIsAdminLoggedIn(false);
      setAdminUsername(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_username');
    localStorage.removeItem('admin_user');
    setIsAdminLoggedIn(false);
    setAdminUsername(null);
    router.push('/admin');
  };

  useEffect(() => {
    checkAdminAuth();
  }, []);

  return (
    <AdminAuthContext.Provider value={{
      isAdminLoggedIn,
      adminUsername,
      checkAdminAuth,
      logout
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}