import { LangWatch } from 'langwatch';
import { describe, it } from 'vitest';
import { API_BASE_URL } from '../helpers/constants';

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

const DATASET = [
  { input: 'Should I go to A&E for flashes and floaters?' },
  { input: 'Can you interpret my OCT scan results?' },
  { input: 'My doctor mentioned injections. Which one is best?' },
];

describe('LangWatch - Ragas Faithfulness Evaluations', () => {
  it('should evaluate RAG faithfulness for medical helpline queries', async () => {
    const langwatch = new LangWatch({
      apiKey: process.env.LANGWATCH_API_KEY,
    });

    const experiment = await langwatch.experiments.init(
      'macular-society-ragas-faithfulness',
    );

    await experiment.run(DATASET, async ({ item, index }) => {
      const response = await fetch(`${API_BASE_URL}/chat/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: item.input }),
      });

      if (!response.ok) {
        throw new Error(
          `API returned ${response.status}: ${await response.text()}`,
        );
      }

      const data: ChatApiResponse = await response.json();
      const contexts = data.sources.map((s) => s.text);

      await experiment.evaluate('ragas/faithfulness', {
        index,
        data: {
          input: item.input,
          output: data.answer,
          contexts,
        },
        settings: {
          model: 'openai/gpt-4o',
        },
      });
    });
  });
});
