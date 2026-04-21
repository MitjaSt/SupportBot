import scenario from '@langwatch/scenario';
import { describe, expect, it } from 'vitest';
import { RAGAgent } from '../../helpers/agent-adapter';
import { SCENARIO_SET_ID } from '../../helpers/constants';
import { saveSimulationResult } from '../../helpers/result-saver';

describe('Mental Health and Emotional Support', () => {
  it('should handle depression after diagnosis', async () => {
    const description =
      'Someone feeling depressed after their macular degeneration diagnosis.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Depression After Diagnosis',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            "You've recently been diagnosed with macular degeneration and feel hopeless and depressed. You're struggling to cope emotionally.",
        }),
        scenario.judgeAgent({
          criteria: [
            'Agent responds with empathy and understanding',
            'Agent acknowledges depression is common after diagnosis',
            'Agent mentions counselling or emotional support services',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult(
      'Depression After Diagnosis',
      result,
      description,
      agent.interactions,
    );
    expect(result.success).toBe(true);
  });

  it('should support a carer experiencing burnout', async () => {
    const description = 'A carer feeling exhausted and overwhelmed.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Carer Burnout',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            "You're caring for your elderly mother with macular degeneration and feeling completely exhausted and burnt out. Ask about support for carers.",
        }),
        scenario.judgeAgent({
          criteria: [
            'Agent acknowledges the challenges of caring',
            'Agent mentions support available for carers',
            'Agent is empathetic and supportive',
          ],
        }),
      ],
      maxTurns: 4,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Carer Burnout', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });
});
