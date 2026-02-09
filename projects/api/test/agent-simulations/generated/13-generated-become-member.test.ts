import scenario from '@langwatch/scenario';
import { describe, expect, it } from 'vitest';
import { MacularRAGAgent } from '../helpers/agent-adapter';
import { SCENARIO_SET_ID } from '../helpers/constants';
import { saveSimulationResult } from '../helpers/result-saver';

describe('Generated Tests - Become Member', () => {

  it('should answer questions about Become-member - Thank-you', async () => {
    const description =
      'User asking about become-member - thank-you.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Become-member - Thank-you',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about become-member - thank-you.
            Ask the following questions naturally in conversation:
            - What kind of support does the Macular Society offer to its members?
            - How can members manage their sight loss according to the Macular Society?
            - What resources are available to members in the dedicated members' area on the Macular Society website?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must be within scope, providing only informational content.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Become-member - Thank-you', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });

});
