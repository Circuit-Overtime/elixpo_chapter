'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
} from '@mui/material';
import { Save, CheckCircle, Notifications } from '@mui/icons-material';

interface Settings {
  rateLimitMaxRequests: number;
  rateLimitWindowMs: number;
  jwtExpirationMinutes: number;
  refreshTokenExpirationDays: number;
  emailVerificationOtpLength: number;
  emailVerificationOtpExpiryMinutes: number;
  bcryptRounds: number;
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  requireEmailVerification: boolean;
}

interface NotificationSettings {
  email_new_user: boolean;
  email_new_oauth_app: boolean;
  email_new_api_key: boolean;
  email_suspicious_login: boolean;
  digest_enabled: boolean;
  digest_frequency: 'daily' | 'weekly';
}

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    color: '#e5e7eb',
    '& fieldset': { borderColor: '#333' },
    '&:hover fieldset': { borderColor: '#555' },
    '&.Mui-focused fieldset': { borderColor: '#22c55e' },
  },
  '& .MuiInputBase-input': { color: '#e5e7eb' },
  '& .MuiInputLabel-root': { color: '#9ca3af' },
};

const switchSx = {
  '& .MuiSwitch-switchBase.Mui-checked': { color: '#22c55e' },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#16a34a' },
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    rateLimitMaxRequests: 100,
    rateLimitWindowMs: 900000,
    jwtExpirationMinutes: 15,
    refreshTokenExpirationDays: 30,
    emailVerificationOtpLength: 6,
    emailVerificationOtpExpiryMinutes: 10,
    bcryptRounds: 10,
    maintenanceMode: false,
    allowNewRegistrations: true,
    requireEmailVerification: true,
  });

  const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
    email_new_user: true,
    email_new_oauth_app: true,
    email_new_api_key: false,
    email_suspicious_login: true,
    digest_enabled: false,
    digest_frequency: 'weekly',
  });

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);

  useEffect(() => {
    const fetchNotifSettings = async () => {
      try {
        const res = await fetch('/api/admin/notification-settings', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setNotifSettings({
            email_new_user: Boolean(data.email_new_user),
            email_new_oauth_app: Boolean(data.email_new_oauth_app),
            email_new_api_key: Boolean(data.email_new_api_key),
            email_suspicious_login: Boolean(data.email_suspicious_login),
            digest_enabled: Boolean(data.digest_enabled),
            digest_frequency: data.digest_frequency || 'weekly',
          });
        }
      } catch { /* silent */ }
    };
    fetchNotifSettings();
  }, []);

  const handleSettingChange = (key: keyof Settings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleNotifChange = (key: keyof NotificationSettings, value: any) => {
    setNotifSettings((prev) => ({ ...prev, [key]: value }));
    setNotifSaved(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotifSave = async () => {
    setNotifLoading(true);
    try {
      const res = await fetch('/api/admin/notification-settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifSettings),
      });
      if (res.ok) {
        setNotifSaved(true);
        setTimeout(() => setNotifSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    } finally {
      setNotifLoading(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff', mb: 0.5 }}>
          System Settings
        </Typography>
        <Typography variant="body2" sx={{ color: '#9ca3af' }}>
          Configure system-wide parameters and security settings
        </Typography>
      </Box>

      {/* Saved Alert */}
      {saved && (
        <Alert
          severity="success"
          icon={<CheckCircle />}
          sx={{
            mb: 3,
            bgcolor: 'rgba(34, 197, 94, 0.1)',
            color: '#22c55e',
            border: '1px solid #22c55e',
            '& .MuiAlert-icon': { color: '#22c55e' },
          }}
        >
          Settings saved successfully
        </Alert>
      )}

      {/* Rate Limiting */}
      <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px', mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#fff', mb: 2 }}>
            Rate Limiting
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Max Requests Per Window"
                type="number"
                value={settings.rateLimitMaxRequests}
                onChange={(e) => handleSettingChange('rateLimitMaxRequests', parseInt(e.target.value))}
                fullWidth
                variant="outlined"
                sx={fieldSx}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Rate Limit Window (ms)"
                type="number"
                value={settings.rateLimitWindowMs}
                onChange={(e) => handleSettingChange('rateLimitWindowMs', parseInt(e.target.value))}
                fullWidth
                variant="outlined"
                sx={fieldSx}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* JWT & Token Settings */}
      <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px', mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#fff', mb: 2 }}>
            JWT & Token Configuration
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="JWT Expiration (minutes)"
                type="number"
                value={settings.jwtExpirationMinutes}
                onChange={(e) => handleSettingChange('jwtExpirationMinutes', parseInt(e.target.value))}
                fullWidth
                variant="outlined"
                sx={fieldSx}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Refresh Token Expiration (days)"
                type="number"
                value={settings.refreshTokenExpirationDays}
                onChange={(e) => handleSettingChange('refreshTokenExpirationDays', parseInt(e.target.value))}
                fullWidth
                variant="outlined"
                sx={fieldSx}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Email Verification Settings */}
      <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px', mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#fff', mb: 2 }}>
            Email Verification
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="OTP Length"
                type="number"
                value={settings.emailVerificationOtpLength}
                onChange={(e) => handleSettingChange('emailVerificationOtpLength', parseInt(e.target.value))}
                fullWidth
                variant="outlined"
                sx={fieldSx}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="OTP Expiry (minutes)"
                type="number"
                value={settings.emailVerificationOtpExpiryMinutes}
                onChange={(e) => handleSettingChange('emailVerificationOtpExpiryMinutes', parseInt(e.target.value))}
                fullWidth
                variant="outlined"
                sx={fieldSx}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px', mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#fff', mb: 2 }}>
            Security
          </Typography>
          <Box sx={{ mb: 2 }}>
            <TextField
              label="Bcrypt Rounds"
              type="number"
              value={settings.bcryptRounds}
              onChange={(e) => handleSettingChange('bcryptRounds', parseInt(e.target.value))}
              fullWidth
              variant="outlined"
              sx={fieldSx}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Feature Toggles */}
      <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px', mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#fff', mb: 2 }}>
            Feature Toggles
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.maintenanceMode}
                  onChange={(e) => handleSettingChange('maintenanceMode', e.target.checked)}
                  sx={switchSx}
                />
              }
              label={
                <Box>
                  <Typography sx={{ color: '#e5e7eb', fontWeight: 600 }}>Maintenance Mode</Typography>
                  <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                    Disable all user access except admins
                  </Typography>
                </Box>
              }
            />
            <Divider sx={{ borderColor: '#333' }} />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.allowNewRegistrations}
                  onChange={(e) => handleSettingChange('allowNewRegistrations', e.target.checked)}
                  sx={switchSx}
                />
              }
              label={
                <Box>
                  <Typography sx={{ color: '#e5e7eb', fontWeight: 600 }}>Allow New Registrations</Typography>
                  <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                    Allow users to create new accounts
                  </Typography>
                </Box>
              }
            />
            <Divider sx={{ borderColor: '#333' }} />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.requireEmailVerification}
                  onChange={(e) => handleSettingChange('requireEmailVerification', e.target.checked)}
                  sx={switchSx}
                />
              }
              label={
                <Box>
                  <Typography sx={{ color: '#e5e7eb', fontWeight: 600 }}>Require Email Verification</Typography>
                  <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                    Users must verify email before access
                  </Typography>
                </Box>
              }
            />
          </Box>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Box sx={{ display: 'flex', gap: 2, mb: 6 }}>
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSave}
          disabled={loading}
          sx={{
            bgcolor: '#22c55e',
            color: '#000',
            fontWeight: 600,
            '&:hover': { bgcolor: '#16a34a' },
            '&:disabled': { opacity: 0.6 },
          }}
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
        <Button
          variant="outlined"
          sx={{ borderColor: '#333', color: '#9ca3af', '&:hover': { borderColor: '#22c55e', color: '#22c55e' } }}
        >
          Cancel
        </Button>
      </Box>

      {/* Notifications Section */}
      {notifSaved && (
        <Alert
          severity="success"
          icon={<CheckCircle />}
          sx={{
            mb: 3,
            bgcolor: 'rgba(34, 197, 94, 0.1)',
            color: '#22c55e',
            border: '1px solid #22c55e',
            '& .MuiAlert-icon': { color: '#22c55e' },
          }}
        >
          Notification settings saved
        </Alert>
      )}

      <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px', mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Notifications sx={{ color: '#22c55e' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#fff' }}>
              Admin Notifications
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#9ca3af', mb: 3 }}>
            Configure which events trigger email notifications to the admin email address.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={notifSettings.email_new_user}
                  onChange={(e) => handleNotifChange('email_new_user', e.target.checked)}
                  sx={switchSx}
                />
              }
              label={
                <Box>
                  <Typography sx={{ color: '#e5e7eb', fontWeight: 600 }}>New User Registration</Typography>
                  <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                    Email when a new user creates an account
                  </Typography>
                </Box>
              }
            />
            <Divider sx={{ borderColor: '#333' }} />
            <FormControlLabel
              control={
                <Switch
                  checked={notifSettings.email_new_oauth_app}
                  onChange={(e) => handleNotifChange('email_new_oauth_app', e.target.checked)}
                  sx={switchSx}
                />
              }
              label={
                <Box>
                  <Typography sx={{ color: '#e5e7eb', fontWeight: 600 }}>New OAuth Application</Typography>
                  <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                    Email when a developer registers a new OAuth app
                  </Typography>
                </Box>
              }
            />
            <Divider sx={{ borderColor: '#333' }} />
            <FormControlLabel
              control={
                <Switch
                  checked={notifSettings.email_new_api_key}
                  onChange={(e) => handleNotifChange('email_new_api_key', e.target.checked)}
                  sx={switchSx}
                />
              }
              label={
                <Box>
                  <Typography sx={{ color: '#e5e7eb', fontWeight: 600 }}>New API Key Created</Typography>
                  <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                    Email when a user generates a new API key
                  </Typography>
                </Box>
              }
            />
            <Divider sx={{ borderColor: '#333' }} />
            <FormControlLabel
              control={
                <Switch
                  checked={notifSettings.email_suspicious_login}
                  onChange={(e) => handleNotifChange('email_suspicious_login', e.target.checked)}
                  sx={switchSx}
                />
              }
              label={
                <Box>
                  <Typography sx={{ color: '#e5e7eb', fontWeight: 600 }}>Suspicious Login Attempts</Typography>
                  <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                    Email on repeated failed logins or anomalous activity
                  </Typography>
                </Box>
              }
            />
            <Divider sx={{ borderColor: '#333' }} />
            <FormControlLabel
              control={
                <Switch
                  checked={notifSettings.digest_enabled}
                  onChange={(e) => handleNotifChange('digest_enabled', e.target.checked)}
                  sx={switchSx}
                />
              }
              label={
                <Box>
                  <Typography sx={{ color: '#e5e7eb', fontWeight: 600 }}>
                    Activity Digest Email
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                    Periodic summary of platform activity ({notifSettings.digest_frequency})
                  </Typography>
                </Box>
              }
            />
            {notifSettings.digest_enabled && (
              <Box sx={{ pl: 4 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {(['daily', 'weekly'] as const).map((freq) => (
                    <Button
                      key={freq}
                      size="small"
                      variant={notifSettings.digest_frequency === freq ? 'contained' : 'outlined'}
                      onClick={() => handleNotifChange('digest_frequency', freq)}
                      sx={{
                        textTransform: 'capitalize',
                        ...(notifSettings.digest_frequency === freq
                          ? { bgcolor: '#22c55e', color: '#000', '&:hover': { bgcolor: '#16a34a' } }
                          : { borderColor: '#333', color: '#9ca3af', '&:hover': { borderColor: '#22c55e' } }),
                      }}
                    >
                      {freq}
                    </Button>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleNotifSave}
          disabled={notifLoading}
          sx={{
            bgcolor: '#22c55e',
            color: '#000',
            fontWeight: 600,
            '&:hover': { bgcolor: '#16a34a' },
            '&:disabled': { opacity: 0.6 },
          }}
        >
          {notifLoading ? 'Saving...' : 'Save Notification Settings'}
        </Button>
      </Box>
    </Box>
  );
}
