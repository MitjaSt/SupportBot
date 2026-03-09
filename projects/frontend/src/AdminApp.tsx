import { AuthProvider } from 'react-oidc-context';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { QueryProvider } from './providers/QueryProvider';
import { RequireAuth } from './components/RequireAuth';
import { OidcCallback } from './components/OidcCallback';
import { AdminShell } from './components/AdminShell';
import { AnalyticsDashboard } from './pages/AnalyticsDashboard';
import { KnowledgeBaseExplorer } from './pages/KnowledgeBaseExplorer';
import { ChunkInspector } from './pages/ChunkInspector';
import { SystemPromptPage } from './pages/SystemPromptPage';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#7b1fa2' },
    background: { default: '#fafafa' },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

const oidcConfig = {
  authority: import.meta.env.VITE_ZITADEL_ISSUER as string,
  client_id: import.meta.env.VITE_ZITADEL_CLIENT_ID as string,
  redirect_uri: import.meta.env.VITE_ZITADEL_REDIRECT_URI as string,
  post_logout_redirect_uri: import.meta.env.VITE_ZITADEL_POST_LOGOUT_URI as string,
  scope: 'openid profile email',
  // Navigation after login is handled by OidcCallback using useNavigate,
  // keeping React Router's internal history in sync.
};

export function AdminApp() {
  return (
    <AuthProvider {...oidcConfig}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <QueryProvider>
          <BrowserRouter>
            <Routes>
              {/* Public — handles the Zitadel redirect; navigates to / via React Router
                  once the token exchange completes. */}
              <Route path="/callback" element={<OidcCallback />} />
              {/* All admin routes are protected — RequireAuth redirects to Zitadel if not authenticated.
                  AdminShell provides the persistent left nav and logout. */}
              <Route element={<RequireAuth />}>
                <Route element={<AdminShell />}>
                  <Route path="/" element={<Navigate to="/analytics" replace />} />
                  <Route path="/analytics" element={<AnalyticsDashboard />} />
                  <Route path="/knowledge-base" element={<KnowledgeBaseExplorer />} />
                  <Route path="/system-prompt" element={<SystemPromptPage />} />
                  <Route path="/chunk-inspector" element={<ChunkInspector />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </QueryProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
