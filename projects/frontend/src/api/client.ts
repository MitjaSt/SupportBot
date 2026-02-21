import type { QueryResponse, Session, SessionWithHistory, Source } from '../types';

const API_BASE = '/api';

export interface StreamEvent {
  type: 'chunk' | 'tool' | 'done' | 'error';
  content?: string;
  sessionId?: string;
  metadata?: {
    sources?: Source[];
    model?: string;
    backend?: string;
    fullPrompt?: string;
    promptTokenCount?: number;
    contactCollected?: {
      type: 'phone' | 'email';
      value: string;
    };
  };
}

/**
 * Thin fetch wrapper that injects X-Rag-Session-Id when a session ID is provided
 * and a unique X-Request-Id for every request.
 * nginx logs these as $http_rag_session_id and $http_x_request_id.
 */
function apiFetch(url: string | URL, init: RequestInit = {}, sessionId?: string): Promise<Response> {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
    'X-Request-Id': crypto.randomUUID(),
    ...(sessionId ? { 'X-Rag-Session-Id': sessionId } : {}),
  };
  return fetch(url, { ...init, headers });
}

export async function sendQuery(
  query: string,
  sessionId: string
): Promise<QueryResponse> {
  const response = await apiFetch(
    `${API_BASE}/chat/query`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, sessionId }),
    },
    sessionId
  );

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
  sessionId: string
): AsyncGenerator<StreamEvent> {
  const response = await apiFetch(
    `${API_BASE}/chat/query/stream`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, sessionId }),
    },
    sessionId
  );

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
          } catch {
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
  const response = await apiFetch(`${API_BASE}/chat/sessions`);

  if (!response.ok) {
    throw new Error(`Failed to fetch sessions: ${response.statusText}`);
  }

  return response.json();
}

export async function getSession(sessionId: string): Promise<SessionWithHistory | null> {
  const response = await apiFetch(`${API_BASE}/chat/sessions/${sessionId}`, {}, sessionId);

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Failed to fetch session: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteSession(sessionId: string): Promise<void> {
  const response = await apiFetch(
    `${API_BASE}/chat/sessions/${sessionId}`,
    { method: 'DELETE' },
    sessionId
  );

  if (!response.ok) {
    throw new Error(`Failed to delete session: ${response.statusText}`);
  }
}

/**
 * Send voice query (audio file) and get text response with transcription.
 * Audio is sent as a raw binary body with the session ID in the query string —
 * this avoids multipart parsing entirely and works reliably across environments.
 */
export async function sendVoiceQuery(
  audioBlob: Blob,
  sessionId: string
): Promise<QueryResponse & { transcription?: { text: string; language: string } }> {
  const url = new URL(`${API_BASE}/chat/query/voice`, window.location.origin);
  url.searchParams.set('sessionId', sessionId);

  const response = await apiFetch(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': audioBlob.type || 'audio/webm' },
      body: audioBlob,
    },
    sessionId
  );

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
  const response = await apiFetch(`${API_BASE}/chat/synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`TTS synthesis failed: ${response.statusText}`);
  }

  return response.blob();
}
