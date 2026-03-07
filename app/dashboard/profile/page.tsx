'use client';

import {
  Box,
  Button,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  Switch,
  FormControlLabel,
  FormGroup,
  CircularProgress,
} from '@mui/material';
import { useState, useEffect } from 'react';
import PersonIcon from '@mui/icons-material/Person';
import EditIcon from '@mui/icons-material/Edit';
import NotificationsIcon from '@mui/icons-material/Notifications';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import VerifiedIcon from '@mui/icons-material/Verified';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useRouter } from 'next/navigation';

interface UserProfile {
  email: string;
  id: string;
  isAdmin: boolean;
  provider: string;
  avatar?: string | null;
  emailVerified?: boolean;
}

interface NotificationPreferences {
  email_login_alerts: boolean;
  email_app_activity: boolean;
  email_weekly_digest: boolean;
  email_security_alerts: boolean;
}

const cardSx = {
  bgcolor: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '16px',
  p: 3,
  mb: 3,
};

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
};

const switchSx = {
  '& .MuiSwitch-switchBase.Mui-checked': { color: '#a3e635' },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#65a30d' },
};

const sectionTitleSx = {
  fontWeight: 700,
  color: '#f5f5f4',
  mb: 0.5,
  display: 'flex',
  alignItems: 'center',
  gap: 1,
};

const sectionSubtitleSx = {
  color: 'rgba(255,255,255,0.5)',
  fontSize: '0.9rem',
  mb: 3,
};

const dividerSx = {
  borderColor: 'rgba(255,255,255,0.08)',
  my: 2.5,
};

