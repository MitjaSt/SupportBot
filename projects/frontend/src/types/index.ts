export interface Message {
  id?: number;
  sessionId?: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string | Date;
}

export interface Session {
  sessionId: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  expiresAt: string | Date;
  userPhone: string | null;
  userName: string | null;
  preferredCallTime: string | null;
  collectionState: string | null;
  callbackTopic: string | null;
  messageCount?: number;
}

export interface Source {
  id: string;
  score: number;
  text: string;
  source: string;
  chunkIndex: number;
}

export interface QueryResponse {
  answer: string;
  sources: Source[];
  model: string;
  backend: 'openai';
  sessionId: string;
  collectionState: string;
}

export interface SessionWithHistory {
  session: Session;
  history: Message[];
}
