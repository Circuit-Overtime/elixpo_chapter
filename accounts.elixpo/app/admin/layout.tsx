'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Badge,
  IconButton,
  Popover,
  CircularProgress,
  Button,
} from '@mui/material';
import {
  Dashboard,
  Apps,
  People,
  Settings,
  Logout,
  Notifications,
  More,
  PersonAdd,
  AppRegistration,
  VpnKey,
  Security,
  DoneAll,
} from '@mui/icons-material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdminProvider, useAdminSession } from '../../src/lib/admin-context';

const DRAWER_WIDTH = 280;

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const notificationIcon = (type: string) => {
  switch (type) {
    case 'new_user': return <PersonAdd sx={{ fontSize: '1rem', color: '#3b82f6' }} />;
    case 'new_oauth_app': return <AppRegistration sx={{ fontSize: '1rem', color: '#f59e0b' }} />;
    case 'new_api_key': return <VpnKey sx={{ fontSize: '1rem', color: '#8b5cf6' }} />;
    case 'suspicious_login': return <Security sx={{ fontSize: '1rem', color: '#ef4444' }} />;
    default: return <Notifications sx={{ fontSize: '1rem', color: '#9ca3af' }} />;
  }
};

function AdminLayoutContent({ children }: AdminLayoutProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const pathname = usePathname();
  const { session, logout } = useAdminSession();

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications?unread=true', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const handleNotifOpen = async (event: React.MouseEvent<HTMLElement>) => {
    setNotifAnchorEl(event.currentTarget);
    setNotifLoading(true);
    try {
      const res = await fetch('/api/admin/notifications', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch { /* silent */ }
    setNotifLoading(false);
  };

  const handleNotifClose = () => setNotifAnchorEl(null);

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/admin/notifications', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await fetch('/api/admin/notifications', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const menuItems = [
    { label: 'Dashboard', icon: Dashboard, href: '/admin' },
    { label: 'Applications', icon: Apps, href: '/admin/apps' },
    { label: 'Users', icon: People, href: '/admin/users' },
    { label: 'Activity Logs', icon: Notifications, href: '/admin/logs' },
    { label: 'Settings', icon: Settings, href: '/admin/settings' },
  ];

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
  };

  return (
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
          },
        }}
      >
        {/* Logo Section */}
        <Box
          sx={{
            p: 2.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            borderBottom: '1px solid #333',
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              color: '#fff',
            }}
          >
            ⚡
          </Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: '1.1rem',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            ELIXPO
          </Typography>
        </Box>

        {/* Admin Label */}
        <Box sx={{ p: 2, bgcolor: '#111', borderBottom: '1px solid #333' }}>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              textTransform: 'uppercase',
              color: '#22c55e',
              fontWeight: 600,
              fontSize: '0.7rem',
              letterSpacing: '0.1em',
              mb: 1,
            }}
          >
            Admin Panel
          </Typography>
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>
            {session?.email || 'admin@elixpo.com'}
          </Typography>
        </Box>

        {/* Menu Items */}
        <List sx={{ px: 1.5, py: 2 }}>
          {menuItems.map((item) => (
            <ListItem
              key={item.href}
              component={Link}
              href={item.href}
              sx={{
                mb: 1,
                borderRadius: '8px',
                bgcolor: isActive(item.href)
                  ? 'rgba(34, 197, 94, 0.1)'
                  : 'transparent',
                borderLeft: isActive(item.href)
                  ? '3px solid #22c55e'
                  : '3px solid transparent',
                pl: isActive(item.href) ? 1.75 : 2,
                '&:hover': {
                  bgcolor: 'rgba(34, 197, 94, 0.05)',
                },
                transition: 'all 0.2s ease',
                color: isActive(item.href) ? '#22c55e' : '#d1d5db',
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 40,
                  color: isActive(item.href) ? '#22c55e' : '#9ca3af',
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

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Version Info */}
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid #333',
            bgcolor: '#111',
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: '#6b7280', display: 'block' }}
          >
            Version 1.0.0
          </Typography>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#0f0f0f',
        }}
      >
        {/* Top Bar */}
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
              Admin Dashboard
            </Typography>

            {/* Notification Bell */}
            <IconButton
              onClick={handleNotifOpen}
              sx={{
                color: '#9ca3af',
                '&:hover': { color: '#22c55e' },
              }}
            >
              <Badge
                badgeContent={unreadCount > 0 ? unreadCount : null}
                sx={{ '& .MuiBadge-badge': { bgcolor: '#ef4444', color: '#fff' } }}
              >
                <Notifications />
              </Badge>
            </IconButton>

            {/* Notification Popover */}
            <Popover
              open={Boolean(notifAnchorEl)}
              anchorEl={notifAnchorEl}
              onClose={handleNotifClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{
                paper: {
                  sx: {
                    bgcolor: '#1a1a1a',
                    border: '1px solid #333',
                    width: 360,
                    maxHeight: 480,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  },
                },
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  borderBottom: '1px solid #333',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
                  Notifications
                  {unreadCount > 0 && (
                    <Box
                      component="span"
                      sx={{
                        ml: 1,
                        px: 0.75,
                        py: 0.25,
                        bgcolor: '#ef4444',
                        borderRadius: '999px',
                        fontSize: '0.7rem',
                        color: '#fff',
                      }}
                    >
                      {unreadCount}
                    </Box>
                  )}
                </Typography>
                {unreadCount > 0 && (
                  <Button
                    size="small"
                    startIcon={<DoneAll sx={{ fontSize: '0.9rem' }} />}
                    onClick={handleMarkAllRead}
                    sx={{ color: '#22c55e', fontSize: '0.75rem', p: 0.5, minWidth: 0 }}
                  >
                    Mark all read
                  </Button>
                )}
              </Box>
              <Box sx={{ overflowY: 'auto', flex: 1 }}>
                {notifLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress size={24} sx={{ color: '#22c55e' }} />
                  </Box>
                ) : notifications.length === 0 ? (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Notifications sx={{ color: '#374151', fontSize: '2rem', mb: 1 }} />
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>
                      No notifications
                    </Typography>
                  </Box>
                ) : (
                  notifications.map((notif) => (
                    <Box
                      key={notif.id}
                      onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                      sx={{
                        px: 2,
                        py: 1.5,
                        borderBottom: '1px solid #222',
                        cursor: notif.is_read ? 'default' : 'pointer',
                        bgcolor: notif.is_read ? 'transparent' : 'rgba(34,197,94,0.04)',
                        '&:hover': { bgcolor: 'rgba(34, 197, 94, 0.06)' },
                        display: 'flex',
                        gap: 1.5,
                        alignItems: 'flex-start',
                      }}
                    >
                      <Box
                        sx={{
                          mt: 0.25,
                          p: 0.75,
                          borderRadius: '6px',
                          bgcolor: '#222',
                          flexShrink: 0,
                        }}
                      >
                        {notificationIcon(notif.type)}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            color: notif.is_read ? '#9ca3af' : '#e5e7eb',
                            fontWeight: notif.is_read ? 400 : 600,
                            fontSize: '0.85rem',
                          }}
                        >
                          {notif.title}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: '#6b7280', display: 'block', mt: 0.25 }}
                        >
                          {notif.message}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: '#4b5563', display: 'block', mt: 0.5 }}
                        >
                          {new Date(notif.created_at).toLocaleString()}
                        </Typography>
                      </Box>
                      {!notif.is_read && (
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: '#22c55e',
                            flexShrink: 0,
                            mt: 0.75,
                          }}
                        />
                      )}
                    </Box>
                  ))
                )}
              </Box>
            </Popover>

            {/* User Menu */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                ml: 2,
                pl: 2,
                borderLeft: '1px solid #333',
              }}
            >
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                A
              </Avatar>
              <IconButton
                onClick={handleMenuOpen}
                sx={{ color: '#9ca3af', p: 0 }}
              >
                <More fontSize="small" />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                slotProps={{
                  paper: {
                    sx: {
                      bgcolor: '#1a1a1a',
                      border: '1px solid #333',
                      '& .MuiMenuItem-root': {
                        color: '#e5e7eb',
                        '&:hover': { bgcolor: 'rgba(34, 197, 94, 0.1)' },
                      },
                    },
                  },
                }}
              >
                <MenuItem>Profile</MenuItem>
                <MenuItem component={Link} href="/admin/settings">Settings</MenuItem>
                <Divider sx={{ bgcolor: '#333' }} />
                <MenuItem onClick={handleLogout} sx={{ color: '#ef4444 !important' }}>
                  <Logout fontSize="small" sx={{ mr: 1 }} />
                  Logout
                </MenuItem>
              </Menu>
            </Box>
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
  );
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminProvider>
  );
}
