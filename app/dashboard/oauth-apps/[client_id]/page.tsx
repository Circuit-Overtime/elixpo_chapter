'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  TextField,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';

const cardSx = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '16px',
  p: 3,
  mb: 3,
};

const textFieldSx = {
  '& .MuiOutlinedInput-root': {
    color: '#f5f5f4',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
    '&.Mui-focused fieldset': { borderColor: '#a3e635' },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#a3e635' },
  '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.4)' },
};

const monoBox = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(163,230,53,0.2)',
  borderRadius: '8px',
  p: 1.5,
};

export default function OAuthAppSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.client_id as string;

  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    homepage_url: '',
    redirect_uris: '',
  });

  useEffect(() => {
    const fetchApp = async () => {
      try {
        const res = await fetch(`/api/auth/oauth-clients/${clientId}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Not found');
        const data: any = await res.json();
        setApp(data);
        setForm({
          name: data.name || '',
          description: data.description || '',
          homepage_url: data.homepage_url || '',
          redirect_uris: Array.isArray(data.redirect_uris)
            ? data.redirect_uris.join('\n')
            : (data.redirect_uris || ''),
        });
      } catch {
        router.push('/dashboard/oauth-apps');
      } finally {
        setLoading(false);
      }
    };
    fetchApp();
  }, [clientId, router]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const redirectUris = form.redirect_uris
        .split('\n')
        .map((u) => u.trim())
        .filter(Boolean);

      const res = await fetch(`/api/auth/oauth-clients/${clientId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          homepage_url: form.homepage_url,
          redirect_uris: redirectUris,
        }),
      });

      if (!res.ok) {
        const err: any = await res.json();
        throw new Error(err.error || 'Failed to save');
      }

      const updated: any = await res.json();
      setApp(updated);
      setMessage({ text: 'Application updated successfully', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this application? All OAuth tokens issued by this app will be revoked. This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/auth/oauth-clients/${clientId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete');
      router.push('/dashboard/oauth-apps');
    } catch {
      setMessage({ text: 'Failed to delete application', type: 'error' });
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', background: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: '#a3e635' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', background: '#0f0f0f', p: 3 }}>
      <Box sx={{ maxWidth: '800px', mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/dashboard/oauth-apps')}
            sx={{ color: 'rgba(255,255,255,0.5)', mb: 2, textTransform: 'none', '&:hover': { color: '#fff' } }}
          >
            Back to OAuth Apps
          </Button>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#f5f5f4' }}>
                {app?.name || 'Application Settings'}
              </Typography>
              {app?.is_active === false && (
                <Chip label="Inactive" size="small" sx={{ mt: 0.5, bgcolor: 'rgba(107,114,128,0.2)', color: '#9ca3af' }} />
              )}
            </Box>
          </Box>
        </Box>

        {message && (
          <Alert
            severity={message.type}
            onClose={() => setMessage(null)}
            sx={{
              mb: 3,
              bgcolor: message.type === 'success' ? 'rgba(163,230,53,0.1)' : 'rgba(239,68,68,0.1)',
              color: message.type === 'success' ? '#a3e635' : '#ef4444',
              border: `1px solid ${message.type === 'success' ? 'rgba(163,230,53,0.3)' : 'rgba(239,68,68,0.3)'}`,
              '& .MuiAlert-icon': { color: message.type === 'success' ? '#a3e635' : '#ef4444' },
            }}
          >
            {message.text}
          </Alert>
        )}

        {/* Credentials (read-only) */}
        <Box sx={cardSx}>
          <Typography sx={{ color: '#f5f5f4', fontWeight: 600, mb: 2 }}>Credentials</Typography>

          <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', mb: 0.75 }}>Client ID</Typography>
          <Box sx={{ ...monoBox, mb: 2 }}>
            <Typography sx={{ color: '#a3e635', fontFamily: 'monospace', fontSize: '0.85rem', flex: 1, wordBreak: 'break-all' }}>
              {app?.client_id || clientId}
            </Typography>
            <Tooltip title={copiedField === 'client_id' ? 'Copied!' : 'Copy'}>
              <IconButton
                size="small"
                onClick={() => copyToClipboard(app?.client_id || clientId, 'client_id')}
                sx={{ color: '#a3e635' }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', mb: 0.75 }}>Client Secret</Typography>
          <Box sx={{ ...monoBox, border: '1px solid rgba(239,68,68,0.2)' }}>
            <Typography sx={{ color: '#9ca3af', fontFamily: 'monospace', fontSize: '0.85rem', flex: 1 }}>
              ••••••••••••••••••••••••••••••••
            </Typography>
            <Tooltip title="Secret is only shown once at creation">
              <span>
                <IconButton size="small" disabled sx={{ color: 'rgba(255,255,255,0.2)' }}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', mt: 0.5, display: 'block' }}>
            Client secrets are not recoverable. Create a new app if you've lost your secret.
          </Typography>
        </Box>

        {/* General Settings */}
        <Box sx={cardSx}>
          <Typography sx={{ color: '#f5f5f4', fontWeight: 600, mb: 2 }}>General</Typography>
          <TextField
            fullWidth
            label="Application Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            sx={{ ...textFieldSx, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Homepage URL"
            placeholder="https://example.com"
            value={form.homepage_url}
            onChange={(e) => setForm({ ...form, homepage_url: e.target.value })}
            sx={{ ...textFieldSx, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Description"
            placeholder="What does your application do?"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            multiline
            rows={2}
            sx={textFieldSx}
          />
        </Box>

        {/* OAuth Settings */}
        <Box sx={cardSx}>
          <Typography sx={{ color: '#f5f5f4', fontWeight: 600, mb: 1 }}>OAuth Settings</Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', mb: 2 }}>
            Scopes: {Array.isArray(app?.scopes) ? app.scopes.join(', ') : (app?.scopes || 'openid profile email')}
          </Typography>
          <TextField
            fullWidth
            label="Redirect URIs"
            placeholder="https://example.com/callback"
            value={form.redirect_uris}
            onChange={(e) => setForm({ ...form, redirect_uris: e.target.value })}
            multiline
            rows={3}
            helperText="One URI per line"
            sx={textFieldSx}
          />
        </Box>

        {/* Stats */}
        {(app?.request_count !== undefined || app?.last_used) && (
          <Box sx={cardSx}>
            <Typography sx={{ color: '#f5f5f4', fontWeight: 600, mb: 2 }}>Usage</Typography>
            <Box sx={{ display: 'flex', gap: 4 }}>
              {app?.request_count !== undefined && (
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#a3e635' }}>
                    {(app.request_count || 0).toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Total requests</Typography>
                </Box>
              )}
              {app?.last_used && (
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#f5f5f4', fontSize: '1rem', mt: 0.5 }}>
                    {new Date(app.last_used).toLocaleDateString()}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Last used</Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* Save */}
        <Box sx={{ mb: 4 }}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving}
            sx={{
              background: 'rgba(163,230,53,0.15)',
              color: '#a3e635',
              border: '1px solid rgba(163,230,53,0.3)',
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': { background: 'rgba(163,230,53,0.25)' },
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>

        {/* Danger Zone */}
        <Box sx={{ ...cardSx, border: '1px solid rgba(239,68,68,0.35)' }}>
          <Typography sx={{ color: '#ef4444', fontWeight: 600, mb: 1 }}>Danger Zone</Typography>
          <Divider sx={{ borderColor: 'rgba(239,68,68,0.2)', mb: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography sx={{ color: '#f5f5f4', fontWeight: 500 }}>Delete application</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                Permanently delete this app and revoke all issued OAuth tokens
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<DeleteIcon />}
              onClick={handleDelete}
              sx={{
                borderColor: 'rgba(239,68,68,0.4)',
                color: '#ef4444',
                textTransform: 'none',
                '&:hover': { bgcolor: 'rgba(239,68,68,0.1)', borderColor: '#ef4444' },
              }}
            >
              Delete
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
