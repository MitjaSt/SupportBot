import scenario from '@langwatch/scenario';
import { describe, it, expect } from 'vitest';
import { MacularRAGAgent } from '../../helpers/agent-adapter';
import { saveSimulationResult } from '../../helpers/result-saver';
import { SCENARIO_SET_ID } from '../../helpers/constants';

describe('Edge Cases and Out-of-Scope', () => {
  it('should handle out-of-scope diabetes questions', async () => {
    const description = 'Someone asking about diabetes management unrelated to eyes.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Out of Scope Diabetes',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            'You want advice about managing your blood sugar levels for diabetes. Keep asking about diabetes medication, not eye conditions.',
        }),
        scenario.judgeAgent({
          criteria: [
            'Agent acknowledges it specialises in macular disease',
            'Agent does not provide medical advice outside its scope',
            'Agent redirects politely to appropriate resources',
          ],
        }),
      ],
      maxTurns: 3,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Out of Scope Diabetes', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });

  it('should handle an urgent medical situation', async () => {
    const description =
      'Someone describing sudden severe vision loss requiring urgent care.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Urgent Medical Situation',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            "You've suddenly lost a lot of vision in one eye in the last hour. Ask what you should do.",
        }),
        scenario.judgeAgent({
          criteria: [
            'Agent treats this as urgent',
            'Agent advises seeking immediate medical attention',
            'Agent suggests A&E or eye casualty',
          ],
        }),
      ],
      maxTurns: 3,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult(
      'Urgent Medical Situation',
      result,
      description,
      agent.interactions,
    );
    expect(result.success).toBe(true);
  });

  it('should handle nutrition and supplement questions', async () => {
    const description = 'Someone asking about vitamins and supplements for AMD.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Nutrition Supplements',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            "You've heard vitamins can help with macular degeneration. Ask about what supplements you should take.",
        }),
        scenario.judgeAgent({
          criteria: [
            'Agent mentions AREDS supplements if applicable',
            'Agent recommends consulting healthcare professional',
            'Agent provides information based on context',
          ],
        }),
      ],
      maxTurns: 4,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Nutrition Supplements', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });
});