const ProfilePage = () => {
  const router = useRouter();

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

  // Update profile state
  const [locale, setLocale] = useState('en');
  const [timezone, setTimezone] = useState('UTC');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState('');
  const [updateError, setUpdateError] = useState('');

  // Notification preferences state
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
    email_login_alerts: false,
    email_app_activity: false,
    email_weekly_digest: false,
    email_security_alerts: false,
  });
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifSaveLoading, setNotifSaveLoading] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState('');
  const [notifError, setNotifError] = useState('');

  // Delete account state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    fetchProfile();
    fetchNotifPrefs();
  }, []);

  const fetchProfile = async () => {
    try {
      setProfileLoading(true);
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch profile');
      const data: UserProfile = await res.json();
      setProfile(data);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchNotifPrefs = async () => {
    try {
      setNotifLoading(true);
      const res = await fetch('/api/auth/notification-preferences', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch notification preferences');
      const data: NotificationPreferences = await res.json();
      setNotifPrefs(data);
    } catch (err) {
      setNotifError(err instanceof Error ? err.message : 'Failed to load notification preferences');
    } finally {
      setNotifLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    setUpdateError('');
    setUpdateSuccess('');
    setUpdateLoading(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ locale, timezone }),
      });
      if (!res.ok) {
        const data: any = await res.json();
        throw new Error(data.error || 'Failed to update profile');
      }
      setUpdateSuccess('Profile updated successfully.');
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleSaveNotifPrefs = async () => {
    setNotifError('');
    setNotifSuccess('');
    setNotifSaveLoading(true);
    try {
      const res = await fetch('/api/auth/notification-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(notifPrefs),
      });
      if (!res.ok) {
        const data: any = await res.json();
        throw new Error(data.error || 'Failed to save preferences');
      }
      setNotifSuccess('Notification preferences saved.');
    } catch (err) {
      setNotifError(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setNotifSaveLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');
    setDeleteLoading(true);
    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        let msg = 'Failed to delete account';
        try { const data: any = await res.json(); msg = data.error || msg; } catch { /* non-JSON response */ }
        throw new Error(msg);
      }
      router.push('/');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account');
      setDeleteLoading(false);
    }
  };

  const handleNotifToggle = (key: keyof NotificationPreferences) => {
    setNotifPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Box sx={{ minHeight: '100vh', background: '#0f0f0f', p: 3 }}>
      <Box sx={{ maxWidth: '800px', mx: 'auto' }}>
        {/* Page Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#f5f5f4', mb: 1 }}>
            Profile
          </Typography>
          <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            Manage your account information and preferences
          </Typography>
        </Box>

        {/* 1. Profile Info Card */}
        <Box sx={cardSx}>
          <Typography variant="h6" sx={sectionTitleSx}>
            <PersonIcon sx={{ color: '#a3e635', fontSize: '1.2rem' }} />
            Profile Info
          </Typography>
          <Typography sx={sectionSubtitleSx}>Your account details</Typography>

          {profileLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, color: 'rgba(255,255,255,0.5)' }}>
              <CircularProgress size={18} sx={{ color: '#a3e635' }} />
              <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                Loading profile...
              </Typography>
            </Box>
          ) : profileError ? (
            <Alert
              severity="error"
              sx={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}
            >
              {profileError}
            </Alert>
          ) : profile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* Avatar + Email Row */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {profile.avatar ? (
                  <Box
                    component="img"
                    src={profile.avatar}
                    alt="Avatar"
                    sx={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid rgba(163,230,53,0.3)' }}
                  />
                ) : (
                  <Box sx={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #a3e635 0%, #65a30d 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', fontWeight: 700, color: '#0f0f0f' }}>
                    {profile.email?.charAt(0).toUpperCase()}
                  </Box>
                )}
                <Box>
                  <Typography sx={{ color: '#f5f5f4', fontWeight: 600, fontSize: '1rem' }}>{profile.email}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    {profile.emailVerified ? (
                      <Chip icon={<VerifiedIcon sx={{ fontSize: '0.95rem !important', color: '#a3e635 !important' }} />} label="Verified" size="small" sx={{ backgroundColor: 'rgba(163,230,53,0.1)', color: '#a3e635', border: '1px solid rgba(163,230,53,0.25)', fontWeight: 500, height: 24 }} />
                    ) : (
                      <Chip label="Unverified" size="small" sx={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)', fontWeight: 500, height: 24 }} />
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Sign-in Method */}
              <Box>
                <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', mb: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Sign-in Method
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px' }}>
                  {profile.provider === 'google' && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  )}
                  {profile.provider === 'github' && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                  )}
                  {(profile.provider === 'email' || !profile.provider) && (
                    <PersonIcon sx={{ color: '#a3e635', fontSize: '1.2rem' }} />
                  )}
                  <Typography sx={{ color: '#f5f5f4', fontWeight: 500, textTransform: 'capitalize' }}>
                    {profile.provider === 'email' || !profile.provider ? 'Email & Password' : `${profile.provider} OAuth`}
                  </Typography>
                </Box>
              </Box>

              {/* Account ID */}
              <Box>
                <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', mb: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Account ID
                </Typography>
                <Typography
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.88rem',
                    color: 'rgba(255,255,255,0.75)',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    px: 2,
                    py: 1,
                    display: 'inline-block',
                    letterSpacing: '0.03em',
                  }}
                >
                  {profile.id}
                </Typography>
              </Box>

              {/* Badges */}
              <Box>
                <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', mb: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Account Badges
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={profile.provider || 'email'}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(99,102,241,0.15)',
                      color: '#a5b4fc',
                      border: '1px solid rgba(99,102,241,0.3)',
                      fontWeight: 500,
                      textTransform: 'capitalize',
                    }}
                  />
                  {profile.isAdmin && (
                    <Chip
                      icon={<AdminPanelSettingsIcon sx={{ fontSize: '0.9rem !important', color: '#fbbf24 !important' }} />}
                      label="Admin"
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(251,191,36,0.12)',
                        color: '#fbbf24',
                        border: '1px solid rgba(251,191,36,0.3)',
                        fontWeight: 600,
                      }}
                    />
                  )}
                </Box>
              </Box>
            </Box>
          ) : null}
        </Box>

        {/* 2. Update Profile Card */}
        <Box sx={cardSx}>
          <Typography variant="h6" sx={sectionTitleSx}>
            <EditIcon sx={{ color: '#a3e635', fontSize: '1.2rem' }} />
            Update Profile
          </Typography>
          <Typography sx={sectionSubtitleSx}>Set your locale and timezone preferences</Typography>

          {updateSuccess && (
            <Alert
              severity="success"
              sx={{ mb: 2.5, backgroundColor: 'rgba(163,230,53,0.1)', color: '#a3e635', borderColor: 'rgba(163,230,53,0.3)' }}
            >
              {updateSuccess}
            </Alert>
          )}
          {updateError && (
            <Alert
              severity="error"
              sx={{ mb: 2.5, backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}
            >
              {updateError}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Locale"
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              placeholder="en"
              helperText="Language/locale code (e.g. en, fr, de)"
              sx={{
                ...textFieldSx,
                '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.45)' },
              }}
              disabled={updateLoading}
            />
            <TextField
              fullWidth
              label="Timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="UTC"
              helperText="IANA timezone (e.g. UTC, America/New_York, Europe/London)"
              sx={{
                ...textFieldSx,
                '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.45)' },
              }}
              disabled={updateLoading}
            />
          </Box>

          <Box sx={{ mt: 3 }}>
            <Button
              variant="contained"
              onClick={handleUpdateProfile}
              disabled={updateLoading}
              sx={{
                background: 'rgba(163,230,53,0.15)',
                color: '#a3e635',
                border: '1px solid rgba(163,230,53,0.3)',
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '0.95rem',
                py: 1.1,
                px: 3,
                '&:hover': {
                  background: 'rgba(163,230,53,0.25)',
                  borderColor: 'rgba(163,230,53,0.5)',
                },
                '&:disabled': { color: 'rgba(255,255,255,0.35)' },
              }}
            >
              {updateLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} sx={{ color: '#a3e635' }} />
                  Saving...
                </Box>
              ) : (
                'Save Changes'
              )}
            </Button>
          </Box>
        </Box>

        {/* 3. Notification Preferences Card */}
        <Box sx={cardSx}>
          <Typography variant="h6" sx={sectionTitleSx}>
            <NotificationsIcon sx={{ color: '#a3e635', fontSize: '1.2rem' }} />
            Notification Preferences
          </Typography>
          <Typography sx={sectionSubtitleSx}>Control which email notifications you receive</Typography>

          {notifSuccess && (
            <Alert
              severity="success"
              sx={{ mb: 2.5, backgroundColor: 'rgba(163,230,53,0.1)', color: '#a3e635', borderColor: 'rgba(163,230,53,0.3)' }}
            >
              {notifSuccess}
            </Alert>
          )}
          {notifError && (
            <Alert
              severity="error"
              sx={{ mb: 2.5, backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}
            >
              {notifError}
            </Alert>
          )}

          {notifLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CircularProgress size={18} sx={{ color: '#a3e635' }} />
              <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                Loading preferences...
              </Typography>
            </Box>
          ) : (
            <FormGroup sx={{ gap: 0.5 }}>
              {[
                {
                  key: 'email_login_alerts' as const,
                  label: 'Login Alerts',
                  description: 'Email me when a new login is detected',
                },
                {
                  key: 'email_app_activity' as const,
                  label: 'App Activity',
                  description: 'Email me on OAuth app usage',
                },
                {
                  key: 'email_weekly_digest' as const,
                  label: 'Weekly Digest',
                  description: 'Receive weekly activity summary',
                },
                {
                  key: 'email_security_alerts' as const,
                  label: 'Security Alerts',
                  description: 'Email on suspicious activity',
                },
              ].map(({ key, label, description }) => (
                <Box
                  key={key}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    py: 1.5,
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    '&:last-child': { borderBottom: 'none' },
                  }}
                >
                  <Box>
                    <Typography sx={{ color: '#f5f5f4', fontWeight: 500, fontSize: '0.95rem' }}>
                      {label}
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.83rem', mt: 0.2 }}>
                      {description}
                    </Typography>
                  </Box>
                  <Switch
                    checked={notifPrefs[key]}
                    onChange={() => handleNotifToggle(key)}
                    sx={switchSx}
                    disabled={notifSaveLoading}
                  />
                </Box>
              ))}
            </FormGroup>
          )}

          {!notifLoading && (
            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                onClick={handleSaveNotifPrefs}
                disabled={notifSaveLoading}
                sx={{
                  background: 'rgba(163,230,53,0.15)',
                  color: '#a3e635',
                  border: '1px solid rgba(163,230,53,0.3)',
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  py: 1.1,
                  px: 3,
                  '&:hover': {
                    background: 'rgba(163,230,53,0.25)',
                    borderColor: 'rgba(163,230,53,0.5)',
                  },
                  '&:disabled': { color: 'rgba(255,255,255,0.35)' },
                }}
              >
                {notifSaveLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={16} sx={{ color: '#a3e635' }} />
                    Saving...
                  </Box>
                ) : (
                  'Save Preferences'
                )}
              </Button>
            </Box>
          )}
        </Box>

        {/* 4. Danger Zone Card */}
        <Box
          sx={{
            ...cardSx,
            border: '1px solid rgba(239,68,68,0.35)',
            mb: 0,
          }}
        >
          <Typography variant="h6" sx={{ ...sectionTitleSx, color: '#f87171' }}>
            <WarningAmberIcon sx={{ color: '#ef4444', fontSize: '1.2rem' }} />
            Danger Zone
          </Typography>
          <Typography sx={{ ...sectionSubtitleSx, mb: 2.5 }}>
            Irreversible actions — proceed with caution
          </Typography>

          {deleteError && (
            <Alert
              severity="error"
              sx={{ mb: 2.5, backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}
            >
              {deleteError}
            </Alert>
          )}

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
              p: 2,
              borderRadius: '10px',
              background: 'rgba(239,68,68,0.04)',
              border: '1px solid rgba(239,68,68,0.15)',
            }}
          >
            <Box>
              <Typography sx={{ color: '#f5f5f4', fontWeight: 600, fontSize: '0.95rem' }}>
                Delete Account
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.83rem', mt: 0.2 }}>
                Permanently remove your account and all associated data
              </Typography>
            </Box>
            <Button
              variant="outlined"
              onClick={() => setDeleteDialogOpen(true)}
              sx={{
                color: '#ef4444',
                borderColor: 'rgba(239,68,68,0.5)',
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '0.9rem',
                py: 0.9,
                px: 2.5,
                '&:hover': {
                  borderColor: '#ef4444',
                  backgroundColor: 'rgba(239,68,68,0.08)',
                },
              }}
            >
              Delete Account
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Delete Account Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleteLoading && setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            backdropFilter: 'blur(20px)',
            background: 'linear-gradient(135deg, rgba(20,12,12,0.97) 0%, rgba(15,10,10,0.97) 100%)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '16px',
            minWidth: '360px',
          },
        }}
      >
        <DialogTitle
          sx={{
            color: '#f87171',
            fontWeight: 700,
            borderBottom: '1px solid rgba(239,68,68,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <WarningAmberIcon sx={{ color: '#ef4444' }} />
          Delete Account
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography sx={{ color: '#f5f5f4', mb: 1.5, fontWeight: 500 }}>
            Are you sure?
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.92rem', lineHeight: 1.6 }}>
            This action is <strong style={{ color: '#f87171' }}>permanent</strong> and cannot be undone.
            All your data, including OAuth applications and account settings, will be permanently deleted.
          </Typography>
          {deleteError && (
            <Alert
              severity="error"
              sx={{ mt: 2, backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}
            >
              {deleteError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(239,68,68,0.15)', p: 2, gap: 1 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleteLoading}
            sx={{
              color: 'rgba(255,255,255,0.6)',
              textTransform: 'none',
              fontWeight: 500,
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)' },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteAccount}
            disabled={deleteLoading}
            variant="contained"
            sx={{
              background: 'rgba(239,68,68,0.2)',
              color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.4)',
              fontWeight: 700,
              textTransform: 'none',
              fontSize: '0.9rem',
              '&:hover': {
                background: 'rgba(239,68,68,0.3)',
                borderColor: '#ef4444',
              },
              '&:disabled': { color: 'rgba(255,255,255,0.35)' },
            }}
          >
            {deleteLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={15} sx={{ color: '#ef4444' }} />
                Deleting...
              </Box>
            ) : (
              'Delete Account'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfilePage;
