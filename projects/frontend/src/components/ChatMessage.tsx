import { InfoOutlined, Person, SmartToy } from '@mui/icons-material';
import { Box, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';
import type { Message } from '../types';
import { QueryDebugDialog } from './QueryDebugDialog';

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
