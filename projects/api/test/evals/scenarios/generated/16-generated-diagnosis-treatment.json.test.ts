import scenario from '@langwatch/scenario';
import { describe, expect, it } from 'vitest';
import { RAGAgent } from '../../../helpers/agent-adapter';
import { SCENARIO_SET_ID } from '../../../helpers/constants';
import { saveSimulationResult } from '../../../helpers/result-saver';

describe('Generated Tests - Diagnosis Treatment.json', () => {

  it('should answer questions about Diagnosis-treatment', async () => {
    const description =
      'User asking about diagnosis-treatment.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Diagnosis-treatment',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about diagnosis-treatment.
            Ask the following questions naturally in conversation:
            - What tests are used by optometrists to diagnose age-related macular degeneration (AMD)?
            - Is there any treatment available for dry age-related macular degeneration (AMD)?
            - Why is it important to start treatment for wet AMD within two weeks of diagnosis?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must be within scope (informational only, no unsupported diagnosis or treatment advice).',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Diagnosis-treatment', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });

});
