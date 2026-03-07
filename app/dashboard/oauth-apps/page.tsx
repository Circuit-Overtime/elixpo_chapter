'use client';

import {
  Box, Button, TextField, Typography, Dialog, DialogTitle, DialogContent,
  DialogActions, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, IconButton, Chip, Alert,
} from '@mui/material';
import { useState, useEffect } from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SettingsIcon from '@mui/icons-material/Settings';
import Link from 'next/link';

interface OAuthApp {
  client_id: string;
  name: string;
  homepage_url?: string;
  description?: string;
  created_at: string;
  is_active: boolean;
  redirect_uris?: string[];
}

interface CreateAppResponse {
  client_id: string;
  client_secret: string;
  name: string;
  redirect_uris: string[];
  scopes: string[];
  created_at: string;
}

const textFieldSx = {
  '& .MuiOutlinedInput-root': {
    color: '#f5f5f4',
    background: 'transparent',
    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
    '&.Mui-focused fieldset': { borderColor: '#a3e635' },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#a3e635' },
  '& .MuiFormHelperText-root': { color: 'rgba(255, 255, 255, 0.4)' },
};

const tableHeadSx = {
  '& .MuiTableCell-head': {
    color: '#a3e635',
    fontWeight: 600,
    backgroundColor: 'rgba(163, 230, 53, 0.05)',
    borderColor: 'rgba(163, 230, 53, 0.2)',
  },
};

const tableBodySx = {
  '& .MuiTableCell-body': {
    color: '#f5f5f4',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  '& .MuiTableRow-root:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
};

const OAuthAppsPage = () => {
  const [apps, setApps] = useState<OAuthApp[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openSecretDialog, setOpenSecretDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appLoading, setAppLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [newAppData, setNewAppData] = useState<CreateAppResponse | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const [idCopied, setIdCopied] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    homepage_url: '',
    description: '',
    callback_url: '',
  });

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    try {
      setAppLoading(true);
      const response = await fetch('/api/auth/oauth-apps', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch applications');
      const data: any = await response.json();
      setApps(data.apps || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load applications');
    } finally {
      setAppLoading(false);
    }
  };

  const handleCreateApp = async () => {
    setError('');

    if (!formData.name.trim()) {
      setError('Application name is required');
      return;
    }
    if (!formData.homepage_url.trim()) {
      setError('Homepage URL is required');
      return;
    }
    if (!formData.callback_url.trim()) {
      setError('Authorization callback URL is required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/oauth-clients', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          homepage_url: formData.homepage_url,
          description: formData.description || undefined,
          redirect_uris: [formData.callback_url],
          scopes: ['openid', 'profile', 'email'],
        }),
      });

      if (!response.ok) {
        const errorData: any = await response.json();
        throw new Error(errorData.error || 'Failed to create application');
      }

      const data: any = await response.json();
      setNewAppData(data);
      setOpenSecretDialog(true);
      setOpenDialog(false);
      setFormData({ name: '', homepage_url: '', description: '', callback_url: '' });
      setSuccessMessage('Application registered successfully!');
      await fetchApps();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create application');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToClipboard = (text: string, type: 'secret' | 'id') => {
    navigator.clipboard.writeText(text);
    if (type === 'secret') {
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    } else {
      setIdCopied(true);
      setTimeout(() => setIdCopied(false), 2000);
    }
  };

  const handleDeleteApp = async (clientId: string) => {
    if (!confirm('Are you sure? This action cannot be undone.')) return;
    try {
      const response = await fetch(`/api/auth/oauth-clients/${clientId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete application');
      setSuccessMessage('Application deleted successfully');
      await fetchApps();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete application');
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError('');
    setFormData({ name: '', homepage_url: '', description: '', callback_url: '' });
  };

  const dialogPaperSx = {
    backdropFilter: 'blur(20px)',
    background: 'linear-gradient(135deg, rgba(15,20,16,0.97) 0%, rgba(12,15,10,0.97) 100%)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0c0f0a 0%, #0f1410 50%, #0c0f0a 100%)', p: 3 }}>
      <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#f5f5f4', mb: 1 }}>
              OAuth Applications
            </Typography>
            <Typography sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              Register applications to allow users to sign in with their Elixpo account
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            sx={{
              background: 'rgba(163, 230, 53, 0.15)',
              color: '#a3e635',
              border: '1px solid rgba(163, 230, 53, 0.3)',
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '1rem',
              py: 1.2,
              px: 3,
              '&:hover': {
                background: 'rgba(163, 230, 53, 0.25)',
                borderColor: 'rgba(163, 230, 53, 0.5)',
              },
            }}
          >
            New OAuth App
          </Button>
        </Box>

        {/* Messages */}
        {error && (
          <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            {error}
          </Alert>
        )}
        {successMessage && (
          <Alert severity="success" onClose={() => setSuccessMessage('')} sx={{ mb: 2, backgroundColor: 'rgba(163, 230, 53, 0.1)', color: '#a3e635', borderColor: 'rgba(163, 230, 53, 0.3)' }}>
            {successMessage}
          </Alert>
        )}

        {/* Applications Table */}
        <Box
          sx={{
            backdropFilter: 'blur(20px)',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            overflow: 'hidden',
          }}
        >
          {appLoading ? (
            <Box sx={{ p: 4, textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
              Loading applications...
            </Box>
          ) : apps.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', mb: 1 }}>
                No OAuth applications registered yet.
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                Click "New OAuth App" to register your first application.
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ background: 'transparent', boxShadow: 'none' }}>
              <Table>
                <TableHead sx={tableHeadSx}>
                  <TableRow>
                    <TableCell>Application</TableCell>
                    <TableCell>Client ID</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody sx={tableBodySx}>
                  {apps.map((app) => (
                    <TableRow key={app.client_id}>
                      <TableCell>
                        <Typography sx={{ fontWeight: 500, color: '#f5f5f4' }}>{app.name}</Typography>
                        {app.homepage_url && (
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                            {app.homepage_url}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {app.client_id.substring(0, 20)}…
                          <IconButton
                            size="small"
                            onClick={() => handleCopyToClipboard(app.client_id, 'id')}
                            sx={{ color: '#a3e635', p: 0.5 }}
                            title="Copy Client ID"
                          >
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={app.is_active ? 'Active' : 'Inactive'}
                          size="small"
                          sx={{
                            backgroundColor: app.is_active ? 'rgba(163, 230, 53, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                            color: app.is_active ? '#a3e635' : '#9ca3af',
                            border: '1px solid',
                            borderColor: app.is_active ? 'rgba(163, 230, 53, 0.3)' : 'rgba(107, 114, 128, 0.3)',
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                        {new Date(app.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                          <IconButton
                            size="small"
                            component={Link}
                            href={`/dashboard/oauth-apps/${app.client_id}`}
                            title="Settings"
                            sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' } }}
                          >
                            <SettingsIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteApp(app.client_id)}
                            sx={{ color: '#ef4444', '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.1)' } }}
                            title="Delete Application"
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

      {/* Register Application Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: dialogPaperSx }}
      >
        <DialogTitle sx={{ color: '#f5f5f4', fontWeight: 700, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          Register a new OAuth application
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', mb: 2 }}>
            Applications are registered to allow users to sign in with their Elixpo account.
          </Typography>

          <TextField
            fullWidth
            label="Application name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            margin="dense"
            placeholder="My Awesome App"
            helperText="Something users will recognize and trust"
            sx={textFieldSx}
            disabled={loading}
          />
          <TextField
            fullWidth
            label="Homepage URL"
            value={formData.homepage_url}
            onChange={(e) => setFormData({ ...formData, homepage_url: e.target.value })}
            margin="dense"
            placeholder="https://example.com"
            helperText="The full URL to your application homepage"
            sx={textFieldSx}
            disabled={loading}
          />
          <TextField
            fullWidth
            label="Application description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="dense"
            placeholder="What does your application do?"
            multiline
            rows={2}
            helperText="Optional — this is displayed to users on the OAuth consent screen"
            sx={textFieldSx}
            disabled={loading}
          />
          <TextField
            fullWidth
            label="Authorization callback URL"
            value={formData.callback_url}
            onChange={(e) => setFormData({ ...formData, callback_url: e.target.value })}
            margin="dense"
            placeholder="https://example.com/auth/callback"
            helperText="The callback URL in your application where users will be redirected after authorization"
            sx={textFieldSx}
            disabled={loading}
          />

          {error && (
            <Alert severity="error" sx={{ mt: 2, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171' }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', p: 2 }}>
          <Button onClick={handleCloseDialog} sx={{ color: 'rgba(255, 255, 255, 0.6)' }} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateApp}
            variant="contained"
            disabled={loading}
            sx={{
              background: 'rgba(163, 230, 53, 0.15)',
              color: '#a3e635',
              border: '1px solid rgba(163, 230, 53, 0.3)',
              fontWeight: 600,
              '&:hover': { background: 'rgba(163, 230, 53, 0.25)' },
              '&:disabled': { color: 'rgba(255, 255, 255, 0.4)' },
            }}
          >
            {loading ? 'Registering...' : 'Register application'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Secret Credentials Dialog */}
      <Dialog
        open={openSecretDialog}
        onClose={() => setOpenSecretDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: dialogPaperSx }}
      >
        <DialogTitle sx={{ color: '#f5f5f4', fontWeight: 700, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          Your new client secret
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="warning" sx={{ mb: 3, backgroundColor: 'rgba(251, 146, 60, 0.1)', color: '#fed7aa', borderColor: 'rgba(251, 146, 60, 0.3)' }}>
            Make sure to copy your new client secret now. You won't be able to see it again.
          </Alert>

          {newAppData && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box>
                <Typography sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem', mb: 0.75 }}>
                  Client ID
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, background: 'rgba(255, 255, 255, 0.05)', p: 1.5, borderRadius: '8px', border: '1px solid rgba(163, 230, 53, 0.2)' }}>
                  <Typography sx={{ color: '#a3e635', fontFamily: 'monospace', fontSize: '0.85rem', flex: 1, wordBreak: 'break-all' }}>
                    {newAppData.client_id}
                  </Typography>
                  <IconButton size="small" onClick={() => handleCopyToClipboard(newAppData.client_id, 'id')} sx={{ color: '#a3e635' }}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Box>
                {idCopied && <Typography sx={{ color: '#a3e635', fontSize: '0.75rem', mt: 0.5 }}>Copied!</Typography>}
              </Box>

              <Box>
                <Typography sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem', mb: 0.75 }}>
                  Client Secret
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, background: 'rgba(255, 255, 255, 0.05)', p: 1.5, borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <Typography sx={{ color: '#ef4444', fontFamily: 'monospace', fontSize: '0.85rem', flex: 1, wordBreak: 'break-all' }}>
                    {newAppData.client_secret}
                  </Typography>
                  <IconButton size="small" onClick={() => handleCopyToClipboard(newAppData.client_secret, 'secret')} sx={{ color: '#ef4444' }}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Box>
                {secretCopied && <Typography sx={{ color: '#ef4444', fontSize: '0.75rem', mt: 0.5 }}>Copied!</Typography>}
              </Box>

              <Box>
                <Typography sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem', mb: 0.75 }}>
                  Scopes granted
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {newAppData.scopes.map((scope) => (
                    <Chip
                      key={scope}
                      label={scope}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(163, 230, 53, 0.1)',
                        color: '#a3e635',
                        border: '1px solid rgba(163, 230, 53, 0.2)',
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', p: 2 }}>
          <Button
            onClick={() => setOpenSecretDialog(false)}
            variant="contained"
            sx={{
              background: 'rgba(163, 230, 53, 0.15)',
              color: '#a3e635',
              border: '1px solid rgba(163, 230, 53, 0.3)',
              '&:hover': { background: 'rgba(163, 230, 53, 0.25)' },
            }}
          >
            I've saved my credentials
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OAuthAppsPage;
