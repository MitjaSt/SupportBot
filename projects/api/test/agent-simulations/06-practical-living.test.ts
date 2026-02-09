import scenario from '@langwatch/scenario';
import { describe, expect, it } from 'vitest';
import { MacularRAGAgent } from '../helpers/agent-adapter';
import { SCENARIO_SET_ID } from '../helpers/constants';
import { saveSimulationResult } from '../helpers/result-saver';

describe('Practical Living', () => {
  it('should advise on driving with AMD', async () => {
    const description =
      'Someone asking about whether they can still drive with AMD.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Driving With AMD',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            "You've been diagnosed with AMD and are worried about losing your driving licence. Ask about the rules and what you need to do.",
        }),
        scenario.judgeAgent({
          criteria: [
            'Agent mentions DVLA notification requirements',
            'Agent explains visual acuity requirements',
            'Agent provides accurate information',
          ],
        }),
      ],
      maxTurns: 4,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Driving With AMD', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });

  it('should suggest low vision aids', async () => {
    const description = 'Someone asking about magnifiers and aids for reading.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Low Vision Aids',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            'You have AMD and struggle with daily tasks like reading. Ask about practical aids and tools that can help.',
        }),
        scenario.judgeAgent({
          criteria: [
            'Agent provides practical suggestions for managing low vision',
            'Agent information is based on retrieved context',
            'Agent is supportive and encouraging',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Low Vision Aids', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });

  it('should advise on continuing work', async () => {
    const description = 'Someone worried about their job after diagnosis.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Continuing Work',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            "You've been diagnosed with macular degeneration and are worried about keeping your job. Ask about working with sight loss.",
        }),
        scenario.judgeAgent({
          criteria: [
            'Agent reassures that many people continue working',
            'Agent mentions reasonable adjustments',
            'Agent provides practical information',
          ],
        }),
      ],
      maxTurns: 4,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Continuing Work', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });
});
