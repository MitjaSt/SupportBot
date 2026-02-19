import scenario from '@langwatch/scenario';
import { describe, it, expect } from 'vitest';
import { MacularRAGAgent } from '../../helpers/agent-adapter';
import { saveSimulationResult } from '../../helpers/result-saver';
import { SCENARIO_SET_ID } from '../../helpers/constants';

describe('Medical Conditions - Other', () => {
  it('should explain Charles Bonnet syndrome', async () => {
    const description =
      "Someone experiencing visual hallucinations after sight loss, worried they're going mad.";
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Charles Bonnet Syndrome',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            "You have macular degeneration and are seeing strange things - patterns, faces, tiny people. You're frightened and wonder if you're losing your mind. Ask about these hallucinations.",
        }),
        scenario.judgeAgent({
          criteria: [
            "Agent explains Charles Bonnet syndrome and reassures it's not mental illness",
            'Agent provides information about why hallucinations occur with sight loss',
            'Agent mentions techniques to stop or reduce hallucinations',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Charles Bonnet Syndrome', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });

  it('should provide information about Stargardt disease', async () => {
    const description = 'A young person or parent asking about Stargardt disease.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Stargardt Disease',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            'Your teenage child has been diagnosed with Stargardt disease. Ask about what this means, how it\'s inherited, and the prognosis.',
        }),
        scenario.judgeAgent({
          criteria: [
            'Agent explains Stargardt is a genetic macular condition',
            'Agent mentions it typically affects younger people',
            'Agent provides accurate information about inheritance patterns',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Stargardt Disease', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });

  it('should explain diabetic macular oedema', async () => {
    const description = 'A diabetic patient asking about macular oedema and treatment.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Diabetic Macular Oedema',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            'You have diabetes and have been told you have macular oedema. Ask about what this is and how it\'s treated.',
        }),
        scenario.judgeAgent({
          criteria: [
            'Agent explains diabetic macular oedema accurately',
            'Agent mentions treatment options available',
            'Agent emphasises importance of diabetes management',
          ],
        }),
      ],
      maxTurns: 4,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Diabetic Macular Oedema', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });
});
