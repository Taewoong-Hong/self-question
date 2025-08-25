'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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

  const refreshToken = useCallback(async () => {
    try {
      // Refresh Token은 httpOnly 쿠키에 있으므로 별도 헤더 없이 요청
      const response = await fetch('/api/admin/refresh-token', {
        method: 'POST',
        credentials: 'include' // 쿠키 포함
      });
      
      if (response.ok) {
        const data = await response.json();
        // 새로운 Access Token을 localStorage에 저장
        localStorage.setItem('admin_token', data.accessToken || data.token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }, []);

  const checkAdminAuth = useCallback(() => {
    try {
      const token = localStorage.getItem('admin_token');
      const username = localStorage.getItem('admin_username');
      const adminUser = localStorage.getItem('admin_user');
      
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
  }, []);

  const logout = useCallback(async () => {
    // localStorage 정리
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_username');
    localStorage.removeItem('admin_user');
    
    // 서버에 로그아웃 요청하여 Refresh Token 쿠키 제거
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    setIsAdminLoggedIn(false);
    setAdminUsername(null);
    router.push('/admin');
  }, [router]);

  useEffect(() => {
    checkAdminAuth();
  }, [checkAdminAuth]);
  
  // 토큰 자동 갱신
  useEffect(() => {
    if (!isAdminLoggedIn) return;
    
    const interval = setInterval(async () => {
      const refreshed = await refreshToken();
      if (!refreshed) {
        logout();
      }
    }, 10 * 60 * 1000); // 10분
    
    return () => clearInterval(interval);
  }, [isAdminLoggedIn, refreshToken, logout]);

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