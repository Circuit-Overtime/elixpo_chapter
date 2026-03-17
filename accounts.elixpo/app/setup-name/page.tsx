'use client';

import { Box, Button, TextField, Typography, Snackbar, Alert } from '@mui/material';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

const SetupNamePage = () => {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [currentName, setCurrentName] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchCurrentName();
  }, []);

  const fetchCurrentName = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) {
        router.push('/login');
        return;
      }
      const data: any = await res.json();
      setCurrentName(data.displayName || '');
    } catch {
      router.push('/login');
    } finally {
      setPageLoading(false);
    }
  };

  const handleSave = async () => {
    const trimmed = displayName.trim();
    if (!trimmed || trimmed.length < 2) {
      setToast({ open: true, message: 'Display name must be at least 2 characters.', severity: 'error' });
      return;
    }
    if (trimmed.length > 32) {
      setToast({ open: true, message: 'Display name must be 32 characters or less.', severity: 'error' });
      return;
    }
    if (!/^[a-zA-Z0-9 _-]+$/.test(trimmed)) {
      setToast({ open: true, message: 'Only letters, numbers, spaces, hyphens and underscores are allowed.', severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ display_name: trimmed }),
      });
      if (!res.ok) {
        const data: any = await res.json();
        throw new Error(data.error || 'Failed to set display name');
      }
      setToast({ open: true, message: 'Display name set!', severity: 'success' });
      setTimeout(() => router.push('/dashboard/oauth-apps'), 1000);
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : 'Failed to save', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    // If user has no name yet, assign a random one so the sidebar isn't empty
    if (!currentName) {
      try {
        const adj = ['swift', 'cool', 'bright', 'bold', 'calm', 'keen', 'wild', 'free'];
        const noun = ['fox', 'bear', 'hawk', 'wolf', 'lynx', 'deer', 'owl', 'hare'];
        const randomName = `${adj[Math.floor(Math.random() * adj.length)]}-${noun[Math.floor(Math.random() * noun.length)]}`;
        await fetch('/api/auth/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ display_name: randomName }),
        });
      } catch {
        // non-critical
      }
    }
    router.push('/dashboard/oauth-apps');
  };

  if (pageLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0c0f0a 0%, #0f1410 50%, #0c0f0a 100%)' }}>
        <Typography sx={{ color: 'rgba(255,255,255,0.5)' }}>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0c0f0a 0%, #0f1410 50%, #0c0f0a 100%)', p: 2 }}>
      <Box sx={{
        maxWidth: '460px',
        width: '100%',
        backdropFilter: 'blur(20px)',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        p: 4,
      }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#f5f5f4', mb: 1 }}>
            What should we call you?
          </Typography>
          <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.95rem' }}>
            Choose a display name for your account. This is how you&apos;ll appear across Elixpo services.
          </Typography>
        </Box>

        {currentName && (
          <Box sx={{ mb: 2.5, p: 2, background: 'rgba(163, 230, 53, 0.06)', border: '1px solid rgba(163, 230, 53, 0.15)', borderRadius: '10px' }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', mb: 0.5 }}>
              Current name (auto-assigned)
            </Typography>
            <Typography sx={{ color: '#a3e635', fontWeight: 600, fontSize: '1.1rem' }}>
              {currentName}
            </Typography>
          </Box>
        )}

        <TextField
          fullWidth
          label="Display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. John, CoolDev, swift-fox"
          helperText="2-32 characters. Letters, numbers, spaces, hyphens and underscores."
          sx={textFieldSx}
          disabled={loading}
          inputProps={{ maxLength: 32 }}
        />

        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button
            fullWidth
            onClick={handleSkip}
            disabled={loading}
            sx={{
              color: 'rgba(255, 255, 255, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              textTransform: 'none',
              fontSize: '0.95rem',
              fontWeight: 500,
              py: 1.3,
              '&:hover': { borderColor: 'rgba(255, 255, 255, 0.2)', backgroundColor: 'rgba(255, 255, 255, 0.03)' },
            }}
          >
            Skip for now
          </Button>
          <Button
            fullWidth
            variant="contained"
            onClick={handleSave}
            disabled={loading || !displayName.trim()}
            sx={{
              background: 'rgba(163, 230, 53, 0.15)',
              color: '#a3e635',
              border: '1px solid rgba(163, 230, 53, 0.3)',
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '0.95rem',
              py: 1.3,
              '&:hover': { background: 'rgba(163, 230, 53, 0.25)', borderColor: 'rgba(163, 230, 53, 0.5)' },
              '&:disabled': { color: 'rgba(255, 255, 255, 0.3)', borderColor: 'rgba(255, 255, 255, 0.1)' },
            }}
          >
            {loading ? 'Saving...' : 'Set Name'}
          </Button>
        </Box>

        <Typography sx={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '0.8rem', textAlign: 'center', mt: 2.5 }}>
          You can change your display name later from your profile (up to 2 times every 2 weeks).
        </Typography>
      </Box>

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast({ ...toast, open: false })}
          severity={toast.severity}
          variant="filled"
          sx={{
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

export default SetupNamePage;
