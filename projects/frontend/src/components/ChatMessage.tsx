import { Box, Paper, Typography } from '@mui/material';
import { SmartToy, Person } from '@mui/icons-material';
import type { Message } from '../types';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

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
      </Box>
    </Box>
  );
}
