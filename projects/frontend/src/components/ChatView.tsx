import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Alert } from '@mui/material';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { sendQueryStream, sendVoiceQuery, getSession, synthesizeSpeech } from '../api/client';
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
  const isStreamingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load existing session if navigating to one (but not during streaming)
  useEffect(() => {
    // Skip loading if we're currently streaming (prevents race condition)
    if (isStreamingRef.current) {
      return;
    }

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

  const playAudio = async (text: string) => {
    try {
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // Synthesize speech
      const audioBlob = await synthesizeSpeech(text);
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create and play audio element
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      await audio.play();
    } catch (err) {
      console.error('Failed to play audio:', err);
      // Don't show error to user - TTS is optional enhancement
    }
  };

  const handleSend = async (content: string) => {
    setError(null);
    setLoading(true);
    isStreamingRef.current = true;

    // Optimistically add user message
    const userMessage: Message = {
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      let fullContent = '';
      let newSessionId: string | null = null;
      let assistantMessageAdded = false;

      // Stream the response
      for await (const event of sendQueryStream(content, currentSessionId ?? undefined)) {
        if (event.type === 'error') {
          throw new Error(event.content || 'Stream error');
        }

        // Update sessionId if this is a new session
        if (event.sessionId && !currentSessionId && !newSessionId) {
          newSessionId = event.sessionId;
          setCurrentSessionId(newSessionId);
          navigate(`/chat/${newSessionId}`, { replace: true });
        }

        // Accumulate content chunks
        if (event.type === 'chunk' && event.content) {
          fullContent += event.content;

          // Add assistant message on first chunk
          if (!assistantMessageAdded) {
            const assistantMessage: Message = {
              role: 'assistant',
              content: fullContent,
              createdAt: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
            assistantMessageAdded = true;
          } else {
            // Update the last message (assistant's response) in real-time
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: fullContent,
              };
              return updated;
            });
          }
        }

        // Handle tool response (replaces streamed content)
        if (event.type === 'tool' && event.content) {
          fullContent = event.content;

          // Add or update assistant message with tool response
          if (!assistantMessageAdded) {
            const assistantMessage: Message = {
              role: 'assistant',
              content: fullContent,
              createdAt: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
            assistantMessageAdded = true;
          } else {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: fullContent,
              };
              return updated;
            });
          }
        }

        // Done streaming
        if (event.type === 'done') {
          // Notify sidebar to refresh
          onSessionUpdate();

          // Play audio response
          if (fullContent) {
            playAudio(fullContent);
          }
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message. Please try again.');
      // Remove optimistic user message (and assistant message if it was added)
      setMessages((prev) => {
        // If we added an assistant message, remove both user and assistant
        // Otherwise just remove the user message
        const messagesToRemove = prev[prev.length - 1]?.role === 'assistant' ? 2 : 1;
        return prev.slice(0, -messagesToRemove);
      });
    } finally {
      isStreamingRef.current = false;
      setLoading(false);
    }
  };

  const handleVoiceSend = async (audioBlob: Blob) => {
    setError(null);
    setLoading(true);

    try {
      // Send voice query
      const response = await sendVoiceQuery(audioBlob, currentSessionId ?? undefined);

      // If this is a new session, update the URL
      if (!currentSessionId) {
        setCurrentSessionId(response.sessionId);
        navigate(`/chat/${response.sessionId}`, { replace: true });
      }

      // Add user message (transcribed text)
      const userMessage: Message = {
        role: 'user',
        content: response.transcription?.text || '[Voice message]',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Add assistant message
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.answer,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Notify sidebar to refresh
      onSessionUpdate();

      // Play audio response
      playAudio(response.answer);
    } catch (err) {
      console.error('Failed to send voice message:', err);
      setError('Failed to process voice message. Please try again.');
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
      <ChatInput onSend={handleSend} onVoiceSend={handleVoiceSend} loading={loading} />
    </Box>
  );
}
