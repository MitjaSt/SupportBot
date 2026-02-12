import type { QueryResponse, Session, SessionWithHistory } from '../types';

const API_BASE = '/api';

export interface StreamEvent {
  type: 'chunk' | 'tool' | 'done' | 'error';
  content?: string;
  sessionId?: string;
  metadata?: {
    sources?: any[];
    model?: string;
    backend?: string;
    contactCollected?: {
      type: 'phone' | 'email';
      value: string;
    };
  };
}

export async function sendQuery(
  query: string,
  sessionId?: string
): Promise<QueryResponse> {
  const response = await fetch(`${API_BASE}/chat/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, sessionId }),
  });

  if (!response.ok) {
    throw new Error(`Query failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Stream query responses using Server-Sent Events
 * Yields events as they are received from the server
 */
export async function* sendQueryStream(
  query: string,
  sessionId?: string
): AsyncGenerator<StreamEvent> {
  const response = await fetch(`${API_BASE}/chat/query/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, sessionId }),
  });

  if (!response.ok) {
    throw new Error(`Query failed: ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      // Decode the chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Split by SSE message boundary (double newline)
      const messages = buffer.split('\n\n');

      // Keep the last incomplete message in the buffer
      buffer = messages.pop() || '';

      // Process complete messages
      for (const message of messages) {
        if (message.trim() === '') continue;

        // SSE format: "data: {json}"
        const dataPrefix = 'data: ';
        if (message.startsWith(dataPrefix)) {
          const jsonStr = message.slice(dataPrefix.length);
          try {
            const event: StreamEvent = JSON.parse(jsonStr);
            yield event;
          } catch (e) {
            // Skip malformed SSE messages
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function listSessions(): Promise<(Session & { messageCount: number })[]> {
  const response = await fetch(`${API_BASE}/chat/sessions`);

  if (!response.ok) {
    throw new Error(`Failed to fetch sessions: ${response.statusText}`);
  }

  return response.json();
}

export async function getSession(sessionId: string): Promise<SessionWithHistory | null> {
  const response = await fetch(`${API_BASE}/chat/sessions/${sessionId}`);

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Failed to fetch session: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteSession(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/chat/sessions/${sessionId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete session: ${response.statusText}`);
  }
}

/**
 * Send voice query (audio file) and get text response with transcription
 */
export async function sendVoiceQuery(
  audioBlob: Blob,
  sessionId?: string
): Promise<QueryResponse & { transcription?: { text: string; language: string } }> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');

  if (sessionId) {
    formData.append('sessionId', sessionId);
  }

  const response = await fetch(`${API_BASE}/chat/query/voice`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Voice query failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Synthesize text to speech using Piper TTS
 * Returns an audio blob (WAV format)
 */
export async function synthesizeSpeech(text: string): Promise<Blob> {
  const response = await fetch(`${API_BASE}/chat/synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`TTS synthesis failed: ${response.statusText}`);
  }

  return response.blob();
}
