import scenario from '@langwatch/scenario';
import { describe, it, expect } from 'vitest';
import { MacularRAGAgent } from '../helpers/agent-adapter';
import { saveSimulationResult } from '../helpers/result-saver';
import { SCENARIO_SET_ID } from '../helpers/constants';

describe('Benefits and Financial Support', () => {
  it('should inform about Attendance Allowance', async () => {
    const description = 'An elderly person asking about financial help available.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Attendance Allowance',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            "You're 75 with macular degeneration and struggling financially. Ask about benefits you might be entitled to.",
        }),
        scenario.judgeAgent({
          criteria: [
            'Agent mentions Attendance Allowance for pensioners',
            'Agent explains it helps with extra costs of disability',
            'Agent provides accurate information from context',
          ],
        }),
      ],
      maxTurns: 4,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Attendance Allowance', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });

  it('should inform about PIP for working-age adults', async () => {
    const description = 'A working-age adult asking about disability benefits.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'PIP Working Age',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            "You're 45 with severe sight loss and wondering if you can claim any disability benefits while still working.",
        }),
        scenario.judgeAgent({
          criteria: [
            'Agent mentions Personal Independence Payment (PIP)',
            'Agent explains PIP is not means-tested',
            'Agent provides helpful information about eligibility',
          ],
        }),
      ],
      maxTurns: 4,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('PIP Working Age', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });
});
