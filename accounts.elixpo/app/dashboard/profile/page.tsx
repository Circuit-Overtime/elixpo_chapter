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
        const data = await res.json();
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
        const data = await res.json();
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
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete account');
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
              {/* Email */}
              <Box>
                <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', mb: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Email Address
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  <Chip
                    label={profile.email}
                    size="medium"
                    sx={{
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      color: '#f5f5f4',
                      border: '1px solid rgba(255,255,255,0.12)',
                      fontWeight: 500,
                      fontSize: '0.92rem',
                    }}
                  />
                  {profile.email && (
                    <Chip
                      icon={<VerifiedIcon sx={{ fontSize: '0.95rem !important', color: '#a3e635 !important' }} />}
                      label="Verified"
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(163,230,53,0.1)',
                        color: '#a3e635',
                        border: '1px solid rgba(163,230,53,0.25)',
                        fontWeight: 500,
                      }}
                    />
                  )}
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
                    label={profile.provider}
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
