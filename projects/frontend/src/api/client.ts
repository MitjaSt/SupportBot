import type { QueryResponse, Session, SessionWithHistory } from '../types';

const API_BASE = '/api';

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
