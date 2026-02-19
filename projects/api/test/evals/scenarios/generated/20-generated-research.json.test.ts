import scenario from '@langwatch/scenario';
import { describe, expect, it } from 'vitest';
import { MacularRAGAgent } from '../../../helpers/agent-adapter';
import { SCENARIO_SET_ID } from '../../../helpers/constants';
import { saveSimulationResult } from '../../../helpers/result-saver';

describe('Generated Tests - Research.json', () => {

  it('should answer questions about Research', async () => {
    const description =
      'User asking about research.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Research',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research.
            Ask the following questions naturally in conversation:
            - What is the main goal of the Macular Society?
            - What types of innovative treatments are currently being researched for macular disease?
            - Why is patient participation important in medical research for macular disease?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must be within scope (informational only, no unsupported diagnosis or treatment advice).',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Research', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });

});
