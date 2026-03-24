import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Delete, KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import { apiFetch, deleteAdminSession, listAdminSessions } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import type { SessionListItem, SessionWithHistory } from '../types';

// ── Transcript sub-component ──────────────────────────────────────────────────

function ConversationTranscript({ sessionId, token }: { sessionId: string; token: string }) {
  const { data, isLoading, isError } = useQuery<SessionWithHistory | null>({
    queryKey: ['admin-conversation', sessionId],
    queryFn: async () => {
      const response = await apiFetch(`/api/chat/sessions/${sessionId}`, {}, undefined, token);
      if (!response.ok) throw new Error(`Failed to load transcript: ${response.statusText}`);
      return response.json();
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={24} aria-label="Loading transcript" />
      </Box>
    );
  }

  if (isError || !data) {
    return <Alert severity="error">Could not load transcript.</Alert>;
  }

  return (
    <Box aria-live="polite" sx={{ px: 2, py: 1 }}>
      {data.history.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No messages in this session.
        </Typography>
      ) : (
        data.history.map((msg) => (
          <Box key={msg.id} sx={{ mb: 1.5 }}>
            <Typography
              variant="caption"
              fontWeight={600}
              color={msg.role === 'user' ? 'primary.main' : 'text.secondary'}
            >
              {msg.role === 'user' ? 'User' : 'Assistant'}
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {msg.content}
            </Typography>
          </Box>
        ))
      )}
    </Box>
  );
}

// ── Row component ─────────────────────────────────────────────────────────────

function ConversationRow({ row, token }: { row: SessionListItem; token: string }) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const queryClient = useQueryClient();

  const { mutate: doDelete, isPending: isDeleting } = useMutation({
    mutationFn: () => deleteAdminSession(row.sessionId, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-conversations'] });
      queryClient.removeQueries({ queryKey: ['admin-conversation', row.sessionId] });
    },
  });

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <>
      <TableRow hover>
        <TableCell sx={{ width: 40, pr: 0 }}>
          <IconButton
            size="small"
            aria-label={open ? 'Collapse transcript' : 'Expand transcript'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
          {row.sessionId.slice(0, 8)}…
        </TableCell>
        <TableCell sx={{ maxWidth: 320 }}>
          <Typography variant="body2" noWrap title={row.firstMessage ?? ''}>
            {row.firstMessage ?? '—'}
          </Typography>
        </TableCell>
        <TableCell align="right">{row.messageCount}</TableCell>
        <TableCell>
          {row.collectionState === 'complete' ? (
            <Chip
              label="Contact collected"
              size="small"
              color="success"
              aria-label="Contact data collected for this session"
            />
          ) : row.collectionState && row.collectionState !== 'idle' ? (
            <Chip label={row.collectionState} size="small" variant="outlined" />
          ) : null}
        </TableCell>
        <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
          {formatDate(row.createdAt)}
        </TableCell>
        <TableCell sx={{ width: 48, pl: 0 }}>
          <Tooltip title="Delete conversation">
            <IconButton
              size="small"
              aria-label="Delete conversation"
              onClick={() => setConfirmOpen(true)}
              disabled={isDeleting}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Delete conversation?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete the conversation and all its messages. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button
            color="error"
            onClick={() => { setConfirmOpen(false); doDelete(); }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Contact details + transcript */}
      <TableRow>
        <TableCell colSpan={7} sx={{ py: 0, border: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
              {row.collectionState === 'complete' && (
                <Box sx={{ px: 2, pt: 1.5, pb: 1, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {row.userName && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Name
                      </Typography>
                      <Typography variant="body2">{row.userName}</Typography>
                    </Box>
                  )}
                  {row.userPhone && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Phone
                      </Typography>
                      <Typography variant="body2">{row.userPhone}</Typography>
                    </Box>
                  )}
                  {row.preferredCallTime && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Preferred call time
                      </Typography>
                      <Typography variant="body2">{row.preferredCallTime}</Typography>
                    </Box>
                  )}
                  {row.callbackTopic && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Topic
                      </Typography>
                      <Typography variant="body2">{row.callbackTopic}</Typography>
                    </Box>
                  )}
                  <Divider sx={{ width: '100%' }} />
                </Box>
              )}
              <ConversationTranscript sessionId={row.sessionId} token={token} />
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const COLLECTION_STATES = [
  { value: '', label: 'All' },
  { value: 'idle', label: 'Idle' },
  { value: 'complete', label: 'Contact collected' },
];

const LIMITS = [50, 100, 200, 500];

export function ConversationsPage() {
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const [limit, setLimit] = useState(50);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  }, []);

  const { data, isLoading, isError } = useQuery<SessionListItem[]>({
    queryKey: ['admin-conversations', debouncedSearch, state, limit],
    queryFn: () => listAdminSessions({ search: debouncedSearch, state, limit }, token ?? ''),
    enabled: !!token,
    staleTime: 30_000,
  });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={600} gutterBottom>
        Conversations
      </Typography>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <TextField
          label="Search messages"
          size="small"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          sx={{ minWidth: 240 }}
          inputProps={{ 'aria-label': 'Search message content' }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="state-filter-label">Contact state</InputLabel>
          <Select
            labelId="state-filter-label"
            label="Contact state"
            value={state}
            onChange={(e) => setState(e.target.value)}
          >
            {COLLECTION_STATES.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel id="limit-label">Show</InputLabel>
          <Select
            labelId="limit-label"
            label="Show"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            {LIMITS.map((l) => (
              <MenuItem key={l} value={l}>
                {l}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Table */}
      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load conversations. Check your permissions or try again.
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Loading conversations" />
        </Box>
      ) : !data || data.length === 0 ? (
        <Paper variant="outlined" sx={{ py: 6, textAlign: 'center' }}>
          <Typography color="text.secondary">No conversations found.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" aria-label="Conversations table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 40 }} />
                <TableCell>Session ID</TableCell>
                <TableCell>First message</TableCell>
                <TableCell align="right">Messages</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Date</TableCell>
                <TableCell sx={{ width: 48 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row) => (
                <ConversationRow key={row.sessionId} row={row} token={token ?? ''} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
