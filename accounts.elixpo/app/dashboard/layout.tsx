'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import { Apps, Person, Webhook, Logout, DevicesOther, GitHub } from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { label: 'OAuth Apps', icon: Apps, href: '/dashboard/oauth-apps' },
  { label: 'Services', icon: DevicesOther, href: '/dashboard/services' },
  { label: 'Profile', icon: Person, href: '/dashboard/profile' },
  { label: 'Webhooks', icon: Webhook, href: '/dashboard/webhooks' },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => {
        if (res.ok) return res.json();
        router.push('/login');
        return null;
      })
      .then((data: any) => {
        if (data?.email) setUserEmail(data.email);
        if (data?.displayName) setDisplayName(data.displayName);
        if (data?.avatar) setUserAvatar(data.avatar);
        if (data) setAuthChecked(true);
      })
      .catch(() => {
        router.push('/login');
      });
  }, [router]);

  const handleLogout = async () => {
    setAnchorEl(null);
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

  if (!authChecked) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#141a16' }}>
        <CircularProgress sx={{ color: '#a3e635' }} />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <Box sx={{ minHeight: '100vh', bgcolor: '#141a16' }}>
        {/* Top Navbar */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: 'rgba(20, 26, 22, 0.9)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <Toolbar sx={{ maxWidth: '1400px', width: '100%', mx: 'auto', px: { xs: 2, md: 3 } }}>
            {/* Logo + Brand */}
            <Box
              component={Link}
              href="/dashboard/oauth-apps"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                textDecoration: 'none',
                mr: 4,
                flexShrink: 0,
              }}
            >
              <Box
                component="img"
                src="/LOGO/logo.png"
                alt="Elixpo"
                sx={{ height: 32, width: 32, borderRadius: '8px' }}
              />
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  color: '#f5f5f4',
                  display: { xs: 'none', sm: 'block' },
                  letterSpacing: '-0.01em',
                }}
              >
                Elixpo Accounts
              </Typography>
            </Box>

            {/* Spacer */}
            <Box sx={{ flexGrow: 1 }} />

            {/* Nav Icons (right side) */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 1 }}>
              {navItems.map((item) => (
                <IconButton
                  key={item.href}
                  component={Link}
                  href={item.href}
                  title={item.label}
                  sx={{
                    color: isActive(item.href) ? '#a3e635' : 'rgba(255, 255, 255, 0.45)',
                    bgcolor: isActive(item.href) ? 'rgba(163, 230, 53, 0.1)' : 'transparent',
                    borderRadius: '8px',
                    width: 38,
                    height: 38,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: isActive(item.href)
                        ? 'rgba(163, 230, 53, 0.15)'
                        : 'rgba(255, 255, 255, 0.06)',
                      color: isActive(item.href) ? '#a3e635' : 'rgba(255, 255, 255, 0.8)',
                    },
                  }}
                >
                  <item.icon sx={{ fontSize: '1.25rem' }} />
                </IconButton>
              ))}
            </Box>

            {/* GitHub */}
            <IconButton
              component="a"
              href="https://github.com/elixpo/elixpoaccounts"
              target="_blank"
              rel="noopener noreferrer"
              title="GitHub"
              sx={{
                color: 'rgba(255,255,255,0.35)',
                width: 38, height: 38, borderRadius: '8px',
                '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.06)' },
              }}
            >
              <GitHub sx={{ fontSize: '1.2rem' }} />
            </IconButton>

            {/* User Avatar / Menu */}
            <IconButton
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ p: 0.5 }}
            >
              {userAvatar ? (
                <Box
                  component="img"
                  src={userAvatar}
                  alt="Avatar"
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    border: '2px solid rgba(163, 230, 53, 0.3)',
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #a3e635 0%, #65a30d 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: '#161816',
                  }}
                >
                  {(displayName || userEmail)?.charAt(0).toUpperCase() || 'E'}
                </Box>
              )}
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              slotProps={{
                paper: {
                  sx: {
                    mt: 1,
                    bgcolor: 'rgba(20, 24, 18, 0.95)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    minWidth: 220,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  },
                },
              }}
            >
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography sx={{ color: '#f5f5f4', fontWeight: 600, fontSize: '0.9rem' }}>
                  {displayName || 'User'}
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                  {userEmail}
                </Typography>
              </Box>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
              <MenuItem
                component={Link}
                href="/dashboard/profile"
                onClick={() => setAnchorEl(null)}
                sx={{
                  py: 1.25,
                  color: 'rgba(255,255,255,0.7)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: '#f5f5f4' },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
                  <Person fontSize="small" />
                </ListItemIcon>
                <ListItemText primaryTypographyProps={{ fontSize: '0.875rem' }}>Profile</ListItemText>
              </MenuItem>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
              <MenuItem
                onClick={handleLogout}
                sx={{
                  py: 1.25,
                  color: 'rgba(255,255,255,0.5)',
                  '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.08)', color: '#ef4444' },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
                  <Logout fontSize="small" />
                </ListItemIcon>
                <ListItemText primaryTypographyProps={{ fontSize: '0.875rem' }}>Logout</ListItemText>
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* Page Content */}
        <Box
          component="main"
          sx={{
            maxWidth: '1400px',
            mx: 'auto',
            px: { xs: 2, md: 3 },
            py: 3,
          }}
        >
          {children}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
