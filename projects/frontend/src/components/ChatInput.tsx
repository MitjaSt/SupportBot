import { useState, KeyboardEvent } from 'react';
import { Box, TextField, IconButton, CircularProgress } from '@mui/material';
import { Send } from '@mui/icons-material';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

export function ChatInput({ onSend, disabled, loading }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    const trimmed = input.trim();
    if (trimmed && !disabled && !loading) {
      onSend(trimmed);
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 1, p: 2, borderTop: 1, borderColor: 'divider' }}>
      <TextField
        fullWidth
        multiline
        maxRows={4}
        placeholder="Ask about macular disease..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled || loading}
        size="small"
        sx={{ bgcolor: 'background.paper' }}
      />
      <IconButton
        color="primary"
        onClick={handleSend}
        disabled={!input.trim() || disabled || loading}
        sx={{ alignSelf: 'flex-end' }}
      >
        {loading ? <CircularProgress size={24} /> : <Send />}
      </IconButton>
    </Box>
  );
}
