'use client';

import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  TrendingUp,
  VerifiedUserSharp as Users,
  Apps as AppsIcon,
  Error as ErrorIcon,
  Speed,
  LocalActivity as Activity,
  People,
  CheckCircle,
} from '@mui/icons-material';
import { useDashboardStats } from '../../src/lib/hooks/useAdminData';

const StatCard = ({
  icon: Icon,
  label,
  value,
  change,
  color = '#22c55e',
}: {
  icon: any;
  label: string;
  value: string | number;
  change?: string;
  color?: string;
}) => (
  <Card
    sx={{
      bgcolor: '#1a1a1a',
      border: '1px solid #333',
      borderRadius: '12px',
      '&:hover': {
        borderColor: color,
        boxShadow: `0 0 20px ${color}40`,
      },
      transition: 'all 0.3s ease',
      height: '100%',
    }}
  >
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box
          sx={{
            p: 1.5,
            borderRadius: '8px',
            bgcolor: `${color}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mr: 2,
          }}
        >
          <Icon sx={{ color, fontSize: '1.5rem' }} />
        </Box>
        <Typography variant="body2" sx={{ color: '#9ca3af' }}>
          {label}
        </Typography>
      </Box>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          color: '#fff',
          mb: 1,
        }}
      >
        {value}
      </Typography>
      {change && (
        <Typography
          variant="caption"
          sx={{
            color: change.startsWith('+') ? '#22c55e' : '#ef4444',
            fontSize: '0.75rem',
          }}
        >
          {change} from last period
        </Typography>
      )}
    </CardContent>
  </Card>
);

const ChartCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <Card
    sx={{
      bgcolor: '#1a1a1a',
      border: '1px solid #333',
      borderRadius: '12px',
      p: 2.5,
      height: '100%',
    }}
  >
    <Typography
      variant="h6"
      sx={{
        fontWeight: 600,
        color: '#fff',
        mb: 2,
      }}
    >
      {title}
    </Typography>
    {children}
  </Card>
);

export default function AdminDashboard() {
  const [timeRange, setTimeRange] = useState('7d');
  const { stats, loading, error } = useDashboardStats(timeRange);

  const handleTimeRangeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newTimeRange: string | null
  ) => {
    if (newTimeRange) {
      setTimeRange(newTimeRange);
    }
  };

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          color: '#ef4444',
        }}
      >
        <ErrorIcon sx={{ fontSize: '3rem', mb: 2 }} />
        <Typography variant="h6">Error loading dashboard</Typography>
        <Typography variant="body2" sx={{ color: '#9ca3af', mt: 1 }}>
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with Time Range */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: '#fff',
              mb: 0.5,
            }}
          >
            Dashboard Overview
          </Typography>
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>
            Real-time monitoring of your system
          </Typography>
        </Box>
        <ToggleButtonGroup
          value={timeRange}
          exclusive
          onChange={handleTimeRangeChange}
          sx={{
            bgcolor: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '8px',
            '& .MuiToggleButton-root': {
              color: '#9ca3af',
              border: 'none',
              fontSize: '0.85rem',
              '&.Mui-selected': {
                bgcolor: 'rgba(34, 197, 94, 0.1)',
                color: '#22c55e',
              },
              '&:hover': {
                bgcolor: 'rgba(34, 197, 94, 0.05)',
              },
            },
          }}
        >
          <ToggleButton value="7d">7 Days</ToggleButton>
          <ToggleButton value="30d">30 Days</ToggleButton>
          <ToggleButton value="90d">90 Days</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Stats Grid */}
      {loading ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '300px',
          }}
        >
          <CircularProgress sx={{ color: '#22c55e' }} />
        </Box>
      ) : stats ? (
        <>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatCard
                icon={Users}
                label="Total Users"
                value={stats.totalUsers.toLocaleString()}
                change="+12.5%"
                color="#3b82f6"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatCard
                icon={Activity}
                label="Active Users"
                value={stats.activeUsers.toLocaleString()}
                change="+8.2%"
                color="#22c55e"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatCard
                icon={AppsIcon}
                label="Applications"
                value={stats.totalApps.toLocaleString()}
                change="+4%"
                color="#f59e0b"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatCard
                icon={TrendingUp}
                label="Total Requests"
                value={`${(stats.totalRequests / 1000).toFixed(1)}K`}
                change="+23.1%"
                color="#8b5cf6"
              />
            </Grid>
          </Grid>

          {/* Secondary Stats */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatCard
                icon={Speed}
                label="Avg Response Time"
                value={`${stats.avgResponseTime}ms`}
                change="-2.3%"
                color="#ec4899"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatCard
                icon={ErrorIcon}
                label="Error Rate"
                value={`${(stats.errorRate * 100).toFixed(2)}%`}
                change="+0.5%"
                color="#ef4444"
              />
            </Grid>
          </Grid>

          {/* Charts Section */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, lg: 8 }}>
              <ChartCard title="Request Trend (Last 7 Days)">
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 1,
                    height: '200px',
                    borderBottom: '1px solid #333',
                    pb: 2,
                  }}
                >
                  {stats.requestTrend.map((data, index) => (
                    <Box
                      key={index}
                      sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <Box
                        sx={{
                          width: '100%',
                          height: `${(data.requests / 30000) * 150}px`,
                          bgcolor: '#22c55e',
                          borderRadius: '4px 4px 0 0',
                          opacity: 0.8,
                          '&:hover': { opacity: 1 },
                          transition: 'opacity 0.2s',
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{ color: '#9ca3af', fontSize: '0.7rem' }}
                      >
                        {new Date(data.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </ChartCard>
            </Grid>

            <Grid size={{ xs: 12, lg: 4 }}>
              <ChartCard title="Top Applications">
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {stats.topApps.map((app) => (
                    <Box
                      key={app.id}
                      sx={{
                        pb: 1.5,
                        borderBottom: '1px solid #333',
                        '&:last-child': { borderBottom: 'none' },
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 0.5,
                        }}
                      >
                        <Typography variant="body2" sx={{ color: '#fff' }}>
                          {app.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: '#22c55e', fontWeight: 600 }}
                        >
                          {(app.requests / 1000).toFixed(1)}K
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 1,
                          fontSize: '0.75rem',
                          color: '#6b7280',
                        }}
                      >
                        <span>{app.users} users</span>
                        <span>•</span>
                        <span>{(app.errorRate * 100).toFixed(2)}% errors</span>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </ChartCard>
            </Grid>
          </Grid>

          {/* Recent Activity Section */}
          <Grid container spacing={2}>
            {/* Recent Users */}
            <Grid size={{ xs: 12, lg: 6 }}>
              <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px' }}>
                <CardContent sx={{ pb: '12px !important' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <People sx={{ color: '#3b82f6', fontSize: '1.2rem' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#fff', fontSize: '1rem' }}>
                      Recent Users
                    </Typography>
                  </Box>
                  {(stats.recentUsers ?? []).length === 0 ? (
                    <Typography variant="body2" sx={{ color: '#6b7280', textAlign: 'center', py: 2 }}>
                      No users yet
                    </Typography>
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: '#6b7280', borderColor: '#333', fontSize: '0.75rem', py: 0.75 }}>Email</TableCell>
                          <TableCell sx={{ color: '#6b7280', borderColor: '#333', fontSize: '0.75rem', py: 0.75 }}>Status</TableCell>
                          <TableCell sx={{ color: '#6b7280', borderColor: '#333', fontSize: '0.75rem', py: 0.75 }}>Joined</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(stats.recentUsers ?? []).map((user) => (
                          <TableRow key={user.id} sx={{ '&:hover': { bgcolor: 'rgba(34,197,94,0.04)' } }}>
                            <TableCell sx={{ color: '#e5e7eb', borderColor: '#2a2a2a', py: 0.75, fontSize: '0.85rem' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {user.email}
                                {Boolean(user.is_admin) && (
                                  <Chip label="admin" size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'rgba(34,197,94,0.2)', color: '#22c55e' }} />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ borderColor: '#2a2a2a', py: 0.75 }}>
                              {Boolean(user.email_verified) ? (
                                <CheckCircle sx={{ color: '#22c55e', fontSize: '0.9rem' }} />
                              ) : (
                                <Chip label="unverified" size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'rgba(245,158,11,0.2)', color: '#f59e0b' }} />
                              )}
                            </TableCell>
                            <TableCell sx={{ color: '#6b7280', borderColor: '#2a2a2a', py: 0.75, fontSize: '0.8rem' }}>
                              {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Recent OAuth Apps */}
            <Grid size={{ xs: 12, lg: 6 }}>
              <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px' }}>
                <CardContent sx={{ pb: '12px !important' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <AppsIcon sx={{ color: '#f59e0b', fontSize: '1.2rem' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#fff', fontSize: '1rem' }}>
                      Recent OAuth Apps
                    </Typography>
                  </Box>
                  {(stats.recentApps ?? []).length === 0 ? (
                    <Typography variant="body2" sx={{ color: '#6b7280', textAlign: 'center', py: 2 }}>
                      No apps registered yet
                    </Typography>
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: '#6b7280', borderColor: '#333', fontSize: '0.75rem', py: 0.75 }}>App Name</TableCell>
                          <TableCell sx={{ color: '#6b7280', borderColor: '#333', fontSize: '0.75rem', py: 0.75 }}>Client ID</TableCell>
                          <TableCell sx={{ color: '#6b7280', borderColor: '#333', fontSize: '0.75rem', py: 0.75 }}>Created</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(stats.recentApps ?? []).map((app) => (
                          <TableRow key={app.id} sx={{ '&:hover': { bgcolor: 'rgba(34,197,94,0.04)' } }}>
                            <TableCell sx={{ color: '#e5e7eb', borderColor: '#2a2a2a', py: 0.75, fontSize: '0.85rem' }}>
                              {app.client_name}
                            </TableCell>
                            <TableCell sx={{ borderColor: '#2a2a2a', py: 0.75 }}>
                              <Typography variant="caption" sx={{ color: '#6b7280', fontFamily: 'monospace' }}>
                                {app.client_id?.slice(0, 12)}…
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ color: '#6b7280', borderColor: '#2a2a2a', py: 0.75, fontSize: '0.8rem' }}>
                              {app.created_at ? new Date(app.created_at).toLocaleDateString() : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      ) : null}
    </Box>
  );
}
