'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  Alert,
  Snackbar,
  CircularProgress,
  Switch,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import SettingsIcon from '@mui/icons-material/Settings';
import Link from 'next/link';

const AVAILABLE_EVENTS = [
  { value: 'user.created', label: 'User Created' },
  { value: 'user.updated', label: 'User Updated' },
  { value: 'user.deleted', label: 'User Deleted' },
  { value: 'oauth.authorized', label: 'OAuth Authorized' },
  { value: 'oauth.revoked', label: 'OAuth Revoked' },
  { value: 'api_key.created', label: 'API Key Created' },
  { value: 'api_key.revoked', label: 'API Key Revoked' },
];

interface Webhook {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
  last_delivery_at?: string;
}

const cardSx = {
  backdropFilter: 'blur(20px)',
  background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '16px',
};

const dialogSx = {
  backdropFilter: 'blur(20px)',
  background: 'linear-gradient(135deg, rgba(15,20,16,0.97) 0%, rgba(12,15,10,0.97) 100%)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '16px',
};

const textFieldSx = {
  '& .MuiOutlinedInput-root': {
    color: '#f5f5f4',
    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
    '&.Mui-focused fieldset': { borderColor: '#a3e635' },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#a3e635' },
  '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.5)' },
};

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [form, setForm] = useState({
    url: '',
    events: [] as string[],
    secret: '',
  });

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/webhooks', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch webhooks');
      const data: any = await res.json();
      setWebhooks(data.webhooks || []);
    } catch {
      showSnack('Failed to load webhooks', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnack = (message: string, severity: 'success' | 'error') => {
    setSnack({ open: true, message, severity });
  };

  const handleEventToggle = (event: string) => {
    setForm((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  const handleCreate = async () => {
    if (!form.url) return showSnack('URL is required', 'error');
    if (form.events.length === 0) return showSnack('Select at least one event', 'error');

    setCreating(true);
    try {
      const res = await fetch('/api/auth/webhooks', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: form.url,
          events: form.events,
          secret: form.secret || undefined,
        }),
      });
      if (!res.ok) {
        const err: any = await res.json();
        throw new Error(err.error || 'Failed to create webhook');
      }
      setOpenDialog(false);
      setForm({ url: '', events: [], secret: '' });
      await fetchWebhooks();
      showSnack('Webhook created successfully', 'success');
    } catch (err: any) {
      showSnack(err.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this webhook? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/auth/webhooks/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete');
      await fetchWebhooks();
      showSnack('Webhook deleted', 'success');
    } catch {
      showSnack('Failed to delete webhook', 'error');
    }
  };

  const handleTest = async (id: string) => {
    try {
      const res = await fetch(`/api/auth/webhooks/${id}/test`, {
        method: 'POST',
        credentials: 'include',
      });
      const data: any = await res.json();
      if (data.success) {
        showSnack(`Test delivered (HTTP ${data.statusCode})`, 'success');
      } else {
        showSnack(`Test failed: ${data.message}`, 'error');
      }
    } catch {
      showSnack('Failed to send test', 'error');
    }
  };

  const handleToggleActive = async (webhook: Webhook) => {
    try {
      const res = await fetch(`/api/auth/webhooks/${webhook.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !webhook.is_active }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setWebhooks((prev) =>
        prev.map((w) => (w.id === webhook.id ? { ...w, is_active: !w.is_active } : w))
      );
    } catch {
      showSnack('Failed to update webhook', 'error');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', background: '#0f0f0f', p: 3 }}>
      <Box sx={{ maxWidth: '1100px', mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#f5f5f4', mb: 1 }}>
              Webhooks
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.6)' }}>
              Receive real-time HTTP notifications for platform events
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            sx={{
              background: 'rgba(163,230,53,0.15)',
              color: '#a3e635',
              border: '1px solid rgba(163,230,53,0.3)',
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': { background: 'rgba(163,230,53,0.25)' },
            }}
          >
            Add Webhook
          </Button>
        </Box>

        {/* Table */}
        <Box sx={cardSx}>
          {loading ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <CircularProgress sx={{ color: '#a3e635' }} />
            </Box>
          ) : webhooks.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
              No webhooks configured yet. Click "Add Webhook" to get started.
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ background: 'transparent', boxShadow: 'none' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ '& .MuiTableCell-head': { color: '#a3e635', fontWeight: 600, bgcolor: 'rgba(163,230,53,0.05)', borderColor: 'rgba(163,230,53,0.2)' } }}>
                    <TableCell>URL</TableCell>
                    <TableCell>Events</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Last Delivery</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {webhooks.map((webhook) => (
                    <TableRow
                      key={webhook.id}
                      sx={{ '& .MuiTableCell-body': { color: '#f5f5f4', borderColor: 'rgba(255,255,255,0.08)' }, '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}
                    >
                      <TableCell sx={{ maxWidth: 300 }}>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                          {webhook.url}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {webhook.events.map((ev) => (
                            <Chip
                              key={ev}
                              label={ev}
                              size="small"
                              sx={{ bgcolor: 'rgba(163,230,53,0.1)', color: '#a3e635', fontSize: '0.7rem', height: 20 }}
                            />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={webhook.is_active}
                          onChange={() => handleToggleActive(webhook)}
                          size="small"
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': { color: '#a3e635' },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#65a30d' },
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                        {webhook.last_delivery_at
                          ? new Date(webhook.last_delivery_at).toLocaleString()
                          : 'Never'}
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                          <IconButton
                            size="small"
                            title="Send test"
                            onClick={() => handleTest(webhook.id)}
                            sx={{ color: '#a3e635', '&:hover': { bgcolor: 'rgba(163,230,53,0.1)' } }}
                          >
                            <SendIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            title="Settings"
                            component={Link}
                            href={`/dashboard/webhooks/${webhook.id}`}
                            sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' } }}
                          >
                            <SettingsIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            title="Delete"
                            onClick={() => handleDelete(webhook.id)}
                            sx={{ color: '#ef4444', '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' } }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Box>

      {/* Create Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: dialogSx }}>
        <DialogTitle sx={{ color: '#f5f5f4', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          Add Webhook
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            fullWidth
            label="Payload URL"
            placeholder="https://example.com/webhooks/elixpo"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            margin="dense"
            helperText="Must be HTTPS"
            sx={textFieldSx}
          />
          <TextField
            fullWidth
            label="Secret (optional)"
            placeholder="Auto-generated if empty"
            value={form.secret}
            onChange={(e) => setForm({ ...form, secret: e.target.value })}
            margin="dense"
            helperText="Used to sign payloads (X-Elixpo-Signature header)"
            sx={textFieldSx}
          />
          <Typography sx={{ color: 'rgba(255,255,255,0.7)', mt: 2, mb: 1, fontSize: '0.9rem', fontWeight: 600 }}>
            Events to listen for
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {AVAILABLE_EVENTS.map((ev) => (
              <FormControlLabel
                key={ev.value}
                control={
                  <Checkbox
                    checked={form.events.includes(ev.value)}
                    onChange={() => handleEventToggle(ev.value)}
                    size="small"
                    sx={{ color: 'rgba(255,255,255,0.3)', '&.Mui-checked': { color: '#a3e635' } }}
                  />
                }
                label={
                  <Typography sx={{ color: '#e5e7eb', fontSize: '0.9rem' }}>
                    <span style={{ fontFamily: 'monospace', color: '#a3e635', marginRight: 8 }}>{ev.value}</span>
                    {ev.label}
                  </Typography>
                }
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', p: 2 }}>
          <Button onClick={() => setOpenDialog(false)} sx={{ color: 'rgba(255,255,255,0.6)' }} disabled={creating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={creating}
            sx={{
              background: 'rgba(163,230,53,0.15)',
              color: '#a3e635',
              border: '1px solid rgba(163,230,53,0.3)',
              '&:hover': { background: 'rgba(163,230,53,0.25)' },
            }}
          >
            {creating ? 'Creating...' : 'Add Webhook'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack({ ...snack, open: false })}
          sx={{
            bgcolor: snack.severity === 'success' ? 'rgba(163,230,53,0.15)' : 'rgba(239,68,68,0.15)',
            color: snack.severity === 'success' ? '#a3e635' : '#ef4444',
            border: `1px solid ${snack.severity === 'success' ? 'rgba(163,230,53,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
