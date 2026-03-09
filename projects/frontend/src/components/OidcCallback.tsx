import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * Rendered at /callback while react-oidc-context exchanges the ?code= for tokens.
 * Navigates to / via React Router once the exchange completes (success or error),
 * which lets React Router's internal history stay in sync with the URL.
 */
export function OidcCallback() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.isLoading) {
      navigate('/', { replace: true });
    }
  }, [auth.isLoading, navigate]);

  if (auth.error) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 2 }}>
        <Typography color="error" role="alert">Login failed: {auth.error.message}</Typography>
        <Typography
          component="button"
          onClick={() => navigate('/', { replace: true })}
          sx={{ cursor: 'pointer', color: 'primary.main', textDecoration: 'underline', background: 'none', border: 'none' }}
        >
          Try again
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 2 }}>
      <CircularProgress size={24} />
      <Typography aria-live="polite">Completing login...</Typography>
    </Box>
  );
}
