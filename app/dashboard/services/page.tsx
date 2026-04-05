'use client';

import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { useState, useEffect } from 'react';
import LinkOffIcon from '@mui/icons-material/LinkOff';

interface ConnectedService {
  client_id: string;
  name: string;
  description?: string;
  homepage_url?: string;
  logo_url?: string;
  first_authorized: string;
  last_authorized: string;
}

const ServicesPage = () => {
  const [services, setServices] = useState<ConnectedService[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/connected-services', { credentials: 'include' });
      if (res.ok) {
        const data: any = await res.json();
        setServices(data.services || []);
      }
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  };

  const revokeService = async (clientId: string) => {
    if (!confirm('Revoke access for this service? You will need to re-authorize it to use it again.')) return;
    setRevoking(clientId);
    try {
      const res = await fetch(`/api/auth/connected-services?client_id=${clientId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setServices((prev) => prev.filter((s) => s.client_id !== clientId));
      }
    } catch {
      // fail silently
    } finally {
      setRevoking(null);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#f5f5f4', mb: 1 }}>
          Connected Services
        </Typography>
        <Typography sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
          Applications you've signed in to using your Elixpo account.
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#a3e635' }} />
        </Box>
      ) : services.length === 0 ? (
        <Box
          sx={{
            py: 8,
            textAlign: 'center',
            borderRadius: '16px',
            bgcolor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '1rem', mb: 0.5 }}>
            No connected services yet
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem' }}>
            When you sign in to third-party apps using Elixpo, they'll appear here.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {services.map((svc) => (
            <Box
              key={svc.client_id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2.5,
                p: 2.5,
                borderRadius: '14px',
                bgcolor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                transition: 'border-color 0.2s',
                '&:hover': { borderColor: 'rgba(255,255,255,0.15)' },
              }}
            >
              {/* Favicon or fallback */}
              {svc.homepage_url ? (
                <Box
                  component="img"
                  src={`https://www.google.com/s2/favicons?domain=${new URL(svc.homepage_url).hostname}&sz=64`}
                  alt=""
                  sx={{
                    width: 40, height: 40, borderRadius: '10px', flexShrink: 0,
                    bgcolor: 'rgba(255,255,255,0.05)', p: 0.5,
                  }}
                  onError={(e: any) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <Box
                  sx={{
                    width: 40, height: 40, borderRadius: '10px', flexShrink: 0,
                    bgcolor: 'rgba(163,230,53,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#a3e635', fontSize: '1.1rem', fontWeight: 700,
                  }}
                >
                  {svc.name.charAt(0).toUpperCase()}
                </Box>
              )}

              {/* Info */}
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ color: '#f5f5f4', fontWeight: 600, fontSize: '1rem' }}>
                    {svc.name}
                  </Typography>
                  {svc.homepage_url && (
                    <Typography
                      component="a"
                      href={svc.homepage_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem',
                        textDecoration: 'none', fontFamily: 'monospace',
                        '&:hover': { color: '#a3e635' },
                      }}
                    >
                      {new URL(svc.homepage_url).hostname}
                    </Typography>
                  )}
                </Box>
                {svc.description && (
                  <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', mt: 0.25 }}>
                    {svc.description}
                  </Typography>
                )}
                <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem', mt: 0.5 }}>
                  First authorized {new Date(svc.first_authorized).toLocaleDateString()} · Last used {new Date(svc.last_authorized).toLocaleDateString()}
                </Typography>
              </Box>

              {/* Revoke */}
              <Button
                size="small"
                startIcon={<LinkOffIcon />}
                onClick={() => revokeService(svc.client_id)}
                disabled={revoking === svc.client_id}
                sx={{
                  color: 'rgba(255,255,255,0.4)',
                  textTransform: 'none',
                  fontSize: '0.85rem',
                  flexShrink: 0,
                  borderRadius: '8px',
                  px: 2,
                  '&:hover': { color: '#ef4444', bgcolor: 'rgba(239,68,68,0.08)' },
                }}
              >
                {revoking === svc.client_id ? 'Revoking...' : 'Revoke'}
              </Button>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default ServicesPage;
