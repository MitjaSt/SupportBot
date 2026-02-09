import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  IconButton,
  Typography,
  Divider,
  Button,
  Tooltip,
} from '@mui/material';
import {
  PushPin,
  PushPinOutlined,
  Add,
  Chat,
  Delete,
} from '@mui/icons-material';
import { listSessions, deleteSession } from '../api/client';
import { usePinnedSessions } from '../hooks/usePinnedSessions';
import type { Session } from '../types';

interface SessionSidebarProps {
  onNewSession: () => void;
  refreshTrigger?: number;
}

export function SessionSidebar({ onNewSession, refreshTrigger }: SessionSidebarProps) {
  const [sessions, setSessions] = useState<(Session & { messageCount: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const { togglePin, isPinned } = usePinnedSessions();
  const navigate = useNavigate();
  const { sessionId: currentSessionId } = useParams();

  useEffect(() => {
    loadSessions();
  }, [refreshTrigger]);

  const loadSessions = async () => {
    try {
      const data = await listSessions();
      setSessions(data);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this conversation?')) {
      try {
        await deleteSession(sessionId);
        setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
        if (currentSessionId === sessionId) {
          navigate('/');
        }
      } catch (err) {
        console.error('Failed to delete session:', err);
      }
    }
  };

  // Sort: pinned first, then by updatedAt
  const sortedSessions = [...sessions].sort((a, b) => {
    const aPinned = isPinned(a.sessionId);
    const bPinned = isPinned(b.sessionId);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return bTime - aTime;
  });

  const formatDate = (dateStr: string | Date | undefined) => {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Unknown';

    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <Box
      sx={{
        width: 280,
        height: '100%',
        borderRight: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'grey.50',
      }}
    >
      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<Add />}
          onClick={onNewSession}
        >
          New Chat
        </Button>
      </Box>

      <Divider />

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ px: 2, py: 1, fontWeight: 500 }}
      >
        Conversations
      </Typography>

      <List sx={{ flex: 1, overflow: 'auto', py: 0 }}>
        {loading ? (
          <ListItem>
            <ListItemText secondary="Loading..." />
          </ListItem>
        ) : sortedSessions.length === 0 ? (
          <ListItem>
            <ListItemText secondary="No conversations yet" />
          </ListItem>
        ) : (
          sortedSessions.map((session) => (
            <ListItem
              key={session.sessionId}
              disablePadding
              secondaryAction={
                <Box sx={{ display: 'flex' }}>
                  <Tooltip title={isPinned(session.sessionId) ? 'Unpin' : 'Pin'}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePin(session.sessionId);
                      }}
                    >
                      {isPinned(session.sessionId) ? (
                        <PushPin fontSize="small" color="primary" />
                      ) : (
                        <PushPinOutlined fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={(e) => handleDelete(session.sessionId, e)}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            >
              <ListItemButton
                selected={currentSessionId === session.sessionId}
                onClick={() => navigate(`/chat/${session.sessionId}`)}
                sx={{ pr: 10 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Chat fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={`${session.messageCount} messages`}
                  secondary={formatDate(session.updatedAt)}
                  primaryTypographyProps={{
                    noWrap: true,
                    variant: 'body2',
                  }}
                  secondaryTypographyProps={{
                    noWrap: true,
                    variant: 'caption',
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))
        )}
      </List>
    </Box>
  );
}
