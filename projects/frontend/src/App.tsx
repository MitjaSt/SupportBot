import { useCallback } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { SessionSidebar } from './components/SessionSidebar';
import { ChatView } from './components/ChatView';
import { AnalyticsDashboard } from './pages/AnalyticsDashboard';
import { KnowledgeBaseExplorer } from './pages/KnowledgeBaseExplorer';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#7b1fa2',
    },
    background: {
      default: '#fafafa',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

export function App() {
  const navigate = useNavigate();

  const handleNewSession = useCallback(() => {
    navigate('/');
  }, [navigate]);

  // No refreshTrigger or onSessionUpdate needed.
  // ChatView calls queryClient.invalidateQueries() after a stream completes,
  // which automatically triggers useSessions() in SessionSidebar to refetch.
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <SessionSidebar onNewSession={handleNewSession} />
        <Routes>
          <Route path="/" element={<ChatView />} />
          <Route path="/chat/:sessionId" element={<ChatView />} />
          <Route path="/admin/analytics" element={<AnalyticsDashboard />} />
          <Route path="/admin/knowledge-base" element={<KnowledgeBaseExplorer />} />
        </Routes>
      </Box>
    </ThemeProvider>
  );
}
