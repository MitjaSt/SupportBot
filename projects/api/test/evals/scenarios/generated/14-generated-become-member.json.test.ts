import scenario from '@langwatch/scenario';
import { describe, expect, it } from 'vitest';
import { MacularRAGAgent } from '../../../helpers/agent-adapter';
import { SCENARIO_SET_ID } from '../../../helpers/constants';
import { saveSimulationResult } from '../../../helpers/result-saver';

describe('Generated Tests - Become Member.json', () => {

  it('should answer questions about Become-member', async () => {
    const description =
      'User asking about become-member.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Become-member',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about become-member.
            Ask the following questions naturally in conversation:
            - What is the cost of annual membership after the free trial period?
            - Who is eligible for the free six-month membership trial?
            - Can previous members of the Macular Society access the free trial?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must remain within scope and provide informational content only.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Become-member', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });

});
