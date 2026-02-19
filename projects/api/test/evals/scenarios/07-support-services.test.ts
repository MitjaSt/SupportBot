import scenario from '@langwatch/scenario';
import { describe, it, expect } from 'vitest';
import { MacularRAGAgent } from '../../helpers/agent-adapter';
import { saveSimulationResult } from '../../helpers/result-saver';
import { SCENARIO_SET_ID } from '../../helpers/constants';

describe('Support Services', () => {
  it('should handle a request for callback', async () => {
    const description = 'Someone wanting to speak with a real person for support.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Request Callback',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            'You prefer speaking to a real person and want to request a callback from the Macular Society helpline.',
        }),
        scenario.judgeAgent({
          criteria: [
            'Agent offers to arrange a callback or provides helpline number',
            'Agent is helpful and accommodating',
            'Agent mentions the helpline service',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Request Callback', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });

  it('should provide counselling service information', async () => {
    const description = 'Someone asking about counselling support.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Counselling Service',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            "You're struggling emotionally and want to talk to a counsellor. Ask about counselling services available.",
        }),
        scenario.judgeAgent({
          criteria: [
            'Agent mentions the Macular Society counselling service',
            "Agent explains it's free and confidential",
            'Agent provides information on how to access it',
          ],
        }),
      ],
      maxTurns: 4,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Counselling Service', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });

  it('should provide support group information', async () => {
    const description =
      'Someone wanting to connect with others who have macular disease.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Support Groups',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            'You feel isolated and would like to meet other people with macular disease. Ask about support groups.',
        }),
        scenario.judgeAgent({
          criteria: [
            'Agent mentions local or virtual support groups',
            'Agent explains benefits of peer support',
            'Agent provides information on how to join',
          ],
        }),
      ],
      maxTurns: 4,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Support Groups', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });
});
