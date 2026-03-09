import { useAuth } from 'react-oidc-context';
import { Outlet } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * Route guard for admin-only routes.
 * Redirects to Zitadel login when the user is not authenticated.
 * Wrap admin routes with this component as a layout route in the router.
 */
export function RequireAuth() {
  const auth = useAuth();

  if (auth.isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 2 }}>
        <CircularProgress size={24} />
        <Typography aria-live="polite">Loading...</Typography>
      </Box>
    );
  }

  if (auth.error) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 2 }}>
        <Typography color="error" role="alert">
          Authentication error: {auth.error.message}
        </Typography>
        <Typography
          component="button"
          onClick={() => void auth.signinRedirect()}
          sx={{ cursor: 'pointer', color: 'primary.main', textDecoration: 'underline', background: 'none', border: 'none' }}
        >
          Try again
        </Typography>
      </Box>
    );
  }

  if (!auth.isAuthenticated) {
    void auth.signinRedirect();
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 2 }}>
        <CircularProgress size={24} />
        <Typography aria-live="polite">Redirecting to login...</Typography>
      </Box>
    );
  }

  return <Outlet />;
}
