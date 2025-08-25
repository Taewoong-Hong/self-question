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
  const router = useRouter();

  const checkAdminAuth = () => {
    const token = localStorage.getItem('admin_token');
    const username = localStorage.getItem('admin_username');
    
    if (token && username) {
      setIsAdminLoggedIn(true);
      setAdminUsername(username);
    } else {
      setIsAdminLoggedIn(false);
      setAdminUsername(null);
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_username');
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