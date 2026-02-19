import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Paper,
  Chip,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import type { Source } from '../types';

interface QueryDebugDialogProps {
  open: boolean;
  onClose: () => void;
  chunks: Source[];
  fullPrompt: string;
  promptTokenCount?: number;
}

export function QueryDebugDialog({ open, onClose, chunks, fullPrompt, promptTokenCount }: QueryDebugDialogProps) {
  const [tab, setTab] = useState(0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        Sources & Prompt
        <IconButton size="small" onClick={onClose}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label={`Retrieved chunks (${chunks.length})`} />
        <Tab label="Full prompt" />
      </Tabs>

      <DialogContent sx={{ p: 0 }}>
        {tab === 0 && (
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {chunks.length === 0 ? (
              <Typography color="text.secondary" sx={{ p: 1 }}>No chunks retrieved.</Typography>
            ) : (
              chunks.map((chunk, i) => (
                <Paper key={chunk.id} variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Chip label={`#${i + 1}`} size="small" />
                    <Typography variant="caption" color="text.secondary" sx={{ flex: 1, fontFamily: 'monospace' }}>
                      {chunk.source}
                    </Typography>
                    <Chip
                      label={`score: ${chunk.score.toFixed(3)}`}
                      size="small"
                      color={chunk.score >= 0.7 ? 'success' : chunk.score >= 0.5 ? 'warning' : 'default'}
                    />
                  </Box>
                  <Divider sx={{ mb: 1 }} />
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {chunk.text}
                  </Typography>
                </Paper>
              ))
            )}
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ p: 2 }}>
            {promptTokenCount != null && (
              <Chip
                label={`${promptTokenCount.toLocaleString()} tokens`}
                size="small"
                sx={{ mb: 1.5 }}
              />
            )}
            {fullPrompt ? (
              <Box
                component="pre"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  bgcolor: 'grey.50',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 2,
                  m: 0,
                  maxHeight: 500,
                  overflow: 'auto',
                }}
              >
                {fullPrompt}
              </Box>
            ) : (
              <Typography color="text.secondary">No prompt data available.</Typography>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
