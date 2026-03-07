'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
} from '@mui/material';
import { Apps, Person, Webhook, Logout } from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const DRAWER_WIDTH = 240;

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { label: 'OAuth Apps', icon: Apps, href: '/dashboard/oauth-apps' },
  { label: 'Profile', icon: Person, href: '/dashboard/profile' },
  { label: 'Webhooks', icon: Webhook, href: '/dashboard/webhooks' },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data: any) => {
        if (data?.email) setUserEmail(data.email);
        if (data?.avatar) setUserAvatar(data.avatar);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // silent
    }
    router.push('/');
  };

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <ThemeProvider theme={darkTheme}>
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#0f0f0f' }}>
        {/* Sidebar */}
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              bgcolor: '#1a1a1a',
              borderRight: '1px solid #333',
              color: '#e5e7eb',
              display: 'flex',
              flexDirection: 'column',
            },
          }}
        >
          {/* User / Brand */}
          <Box
            sx={{
              p: 2.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              borderBottom: '1px solid #333',
            }}
          >
            {userAvatar ? (
              <Box
                component="img"
                src={userAvatar}
                alt="Avatar"
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: '2px solid rgba(163,230,53,0.3)',
                  flexShrink: 0,
                }}
              />
            ) : (
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #a3e635 0%, #65a30d 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  color: '#0f0f0f',
                  flexShrink: 0,
                }}
              >
                {userEmail ? userEmail.charAt(0).toUpperCase() : 'E'}
              </Box>
            )}
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                fontSize: '1rem',
                color: '#f5f5f4',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={userEmail}
            >
              {userEmail ? userEmail.split('@')[0] : 'Elixpo'}
            </Typography>
          </Box>

          {/* Navigation Items */}
          <List sx={{ px: 1.5, py: 2, flexGrow: 1 }}>
            {menuItems.map((item) => (
              <ListItem
                key={item.href}
                component={Link}
                href={item.href}
                sx={{
                  mb: 1,
                  borderRadius: '8px',
                  bgcolor: isActive(item.href)
                    ? 'rgba(163, 230, 53, 0.1)'
                    : 'transparent',
                  borderLeft: isActive(item.href)
                    ? '3px solid #a3e635'
                    : '3px solid transparent',
                  pl: isActive(item.href) ? 1.75 : 2,
                  '&:hover': {
                    bgcolor: 'rgba(163, 230, 53, 0.05)',
                  },
                  transition: 'all 0.2s ease',
                  color: isActive(item.href) ? '#a3e635' : '#d1d5db',
                  textDecoration: 'none',
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: isActive(item.href) ? '#a3e635' : '#9ca3af',
                  }}
                >
                  <item.icon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.9rem',
                    fontWeight: isActive(item.href) ? 600 : 500,
                  }}
                />
              </ListItem>
            ))}
          </List>

          {/* User Email + Logout */}
          <Box
            sx={{
              p: 2,
              borderTop: '1px solid #333',
              bgcolor: '#111',
            }}
          >
            {userEmail && (
              <Typography
                variant="body2"
                sx={{
                  color: '#9ca3af',
                  fontSize: '0.8rem',
                  mb: 1.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={userEmail}
              >
                {userEmail}
              </Typography>
            )}
            <Box
              onClick={handleLogout}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                cursor: 'pointer',
                color: '#6b7280',
                borderRadius: '6px',
                px: 1,
                py: 0.75,
                '&:hover': {
                  bgcolor: 'rgba(239, 68, 68, 0.08)',
                  color: '#ef4444',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <Logout fontSize="small" />
              <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 500 }}>
                Logout
              </Typography>
            </Box>
          </Box>
        </Drawer>

        {/* Main Content Area */}
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: '#0f0f0f',
          }}
        >
          {/* Top AppBar */}
          <AppBar
            position="static"
            sx={{
              bgcolor: '#1a1a1a',
              borderBottom: '1px solid #333',
              boxShadow: 'none',
            }}
          >
            <Toolbar>
              <Typography
                variant="h6"
                sx={{
                  flexGrow: 1,
                  fontWeight: 600,
                  color: '#fff',
                }}
              >
                Developer Portal
              </Typography>
            </Toolbar>
          </AppBar>

          {/* Page Content */}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              overflow: 'auto',
              p: 3,
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
