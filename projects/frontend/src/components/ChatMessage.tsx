import { ExpandMore, InfoOutlined, Person, SmartToy } from '@mui/icons-material';
import { Accordion, AccordionDetails, AccordionSummary, Box, Chip, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';
import type { Message } from '../types';
import { QueryDebugDialog } from './QueryDebugDialog';

function sourceLabel(source: string): string {
  try {
    const url = new URL(source);
    const parts = url.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] ?? url.hostname;
  } catch {
    return source.split('/').pop() ?? source;
  }
}

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [debugOpen, setDebugOpen] = useState(false);
  const hasDebugData = !isUser && (message.chunks?.length || message.fullPrompt);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: isUser ? 'row-reverse' : 'row',
          alignItems: 'flex-start',
          maxWidth: '80%',
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: isUser ? 'primary.main' : 'secondary.main',
            color: 'white',
            mx: 1,
            flexShrink: 0,
          }}
        >
          {isUser ? <Person fontSize="small" /> : <SmartToy fontSize="small" />}
        </Box>
        <Box>
          <Paper
            elevation={1}
            sx={{
              p: 2,
              bgcolor: isUser ? 'primary.light' : 'grey.100',
              borderRadius: 2,
            }}
          >
            <Typography
              variant="body1"
              sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            >
              {message.content}
            </Typography>
            {message.createdAt && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 0.5 }}
              >
                {new Date(message.createdAt).toLocaleTimeString()}
              </Typography>
            )}
          </Paper>

          {message.chunks && message.chunks.length > 0 && (
            <Accordion disableGutters elevation={0} sx={{ mt: 0.5, bgcolor: 'transparent', '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMore fontSize="small" />} sx={{ px: 0, minHeight: 0, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
                <Typography variant="caption" color="text.secondary">
                  Sources ({message.chunks.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 0, pt: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {message.chunks.map((chunk, i) => (
                  <Accordion key={chunk.id} disableGutters elevation={0} variant="outlined" sx={{ borderRadius: '6px !important', '&:before': { display: 'none' } }}>
                    <AccordionSummary expandIcon={<ExpandMore fontSize="small" />} sx={{ px: 1.5, minHeight: 0, '& .MuiAccordionSummary-content': { my: 0.75, alignItems: 'center', gap: 1 } }}>
                      <Typography variant="caption" sx={{ fontWeight: 500, flex: 1 }}>
                        {i + 1}. {sourceLabel(chunk.source)}
                      </Typography>
                      <Chip
                        label={chunk.score >= 0.7 ? 'High' : chunk.score >= 0.5 ? 'Medium' : 'Low'}
                        size="small"
                        color={chunk.score >= 0.7 ? 'success' : chunk.score >= 0.5 ? 'warning' : 'default'}
                        sx={{ fontSize: '0.65rem', height: 18 }}
                      />
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: 1.5, pt: 0, pb: 1.5 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.78rem' }}>
                        {chunk.text}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </AccordionDetails>
            </Accordion>
          )}

          {hasDebugData && (
            <Box sx={{ mt: 0.5 }}>
              <Tooltip title="View sources & prompt">
                <IconButton size="small" onClick={() => setDebugOpen(true)} sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}>
                  <InfoOutlined
                    fontSize="small"
                    sx={{
                      color: (message.promptTokenCount ?? 0) > 2500
                        ? 'error.main'
                        : (message.promptTokenCount ?? 0) > 1500
                          ? 'warning.main'
                          : 'inherit',
                    }}
                  />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
      </Box>

      {hasDebugData && (
        <QueryDebugDialog
          open={debugOpen}
          onClose={() => setDebugOpen(false)}
          chunks={message.chunks ?? []}
          fullPrompt={message.fullPrompt ?? ''}
          promptTokenCount={message.promptTokenCount}
        />
      )}
    </Box>
  );
}
