import scenario from '@langwatch/scenario';
import { describe, it, expect } from 'vitest';
import { MacularRAGAgent } from '../helpers/agent-adapter';
import { saveSimulationResult } from '../helpers/result-saver';
import { SCENARIO_SET_ID } from '../helpers/constants';

describe('Newly Diagnosed', () => {
  it('should support someone newly diagnosed and overwhelmed', async () => {
    const description = 'Someone just diagnosed feeling overwhelmed and scared.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Newly Diagnosed Overwhelmed',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            "You've just been diagnosed with macular degeneration today. You're in shock and don't know what to do or what this means for your future.",
        }),
        scenario.judgeAgent({
          criteria: [
            'Agent is empathetic and reassuring',
            'Agent provides clear next steps',
            'Agent reassures about maintaining independence',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult(
      'Newly Diagnosed Overwhelmed',
      result,
      description,
      agent.interactions,
    );
    expect(result.success).toBe(true);
  });

  it('should address the fear of going blind', async () => {
    const description = 'Someone asking the common question about going blind.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Will I Go Blind',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            "You've been diagnosed with macular degeneration and your biggest fear is going completely blind. Ask directly if you will lose all your sight.",
        }),
        scenario.judgeAgent({
          criteria: [
            'Agent explains that macular disease affects central vision only',
            'Agent reassures that peripheral vision is preserved',
            'Agent is honest but reassuring',
          ],
        }),
      ],
      maxTurns: 4,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Will I Go Blind', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });
});
