import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Alert } from '@mui/material';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { sendQuery, getSession } from '../api/client';
import type { Message } from '../types';

interface ChatViewProps {
  onSessionUpdate: () => void;
}

export function ChatView({ onSessionUpdate }: ChatViewProps) {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId ?? null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load existing session if navigating to one
  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
      setCurrentSessionId(sessionId);
    } else {
      setMessages([]);
      setCurrentSessionId(null);
    }
  }, [sessionId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSession = async (id: string) => {
    try {
      const data = await getSession(id);
      if (data) {
        setMessages(data.history);
      } else {
        setError('Session not found');
        navigate('/');
      }
    } catch (err) {
      console.error('Failed to load session:', err);
      setError('Failed to load conversation');
    }
  };

  const handleSend = async (content: string) => {
    setError(null);
    setLoading(true);

    // Optimistically add user message
    const userMessage: Message = {
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await sendQuery(content, currentSessionId ?? undefined);

      // If this is a new session, update the URL
      if (!currentSessionId) {
        setCurrentSessionId(response.sessionId);
        navigate(`/chat/${response.sessionId}`, { replace: true });
      }

      // Add assistant message
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.answer,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Notify sidebar to refresh
      onSessionUpdate();
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message. Please try again.');
      // Remove optimistic message on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'background.default',
      }}
    >
      {/* Messages area */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {messages.length === 0 && !loading ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
            }}
          >
            <Typography variant="h5" gutterBottom>
              Macular Society Assistant
            </Typography>
            <Typography variant="body2">
              Ask questions about macular disease, treatments, and support services.
            </Typography>
          </Box>
        ) : (
          <>
            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </Box>

      {/* Error alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mx: 2 }}>
          {error}
        </Alert>
      )}

      {/* Input area */}
      <ChatInput onSend={handleSend} loading={loading} />
    </Box>
  );
}
