import { Alert, Box, Chip, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { sendQueryStream, sendVoiceQuery, synthesizeSpeech } from '../api/client';
import { useSession } from '../hooks/useSession';
import { sessionsQueryKey } from '../hooks/useSessions';
import type { Message } from '../types';
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';

export function ChatView() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  // useQueryClient() gives access to the shared QueryClient instance.
  // We use it after a stream completes to invalidate the sessions list —
  // this triggers SessionSidebar's useSessions() to refetch automatically,
  // with no prop drilling or callback required.
  const queryClient = useQueryClient();

  // useSession loads the message history for an existing session.
  // When sessionId is undefined (new chat route "/"), enabled:false means
  // the query stays idle and no network request is made.
  const { data: sessionData, isError: sessionLoadError } = useSession(sessionId);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedInput, setFailedInput] = useState<string | undefined>(undefined);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId ?? null);
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    const saved = localStorage.getItem('voiceEnabled');
    return saved === 'true';
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isStreamingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // When sessionData arrives from the cache or network, populate messages.
  // The isStreamingRef guard prevents overwriting live streaming state
  // if the query somehow refetches during an active stream.
  useEffect(() => {
    if (isStreamingRef.current) return;

    if (sessionData) {
      setMessages(sessionData.history);
    }
  }, [sessionData]);

  // When sessionLoadError is true (e.g. 404), redirect to the root.
  // This replaces the manual try/catch + navigate() in the old loadSession callback.
  useEffect(() => {
    if (sessionLoadError) {
      navigate('/');
    }
  }, [sessionLoadError, navigate]);

  // Reset to a blank chat when navigating to "/" (no sessionId)
  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      setCurrentSessionId(null);
    } else {
      setCurrentSessionId(sessionId);
    }
  }, [sessionId]);

  // Scroll to bottom whenever the message list changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleVoice = () => {
    setVoiceEnabled((prev) => {
      const newValue = !prev;
      localStorage.setItem('voiceEnabled', String(newValue));
      return newValue;
    });
  };

  const playAudio = async (text: string) => {
    if (!voiceEnabled) return;

    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audioBlob = await synthesizeSpeech(text);
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      await audio.play();
    } catch {
      // TTS is optional — don't surface errors to the user
    }
  };

  const handleSend = async (content: string) => {
    setError(null);
    setFailedInput(undefined);
    setLoading(true);
    isStreamingRef.current = true;

    const sessionId = currentSessionId ?? crypto.randomUUID();
    if (!currentSessionId) {
      setCurrentSessionId(sessionId);
      navigate(`/chat/${sessionId}`, { replace: true });
    }

    // Optimistically add the user message before the request fires.
    // Using crypto.randomUUID() for the key ensures React can correctly
    // reconcile the list even when items are added or removed mid-stream.
    const userMessage: Message = {
      id: crypto.randomUUID() as unknown as number,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      let fullContent = '';
      let assistantMessageId: string | null = null;

      for await (const event of sendQueryStream(content, sessionId)) {
        if (event.type === 'error') {
          throw new Error(event.content || 'Stream error');
        }

        if (event.type === 'chunk' && event.content) {
          fullContent += event.content;

          if (!assistantMessageId) {
            // First chunk — add the assistant message with a stable id
            assistantMessageId = crypto.randomUUID();
            const assistantMessage: Message = {
              id: assistantMessageId as unknown as number,
              role: 'assistant',
              content: fullContent,
              createdAt: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
          } else {
            // Subsequent chunks — update the last message content in place
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

        if (event.type === 'tool' && event.content) {
          fullContent = event.content;

          if (!assistantMessageId) {
            assistantMessageId = crypto.randomUUID();
            const assistantMessage: Message = {
              id: assistantMessageId as unknown as number,
              role: 'assistant',
              content: fullContent,
              createdAt: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
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

        if (event.type === 'done') {
          // Attach RAG metadata to the completed assistant message
          if (event.metadata?.sources || event.metadata?.fullPrompt) {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                chunks: event.metadata?.sources,
                fullPrompt: event.metadata?.fullPrompt,
                promptTokenCount: event.metadata?.promptTokenCount,
              };
              return updated;
            });
          }

          // Invalidate the sessions list so the sidebar reflects the new message count.
          // This replaces the old onSessionUpdate() prop callback — no prop drilling needed.
          queryClient.invalidateQueries({ queryKey: sessionsQueryKey() });

          if (fullContent) {
            playAudio(fullContent);
          }
        }

        if (event.type === 'suggestions' && event.suggestions && event.suggestions.length > 0) {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              suggestions: event.suggestions,
            };
            return updated;
          });
        }
      }
    } catch {
      setError('Failed to send message. Please try again.');
      setFailedInput(content);
      setMessages((prev) => {
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

    const sessionId = currentSessionId ?? crypto.randomUUID();
    if (!currentSessionId) {
      setCurrentSessionId(sessionId);
      navigate(`/chat/${sessionId}`, { replace: true });
    }

    try {
      const response = await sendVoiceQuery(audioBlob, sessionId);

      const userMessage: Message = {
        id: crypto.randomUUID() as unknown as number,
        role: 'user',
        content: response.transcription?.text || '[Voice message]',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      const assistantMessage: Message = {
        id: crypto.randomUUID() as unknown as number,
        role: 'assistant',
        content: response.answer,
        createdAt: new Date().toISOString(),
        chunks: response.sources,
        fullPrompt: response.fullPrompt,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      queryClient.invalidateQueries({ queryKey: sessionsQueryKey() });

      playAudio(response.answer);
    } catch {
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
              gap: 3,
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" gutterBottom>
                Macular Society Assistant
              </Typography>
              <Typography variant="body2">
                Ask questions about macular disease, treatments, and support services.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', maxWidth: 480 }}>
              {[
                'About dry AMD',
                'About wet AMD',
                'Treatment options',
                'Benefits I can claim',
                'Newly diagnosed – where do I start?',
                'Living with macular disease',
              ].map((question) => (
                <Chip
                  key={question}
                  label={question}
                  onClick={() => handleSend(question)}
                  clickable
                  variant="outlined"
                  color="primary"
                />
              ))}
            </Box>
          </Box>
        ) : (
          <>
            {messages.map((message, i) => (
              // Use message.id (assigned at creation time) as the React key.
              // This is stable across re-renders, unlike array index which would
              // cause React to remount the wrong nodes when items shift position.
              <Box key={message.id ?? message.createdAt.toString()}>
                <ChatMessage message={message} />
                {message.role === 'assistant' &&
                  i === messages.length - 1 &&
                  !loading &&
                  message.suggestions && message.suggestions.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1, ml: 2 }}>
                      {message.suggestions.map((q) => (
                        <Chip
                          key={q}
                          label={q}
                          onClick={() => handleSend(q)}
                          clickable
                          size="small"
                          variant="outlined"
                          color="primary"
                        />
                      ))}
                    </Box>
                  )}
              </Box>
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
      <ChatInput
        onSend={handleSend}
        onVoiceSend={handleVoiceSend}
        loading={loading}
        voiceEnabled={voiceEnabled}
        onToggleVoice={toggleVoice}
        pendingValue={failedInput}
      />
    </Box>
  );
}
