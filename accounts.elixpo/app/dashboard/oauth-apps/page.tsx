'use client';

import {
  Box, Button, TextField, Typography, Dialog, DialogTitle, DialogContent,
  DialogActions, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, IconButton, Chip, Alert, Snackbar,
} from '@mui/material';
import { useState, useEffect } from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
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

  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({ open: false, message: '', severity: 'success' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; clientId: string; appName: string }>({ open: false, clientId: '', appName: '' });

  const [formData, setFormData] = useState({
    name: '',
    homepage_url: '',
    description: '',
    redirect_uris: [''],
  });

  useEffect(() => {
    fetchApps();
    fetchVerificationStatus();
  }, []);

  const fetchVerificationStatus = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data : any = await res.json();
        setEmailVerified(data.emailVerified ?? false);
      }
    } catch {
      // fail silently
    }
  };

  const showToast = (message: string, severity: 'success' | 'error' | 'warning') => {
    setToast({ open: true, message, severity });
  };

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
    const uris = formData.redirect_uris.map(u => u.trim()).filter(Boolean);
    if (uris.length === 0) {
      setError('At least one redirect URI is required');
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
          redirect_uris: uris,
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
      setFormData({ name: '', homepage_url: '', description: '', redirect_uris: [''] });
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
    try {
      const response = await fetch(`/api/auth/oauth-clients/${clientId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete application');
      showToast('Application deleted successfully', 'success');
      setDeleteConfirm({ open: false, clientId: '', appName: '' });
      await fetchApps();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete application', 'error');
      setDeleteConfirm({ open: false, clientId: '', appName: '' });
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError('');
    setFormData({ name: '', homepage_url: '', description: '', redirect_uris: [''] });
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
              Register applications to allow users to sign in with their SSO based Account.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              if (emailVerified === false) {
                showToast('Please verify your email address before registering an OAuth application.', 'warning');
                return;
              }
              setOpenDialog(true);
            }}
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
                            onClick={() => setDeleteConfirm({ open: true, clientId: app.client_id, appName: app.name })}
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
          <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', mt: 2, mb: 0.5 }}>
            Redirect URIs
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', mb: 1 }}>
            The callback URLs where users will be redirected after authorization (up to 5)
          </Typography>
          {formData.redirect_uris.map((uri, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <TextField
                fullWidth
                size="small"
                value={uri}
                onChange={(e) => {
                  const updated = [...formData.redirect_uris];
                  updated[index] = e.target.value;
                  setFormData({ ...formData, redirect_uris: updated });
                }}
                placeholder="https://example.com/auth/callback"
                sx={textFieldSx}
                disabled={loading}
              />
              {formData.redirect_uris.length > 1 && (
                <IconButton
                  size="small"
                  onClick={() => {
                    const updated = formData.redirect_uris.filter((_, i) => i !== index);
                    setFormData({ ...formData, redirect_uris: updated });
                  }}
                  sx={{ color: '#ef4444', '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' } }}
                  disabled={loading}
                >
                  <RemoveCircleOutlineIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          ))}
          {formData.redirect_uris.length < 5 && (
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setFormData({ ...formData, redirect_uris: [...formData.redirect_uris, ''] })}
              sx={{ color: '#a3e635', textTransform: 'none', fontSize: '0.8rem', mt: 0.5 }}
              disabled={loading}
            >
              Add URI
            </Button>
          )}

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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, clientId: '', appName: '' })}
        PaperProps={{ sx: dialogPaperSx }}
      >
        <DialogTitle sx={{ color: '#f5f5f4', fontWeight: 700, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningAmberIcon sx={{ color: '#ef4444' }} />
            Deactivate application
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
            Are you sure you want to deactivate <strong style={{ color: '#f5f5f4' }}>{deleteConfirm.appName}</strong>?
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.4)' }}>
            This will immediately stop all OAuth authentication requests for this application. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', p: 2 }}>
          <Button onClick={() => setDeleteConfirm({ open: false, clientId: '', appName: '' })} sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            Cancel
          </Button>
          <Button
            onClick={() => handleDeleteApp(deleteConfirm.clientId)}
            variant="contained"
            sx={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              fontWeight: 600,
              '&:hover': { background: 'rgba(239, 68, 68, 0.25)' },
            }}
          >
            Deactivate
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

      {/* Toast Snackbar */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast({ ...toast, open: false })}
          severity={toast.severity}
          variant="filled"
          sx={{
            ...(toast.severity === 'warning' && { backgroundColor: '#b45309', color: '#fff' }),
            ...(toast.severity === 'success' && { backgroundColor: '#15803d', color: '#fff' }),
            ...(toast.severity === 'error' && { backgroundColor: '#b91c1c', color: '#fff' }),
          }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default OAuthAppsPage;
