import scenario from '@langwatch/scenario';
import { describe, expect, it } from 'vitest';
import { MacularRAGAgent } from '../helpers/agent-adapter';
import { SCENARIO_SET_ID } from '../helpers/constants';
import { saveSimulationResult } from '../helpers/result-saver';

describe('Treatments and Procedures', () => {
  it('should handle anxiety about eye injections', async () => {
    const description = 'Someone anxious about having their first eye injection.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Injection Pain Concerns',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            "You're scheduled for your first eye injection and are terrified. Ask about whether it hurts, what to expect during and after.",
        }),
        scenario.judgeAgent({
          criteria: [
            'Agent explains the injection procedure reassuringly',
            'Agent mentions anaesthetic is used',
            'Agent provides information about what to expect after',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Injection Pain Concerns', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });

  it('should advise on post-injection complications', async () => {
    const description = 'Someone experiencing pain after an eye injection seeking advice.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Post Injection Complications',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            'You had an eye injection yesterday and now have severe pain and redness. Ask what you should do.',
        }),
        scenario.judgeAgent({
          criteria: [
            'Agent takes the concern seriously',
            'Agent advises seeking urgent medical attention',
            'Agent mentions signs of infection requiring immediate care',
          ],
        }),
      ],
      maxTurns: 4,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult(
      'Post Injection Complications',
      result,
      description,
      agent.interactions,
    );
    expect(result.success).toBe(true);
  });
});
