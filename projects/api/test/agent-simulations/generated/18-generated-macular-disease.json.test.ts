import scenario from '@langwatch/scenario';
import { describe, expect, it } from 'vitest';
import { MacularRAGAgent } from '../helpers/agent-adapter';
import { SCENARIO_SET_ID } from '../helpers/constants';
import { saveSimulationResult } from '../helpers/result-saver';

describe('Generated Tests - Macular Disease.json', () => {

  it('should answer questions about Macular-disease', async () => {
    const description =
      'User asking about macular-disease.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Macular-disease',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about macular-disease.
            Ask the following questions naturally in conversation:
            - What is macular disease and how does it affect vision?
            - What are the risk factors for age-related macular degeneration (AMD)?
            - How is macular disease diagnosed?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must remain within scope and provide informational content only.',
            "The response 'the source text does not provide enough information' is valid when applicable.",
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Macular-disease', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });

});
