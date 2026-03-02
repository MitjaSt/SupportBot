import {
  Add,
  BarChart,
  Chat,
  Delete,
  ManageSearch,
  PushPin,
  PushPinOutlined,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate, useLocation, matchPath } from 'react-router-dom';
import { useSessions, useDeleteSession } from '../hooks/useSessions';
import { usePinnedSessions } from '../hooks/usePinnedSessions';

interface SessionSidebarProps {
  onNewSession: () => void;
}

export function SessionSidebar({ onNewSession }: SessionSidebarProps) {
  // useSessions() manages all loading, caching, and background refetching.
  // Any call to invalidateQueries({ queryKey: sessionsQueryKey() }) elsewhere
  // in the app (e.g. after a chat stream completes) will trigger this to refetch.
  const { data: sessions = [], isPending } = useSessions();

  // useDeleteSession() returns a mutation object. Calling mutate(sessionId)
  // fires the DELETE request, then the onSuccess handler in the hook
  // invalidates the sessions list and evicts the deleted session from cache.
  const { mutate: deleteSession } = useDeleteSession();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const { togglePin, isPinned } = usePinnedSessions();
  const navigate = useNavigate();
  const location = useLocation();

  const match = matchPath('/chat/:sessionId', location.pathname);
  const currentSessionId = match?.params.sessionId;

  const handleDeleteClick = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessionToDelete(sessionId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!sessionToDelete) return;

    deleteSession(sessionToDelete, {
      onSuccess: () => {
        if (currentSessionId === sessionToDelete) {
          navigate('/');
        }
      },
    });

    setDeleteDialogOpen(false);
    setSessionToDelete(null);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setSessionToDelete(null);
  };

  // Sort: pinned first, then by updatedAt descending
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
        {isPending ? (
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
                      onClick={(e) => handleDeleteClick(session.sessionId, e)}
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
                sx={{
                  pr: 10,
                  bgcolor: currentSessionId === session.sessionId ? 'primary.main' : 'transparent',
                  color: currentSessionId === session.sessionId ? 'primary.contrastText' : 'inherit',
                  '&:hover': {
                    bgcolor: currentSessionId === session.sessionId ? 'primary.dark' : 'action.hover',
                  },
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                  },
                }}
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

      <Divider />
      <List sx={{ py: 0.5 }}>
        {[
          { label: 'Retrieval Analytics', path: '/admin/analytics', icon: <BarChart fontSize="small" /> },
          { label: 'Knowledge Base', path: '/admin/knowledge-base', icon: <ManageSearch fontSize="small" /> },
        ].map(({ label, path, icon }) => (
          <ListItem key={path} disablePadding>
            <ListItemButton
              selected={location.pathname === path}
              onClick={() => navigate(path)}
              sx={{
                '&.Mui-selected': {
                  bgcolor: 'secondary.main',
                  color: 'secondary.contrastText',
                  '& .MuiListItemIcon-root': { color: 'secondary.contrastText' },
                  '&:hover': { bgcolor: 'secondary.dark' },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>{icon}</ListItemIcon>
              <ListItemText primary={label} primaryTypographyProps={{ variant: 'body2' }} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">Delete Conversation</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete this conversation? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
