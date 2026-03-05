'use client';

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  InputAdornment,
  Grid,
  TablePagination,
  Alert,
} from '@mui/material';
import {
  Search,
  Info,
  Warning,
  CheckCircle,
  Error,
} from '@mui/icons-material';
import { useAdminLogs } from '../../../src/lib/hooks/useAdminData';

const getActionIcon = (action: string) => {
  switch (action) {
    case 'user_suspended': return <Warning sx={{ color: '#f59e0b' }} />;
    case 'app_deleted': return <Error sx={{ color: '#ef4444' }} />;
    case 'admin_role_granted': return <CheckCircle sx={{ color: '#22c55e' }} />;
    default: return <Info sx={{ color: '#3b82f6' }} />;
  }
};

const getActionLabel = (action: string) =>
  action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

export default function LogsPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data, loading, error } = useAdminLogs(page + 1, search);
  const logs = data?.logs ?? [];

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') setSearch(searchInput);
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff', mb: 0.5 }}>
          Activity Logs
        </Typography>
        <Typography variant="body2" sx={{ color: '#9ca3af' }}>
          View all admin actions and system events
        </Typography>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px' }}>
            <CardContent>
              <Typography variant="body2" sx={{ color: '#9ca3af', mb: 1 }}>Total Logs</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#fff' }}>
                {loading ? '—' : (data?.pagination?.total ?? logs.length).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px' }}>
            <CardContent>
              <Typography variant="body2" sx={{ color: '#9ca3af', mb: 1 }}>Success Rate</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#22c55e' }}>
                {loading || logs.length === 0
                  ? '—'
                  : `${((logs.filter((l) => l.status === 'success').length / logs.length) * 100).toFixed(1)}%`}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px' }}>
            <CardContent>
              <Typography variant="body2" sx={{ color: '#9ca3af', mb: 1 }}>Showing</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#3b82f6' }}>
                {loading ? '—' : logs.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px' }}>
            <CardContent>
              <Typography variant="body2" sx={{ color: '#9ca3af', mb: 1 }}>Failed Actions</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ef4444' }}>
                {loading ? '—' : logs.filter((l) => l.status === 'failed').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px', mb: 3 }}>
        <CardContent>
          <TextField
            placeholder="Search by admin email, action, or resource... (press Enter)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            fullWidth
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: '#6b7280', mr: 1 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#e5e7eb',
                '& fieldset': { borderColor: '#333' },
                '&:hover fieldset': { borderColor: '#555' },
                '&.Mui-focused fieldset': { borderColor: '#22c55e' },
              },
              '& .MuiOutlinedInput-input::placeholder': { color: '#6b7280', opacity: 1 },
            }}
          />
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid #ef4444' }}>
          {error}
        </Alert>
      )}

      <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
            <CircularProgress sx={{ color: '#22c55e' }} />
          </Box>
        ) : logs.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography sx={{ color: '#6b7280' }}>No activity logs found</Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#111', borderBottom: '1px solid #333' }}>
                  <TableCell sx={{ color: '#9ca3af', fontWeight: 600 }}>Action</TableCell>
                  <TableCell sx={{ color: '#9ca3af', fontWeight: 600 }}>Admin</TableCell>
                  <TableCell sx={{ color: '#9ca3af', fontWeight: 600 }}>Resource</TableCell>
                  <TableCell sx={{ color: '#9ca3af', fontWeight: 600 }}>Changes</TableCell>
                  <TableCell sx={{ color: '#9ca3af', fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ color: '#9ca3af', fontWeight: 600 }}>Timestamp</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow
                    key={log.id}
                    sx={{ borderBottom: '1px solid #333', '&:hover': { bgcolor: 'rgba(34, 197, 94, 0.05)' } }}
                  >
                    <TableCell sx={{ color: '#e5e7eb' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getActionIcon(log.action)}
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {getActionLabel(log.action)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#6b7280' }}>
                            {log.id}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: '#9ca3af' }}>{log.adminEmail ?? '—'}</TableCell>
                    <TableCell>
                      {log.resourceType ? (
                        <Chip
                          label={`${log.resourceType}:${log.resourceId || '—'}`}
                          size="small"
                          sx={{ bgcolor: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', fontSize: '0.75rem' }}
                        />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell sx={{ color: '#9ca3af' }}>
                      <Typography variant="caption">{log.changes || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.status}
                        size="small"
                        sx={{
                          bgcolor: log.status === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: log.status === 'success' ? '#22c55e' : '#ef4444',
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: '#9ca3af' }}>
                      <Typography variant="caption">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={data?.pagination?.total ?? logs.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={50}
              rowsPerPageOptions={[50]}
              sx={{
                color: '#9ca3af',
                borderTop: '1px solid #333',
                '& .MuiTablePagination-actions button': { color: '#9ca3af' },
                '& .MuiTablePagination-actions button:disabled': { color: '#374151' },
              }}
            />
          </Box>
        )}
      </Card>
    </Box>
  );
}
