'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { CircularProgress, Box } from '@mui/material';

interface AdminSession {
  userId: string;
  email: string;
  isAdmin: boolean;
}

interface AdminContextType {
  session: AdminSession | null;
  loading: boolean;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        // Use httpOnly cookie-based auth — no localStorage
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        if (!response.ok) {
          setSession(null);
          if (pathname?.startsWith('/admin') && pathname !== '/admin/login') {
            router.push('/admin/login');
          }
          setLoading(false);
          return;
        }

        const user: any = await response.json();

        if (!user.isAdmin) {
          setSession(null);
          if (pathname?.startsWith('/admin') && pathname !== '/admin/login') {
            router.push('/admin/login');
          }
          setLoading(false);
          return;
        }

        setSession({
          userId: user.id || user.userId,
          email: user.email,
          isAdmin: true,
        });

        if (pathname === '/admin/login') {
          router.push('/admin');
        }
      } catch (error) {
        console.error('Session verification failed:', error);
        setSession(null);
        if (pathname?.startsWith('/admin') && pathname !== '/admin/login') {
          router.push('/admin/login');
        }
      } finally {
        setLoading(false);
      }
    };

    verifyAdmin();
  }, [router, pathname]);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // ignore
    }
    setSession(null);
    router.push('/admin/login');
  };

  return (
    <AdminContext.Provider value={{ session, loading, logout }}>
      {loading ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            bgcolor: '#0f0f0f',
          }}
        >
          <CircularProgress sx={{ color: '#22c55e' }} />
        </Box>
      ) : (
        children
      )}
    </AdminContext.Provider>
  );
}

export function useAdminSession() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdminSession must be used within AdminProvider');
  }
  return context;
}
