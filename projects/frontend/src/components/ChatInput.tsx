import { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { Box, TextField, IconButton, CircularProgress, Tooltip, Alert } from '@mui/material';
import { Send, Mic, Stop, VolumeUp, VolumeOff } from '@mui/icons-material';
import { keyframes } from '@mui/system';

const pulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(244, 67, 54, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(244, 67, 54, 0);
  }
`;

interface ChatInputProps {
  onSend: (message: string) => void;
  onVoiceSend?: (audioBlob: Blob) => void;
  disabled?: boolean;
  loading?: boolean;
  voiceEnabled?: boolean;
  onToggleVoice?: () => void;
  pendingValue?: string;
}

export function ChatInput({ onSend, onVoiceSend, disabled, loading, voiceEnabled, onToggleVoice, pendingValue }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Repopulate input when a send fails
  useEffect(() => {
    if (pendingValue) {
      setInput(pendingValue);
    }
  }, [pendingValue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

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

  const startRecording = async () => {
    if (!onVoiceSend) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        onVoiceSend(audioBlob);

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        audioChunksRef.current = [];
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      setMicError('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <>
      {/* Microphone error alert */}
      {micError && (
        <Alert severity="error" onClose={() => setMicError(null)} sx={{ mx: 2, mb: 1 }}>
          {micError}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 1, p: 2, borderTop: 1, borderColor: 'divider' }}>
      <TextField
        fullWidth
        multiline
        maxRows={4}
        placeholder={isRecording ? 'Recording...' : 'Ask about macular disease...'}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled || loading || isRecording}
        size="small"
        sx={{
          bgcolor: 'background.paper',
          ...(isRecording && {
            '& .MuiOutlinedInput-root': {
              borderColor: 'error.main',
              animation: `${pulse} 1.5s ease-in-out infinite`,
            },
          }),
        }}
      />

      {/* Voice recording button */}
      {onVoiceSend && (
        <Tooltip title={isRecording ? 'Stop recording' : 'Voice input'}>
          <IconButton
            color={isRecording ? 'error' : 'default'}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled || loading}
            sx={{ alignSelf: 'flex-end' }}
          >
            {isRecording ? <Stop /> : <Mic />}
          </IconButton>
        </Tooltip>
      )}

      {/* Voice response toggle */}
      {onToggleVoice && (
        <Tooltip title={voiceEnabled ? 'Voice responses ON' : 'Voice responses OFF'}>
          <IconButton
            color={voiceEnabled ? 'primary' : 'default'}
            onClick={onToggleVoice}
            disabled={disabled || loading}
            sx={{ alignSelf: 'flex-end' }}
          >
            {voiceEnabled ? <VolumeUp /> : <VolumeOff />}
          </IconButton>
        </Tooltip>
      )}

      {/* Send text button */}
      <IconButton
        color="primary"
        aria-label={loading ? 'Sending…' : 'Send message'}
        onClick={handleSend}
        disabled={!input.trim() || disabled || loading || isRecording}
        sx={{ alignSelf: 'flex-end' }}
      >
        {loading ? <CircularProgress size={24} aria-hidden="true" /> : <Send />}
      </IconButton>
    </Box>
    </>
  );
}
