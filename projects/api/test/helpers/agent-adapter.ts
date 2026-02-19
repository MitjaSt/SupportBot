import {
  AgentAdapter,
  AgentRole,
  type AgentInput,
  type AgentReturnTypes,
} from '@langwatch/scenario';
import { randomUUID } from 'crypto';
import { API_BASE_URL } from './constants';

interface ChatApiResponse {
  answer: string;
  sources: Array<{
    id: string;
    score: number;
    text: string;
    source: string;
    chunkIndex: number;
  }>;
  model: string;
  backend: 'openai';
  sessionId: string;
  collectionState: string;
}

export interface RagInteraction {
  userQuery: string;
  answer: string;
  model: string;
  backend: string;
  sources: Array<{ text: string; source: string; score: number }>;
}

export class MacularRAGAgent extends AgentAdapter {
  role = AgentRole.AGENT;
  interactions: RagInteraction[] = [];
  private sessionId: string = randomUUID();

  async call(input: AgentInput): Promise<AgentReturnTypes> {
    const lastUserMsg = [...input.newMessages]
      .reverse()
      .find((m) => m.role === 'user');

    const userMessage =
      lastUserMsg && typeof lastUserMsg.content === 'string'
        ? lastUserMsg.content
        : null;

    if (!userMessage) {
      return "I didn't receive a message. How can I help you?";
    }

    const response = await fetch(`${API_BASE_URL}/chat/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: userMessage,
        sessionId: this.sessionId,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `API returned ${response.status}: ${await response.text()}`,
      );
    }

    const data: ChatApiResponse = await response.json();

    this.sessionId = data.sessionId;

    this.interactions.push({
      userQuery: userMessage,
      answer: data.answer,
      model: data.model,
      backend: data.backend,
      sources: data.sources.map((s) => ({
        text: s.text,
        source: s.source,
        score: s.score,
      })),
    });

    return data.answer;
  }
}
