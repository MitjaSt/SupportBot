import scenario from '@langwatch/scenario';
import { describe, expect, it } from 'vitest';
import { RAGAgent } from '../../../helpers/agent-adapter';
import { SCENARIO_SET_ID } from '../../../helpers/constants';
import { saveSimulationResult } from '../../../helpers/result-saver';

describe('Generated Tests - Diagnosis Treatment', () => {

  it('should answer questions about Diagnosis-treatment - Healthcare', async () => {
    const description =
      'User asking about diagnosis-treatment - healthcare.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Diagnosis-treatment - Healthcare',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about diagnosis-treatment - healthcare.
            Ask the following questions naturally in conversation:
            - What role does an optometrist play in the detection of age-related macular degeneration (AMD)?
            - Why is it recommended to bypass the GP for referrals when treatment for AMD is needed?
            - What are the responsibilities of a consultant ophthalmologist in the care of patients with AMD?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must be within scope, providing only informational content.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Diagnosis-treatment - Healthcare', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Diagnosis-treatment - How - Ct-scans', async () => {
    const description =
      'User asking about diagnosis-treatment - how - ct-scans.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Diagnosis-treatment - How - Ct-scans',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about diagnosis-treatment - how - ct-scans.
            Ask the following questions naturally in conversation:
            - What is optical coherence tomography (OCT) used for?
            - How does OCT differ from ultrasound in terms of operation?
            - Why is OCT important for detecting retinal conditions?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must be within scope, providing only informational content.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Diagnosis-treatment - How - Ct-scans', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Diagnosis-treatment - How - Eye-tests', async () => {
    const description =
      'User asking about diagnosis-treatment - how - eye-tests.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Diagnosis-treatment - How - Eye-tests',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about diagnosis-treatment - how - eye-tests.
            Ask the following questions naturally in conversation:
            - How often should one have an eye examination if they do not have noticeable sight issues?
            - What conditions can regular eye examinations help detect early?
            - Who is eligible for free NHS eye examinations?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must be within scope, providing only informational content.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Diagnosis-treatment - How - Eye-tests', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Diagnosis-treatment - How - Fluorescein-dye-angiography', async () => {
    const description =
      'User asking about diagnosis-treatment - how - fluorescein-dye-angiography.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Diagnosis-treatment - How - Fluorescein-dye-angiography',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about diagnosis-treatment - how - fluorescein-dye-angiography.
            Ask the following questions naturally in conversation:
            - What is the purpose of fluorescein angiography?
            - What steps are involved in the fluorescein angiography procedure?
            - Are there any side effects associated with fluorescein angiography?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must remain within scope, providing informational content only.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Diagnosis-treatment - How - Fluorescein-dye-angiography', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Diagnosis-treatment - How - Genetic-testing', async () => {
    const description =
      'User asking about diagnosis-treatment - how - genetic-testing.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Diagnosis-treatment - How - Genetic-testing',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about diagnosis-treatment - how - genetic-testing.
            Ask the following questions naturally in conversation:
            - What kind of support is offered for individuals with macular disease?
            - How can I contact them for support?
            - What are the operating hours of the helpline?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must remain within scope, providing only informational content.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Diagnosis-treatment - How - Genetic-testing', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Diagnosis-treatment - How - Hcq-retinopathy-screening', async () => {
    const description =
      'User asking about diagnosis-treatment - how - hcq-retinopathy-screening.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Diagnosis-treatment - How - Hcq-retinopathy-screening',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about diagnosis-treatment - how - hcq-retinopathy-screening.
            Ask the following questions naturally in conversation:
            - What are the potential side effects of long-term hydroxychloroquine use?
            - How often should patients on hydroxychloroquine undergo eye health checks?
            - What tests are recommended if abnormalities are detected during eye health checks for patients on hydroxychloroquine?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must be within scope and informational only.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Diagnosis-treatment - How - Hcq-retinopathy-screening', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Diagnosis-treatment - How', async () => {
    const description =
      'User asking about diagnosis-treatment - how.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Diagnosis-treatment - How',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about diagnosis treatments.
            Ask the following questions naturally in conversation:
            - What imaging technique is used by optometrists to detect early signs of macular degeneration?
            - Is there a treatment available for dry age-related macular degeneration?
            - What should be done if wet AMD is suspected?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must remain within the scope of informational content only.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Diagnosis-treatment - How', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Diagnosis-treatment - Treatments - New-treatments', async () => {
    const description =
      'User asking about diagnosis-treatment - treatments - new-treatments.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Diagnosis-treatment - Treatments - New-treatments',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about diagnosis-treatment - treatments - new-treatments.
            Ask the following questions naturally in conversation:
            - What are the newly approved drugs for treating dry AMD in the USA?
            - How are Syfovre and Izervay administered for dry AMD?
            - Why has Syfovre not been approved in the UK or Europe?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must remain within scope, providing informational content only.',
            'The response 'the source text does not provide enough information' is valid when applicable.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Diagnosis-treatment - Treatments - New-treatments', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Diagnosis-treatment - Treatments', async () => {
    const description =
      'User asking about diagnosis-treatment - treatments.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Diagnosis-treatment - Treatments',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about diagnosis-treatment - treatments.
            Ask the following questions naturally in conversation:
            - What are the current treatment options for dry age-related macular degeneration (AMD)?
            - Why is immediate referral to a retinal specialist important for wet AMD?
            - How do anti-VEGF drugs work in treating wet AMD?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must be within scope, providing only informational content.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Diagnosis-treatment - Treatments', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });

});
