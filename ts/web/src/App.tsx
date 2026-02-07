import { useState, useCallback } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { SessionSidebar } from './components/SessionSidebar';
import { ChatView } from './components/ChatView';

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
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleNewSession = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleSessionUpdate = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <SessionSidebar
          onNewSession={handleNewSession}
          refreshTrigger={refreshTrigger}
        />
        <Routes>
          <Route path="/" element={<ChatView onSessionUpdate={handleSessionUpdate} />} />
          <Route
            path="/chat/:sessionId"
            element={<ChatView onSessionUpdate={handleSessionUpdate} />}
          />
        </Routes>
      </Box>
    </ThemeProvider>
  );
}
