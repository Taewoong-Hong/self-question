'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface AdminAuthContextType {
  isAdminLoggedIn: boolean;
  adminUsername: string | null;
  isLoading: boolean;
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
      const adminUser = localStorage.getItem('admin_user');
      
      console.log('AdminAuth Check:', { 
        hasToken: !!token, 
        username,
        adminUser: adminUser ? JSON.parse(adminUser) : null,
        allKeys: Object.keys(localStorage)
      });
      
      if (token) {
        // admin_user에서 username 추출 시도
        if (!username && adminUser) {
          try {
            const user = JSON.parse(adminUser);
            if (user.username) {
              localStorage.setItem('admin_username', user.username);
              setIsAdminLoggedIn(true);
              setAdminUsername(user.username);
              return;
            }
          } catch (e) {
            console.error('Failed to parse admin_user:', e);
          }
        }
        
        if (username) {
          setIsAdminLoggedIn(true);
          setAdminUsername(username);
        } else {
          setIsAdminLoggedIn(false);
          setAdminUsername(null);
        }
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
      isLoading,
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