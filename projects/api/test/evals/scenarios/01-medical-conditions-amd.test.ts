import scenario from '@langwatch/scenario';
import { describe, expect, it } from 'vitest';
import { MacularRAGAgent } from '../../helpers/agent-adapter';
import { SCENARIO_SET_ID } from '../../helpers/constants';
import { saveSimulationResult } from '../../helpers/result-saver';

describe('Medical Conditions - AMD', () => {
  it('should provide accurate information about dry AMD', async () => {
    const description =
      'An elderly person recently diagnosed with dry AMD wants to understand what it is and treatment options.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Dry AMD Information',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are an elderly person recently diagnosed with dry AMD
            Ask about what dry AMD is, how it progresses, and what treatments exist.`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Agent provides accurate information about dry AMD',
            'Agent explains that dry AMD affects central vision',
            'Agent mentions there is no cure but discusses management options',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Dry AMD Information', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });

  it('should explain wet AMD treatments correctly', async () => {
    const description =
      'A family member wants to learn about wet AMD treatments, especially anti-VEGF injections.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Wet AMD Treatment',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            'You are caring for someone with wet AMD. Ask about treatment options, how injections work, and what to expect.',
        }),
        scenario.judgeAgent({
          criteria: [
            'Agent mentions anti-VEGF injections as a treatment',
            'Agent provides information based on retrieved context',
            'Agent does not invent specific drug dosages',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Wet AMD Treatment', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });

  it('should provide information about geographic atrophy', async () => {
    const description =
      'Someone asking about geographic atrophy and whether new treatments are available.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Geographic Atrophy',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            'You have been told you have geographic atrophy. Ask what this means and if there are any new treatments.',
        }),
        scenario.judgeAgent({
          criteria: [
            'Agent explains geographic atrophy is advanced dry AMD',
            'Agent provides accurate information from context',
            'Agent is honest about treatment limitations',
          ],
        }),
      ],
      maxTurns: 4,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Geographic Atrophy', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });
});
