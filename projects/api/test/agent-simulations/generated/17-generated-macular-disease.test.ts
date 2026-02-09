import scenario from '@langwatch/scenario';
import { describe, expect, it } from 'vitest';
import { MacularRAGAgent } from '../helpers/agent-adapter';
import { SCENARIO_SET_ID } from '../helpers/constants';
import { saveSimulationResult } from '../helpers/result-saver';

describe('Generated Tests - Macular Disease', () => {

  it('should answer questions about Macular-disease - Focus', async () => {
    const description =
      'User asking about macular-disease - focus.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Macular-disease - Focus',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about macular-disease - focus.
            Ask the following questions naturally in conversation:
            - What is the most prevalent form of macular disease?
            - Who is most commonly affected by age-related macular degeneration?
            - What are some of the risk factors for developing macular disease?`,
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

    saveSimulationResult('Macular-disease - Focus', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Macular-disease - Macula', async () => {
    const description =
      'User asking about macular-disease - macula.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Macular-disease - Macula',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about macular-disease - macula.
            Ask the following questions naturally in conversation:
            - What is the macula and what functions does it serve?
            - How does macular disease affect vision?
            - What are the common types of macular disease?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must be within scope, providing informational content only.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Macular-disease - Macula', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Macular-disease - Macular-conditions - Bestrophinopathies', async () => {
    const description =
      'User asking about macular-disease - macular-conditions - bestrophinopathies.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Macular-disease - Macular-conditions - Bestrophinopathies',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about macular-disease - macular-conditions - bestrophinopathies.
            Ask the following questions naturally in conversation:
            - What are bestrophinopathies and how do they affect vision?
            - How does a mutation in the BEST1 gene lead to vision problems?
            - Are there any treatments available for bestrophinopathies?`,
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

    saveSimulationResult('Macular-disease - Macular-conditions - Bestrophinopathies', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Macular-disease - Macular-conditions - Bulls-eye-maculopathy', async () => {
    const description =
      'User asking about macular-disease - macular-conditions - bulls-eye-maculopathy.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Macular-disease - Macular-conditions - Bulls-eye-maculopathy',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about macular-disease - macular-conditions - bulls-eye-maculopathy.
            Ask the following questions naturally in conversation:
            - What is bull’s eye maculopathy and how is it characterized?
            - At what age can bull’s eye maculopathy occur?
            - What are the symptoms associated with bull’s eye maculopathy?`,
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

    saveSimulationResult('Macular-disease - Macular-conditions - Bulls-eye-maculopathy', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Macular-disease - Macular-conditions - Central-serous-retinopathy', async () => {
    const description =
      'User asking about macular-disease - macular-conditions - central-serous-retinopathy.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Macular-disease - Macular-conditions - Central-serous-retinopathy',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about macular-disease - macular-conditions - central-serous-retinopathy.
            Ask the following questions naturally in conversation:
            - What is central serous retinopathy (CSR) and who is most commonly affected by it?
            - What are the potential triggers for central serous retinopathy?
            - What symptoms might someone with CSR experience?`,
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

    saveSimulationResult('Macular-disease - Macular-conditions - Central-serous-retinopathy', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Macular-disease - Macular-conditions - Charles-bonnet-syndrome', async () => {
    const description =
      'User asking about macular-disease - macular-conditions - charles-bonnet-syndrome.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Macular-disease - Macular-conditions - Charles-bonnet-syndrome',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about macular-disease - macular-conditions - charles-bonnet-syndrome.
            Ask the following questions naturally in conversation:
            - What is Charles Bonnet Syndrome and how does it relate to macular degeneration?
            - What types of visual hallucinations can occur with Charles Bonnet Syndrome?
            - How can eye movements help manage Charles Bonnet Syndrome?`,
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

    saveSimulationResult('Macular-disease - Macular-conditions - Charles-bonnet-syndrome', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Macular-disease - Macular-conditions - Cone-dystrophy', async () => {
    const description =
      'User asking about macular-disease - macular-conditions - cone-dystrophy.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Macular-disease - Macular-conditions - Cone-dystrophy',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about macular-disease - macular-conditions - cone-dystrophy.
            Ask the following questions naturally in conversation:
            - What are the main symptoms of cone dystrophy?
            - How is cone dystrophy diagnosed?
            - What inheritance patterns are associated with cone dystrophy?`,
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

    saveSimulationResult('Macular-disease - Macular-conditions - Cone-dystrophy', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Macular-disease - Macular-conditions - Diabetic-macular-oedema', async () => {
    const description =
      'User asking about macular-disease - macular-conditions - diabetic-macular-oedema.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Macular-disease - Macular-conditions - Diabetic-macular-oedema',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about macular-disease - macular-conditions - diabetic-macular-oedema.
            Ask the following questions naturally in conversation:
            - What is Diabetic Macular Oedema (DMO) and how does it affect vision?
            - What are the risk factors associated with Diabetic Macular Oedema?
            - Why are regular diabetic eye screenings important for individuals with diabetes?`,
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

    saveSimulationResult('Macular-disease - Macular-conditions - Diabetic-macular-oedema', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Macular-disease - Macular-conditions - Doyne-honeycomb-dystrophy', async () => {
    const description =
      'User asking about macular-disease - macular-conditions - doyne-honeycomb-dystrophy.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Macular-disease - Macular-conditions - Doyne-honeycomb-dystrophy',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about macular-disease - macular-conditions - doyne-honeycomb-dystrophy.
            Ask the following questions naturally in conversation:
            - What causes Doyne honeycomb dystrophy?
            - What are the symptoms of Doyne honeycomb dystrophy?
            - How does Doyne honeycomb dystrophy affect vision?`,
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

    saveSimulationResult('Macular-disease - Macular-conditions - Doyne-honeycomb-dystrophy', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Macular-disease - Macular-conditions - Dry-age-related-macular-degeneration - Geographic-atrophy', async () => {
    const description =
      'User asking about macular-disease - macular-conditions - dry-age-related-macular-degeneration - geographic-atrophy.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Macular-disease - Macular-conditions - Dry-age-related-macular-degeneration - Geographic-atrophy',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about macular-disease - macular-conditions - dry-age-related-macular-degeneration - geographic-atrophy.
            Ask the following questions naturally in conversation:
            - What characterizes geographic atrophy in the context of age-related macular degeneration?
            - How does age-related macular degeneration progress through its stages?
            - What are the current treatment options for geographic atrophy in the UK?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must remain within the informational scope.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Macular-disease - Macular-conditions - Dry-age-related-macular-degeneration - Geographic-atrophy', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Macular-disease - Macular-conditions - Dry-age-related-macular-degeneration', async () => {
    const description =
      'User asking about macular-disease - macular-conditions - dry-age-related-macular-degeneration.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Macular-disease - Macular-conditions - Dry-age-related-macular-degeneration',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about macular-disease - macular-conditions - dry-age-related-macular-degeneration.
            Ask the following questions naturally in conversation:
            - What is dry age-related macular degeneration (AMD) and how does it differ from wet AMD?
            - What are the typical methods used to diagnose dry AMD?
            - Is there any medical treatment available for dry AMD?`,
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

    saveSimulationResult('Macular-disease - Macular-conditions - Dry-age-related-macular-degeneration', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Macular-disease - Macular-conditions - Dry-early-amd', async () => {
    const description =
      'User asking about macular-disease - macular-conditions - dry-early-amd.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Macular-disease - Macular-conditions - Dry-early-amd',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about macular-disease - macular-conditions - dry-early-amd.
            Ask the following questions naturally in conversation:
            - What are the early signs of age-related macular degeneration (AMD)?
            - How often should individuals over 60 have eye tests for AMD detection?
            - What should someone do if they notice sudden changes in their vision?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must remain within scope, providing only informational content.',
            'Accept 'the source text does not provide enough information' as a valid response when applicable.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Macular-disease - Macular-conditions - Dry-early-amd', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Macular-disease - Macular-conditions - Mac-tel', async () => {
    const description =
      'User asking about macular-disease - macular-conditions - mac-tel.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Macular-disease - Macular-conditions - Mac-tel',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about macular-disease - macular-conditions - mac-tel.
            Ask the following questions naturally in conversation:
            - What are the main differences between MacTel Type 1 and Type 2?
            - Why is MacTel often misdiagnosed as AMD or diabetic retinopathy?
            - What are the current treatment options for MacTel?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must remain within the scope of the source text.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Macular-disease - Macular-conditions - Mac-tel', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Macular-disease - Macular-conditions - Macular-degeneration', async () => {
    const description =
      'User asking about macular-disease - macular-conditions - macular-degeneration.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Macular-disease - Macular-conditions - Macular-degeneration',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about macular-disease - macular-conditions - macular-degeneration.
            Ask the following questions naturally in conversation:
            - What is macular degeneration and how does it affect vision?
            - What are the two types of age-related macular degeneration?
            - What are the main risk factors for developing AMD?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must be within scope, providing informational content only.',
            'Accept 'the source text does not provide enough information' as a valid response.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Macular-disease - Macular-conditions - Macular-degeneration', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Macular-disease - Macular-conditions - Macular-hole', async () => {
    const description =
      'User asking about macular-disease - macular-conditions - macular-hole.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Macular-disease - Macular-conditions - Macular-hole',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about macular-disease - macular-conditions - macular-hole.
            Ask the following questions naturally in conversation:
            - What is a macular hole and which part of the eye does it affect?
            - Who is most at risk for developing a macular hole?
            - What are the common symptoms of a macular hole?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must remain within the informational scope.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Macular-disease - Macular-conditions - Macular-hole', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Macular-disease - Macular-conditions - Macular-oedema', async () => {
    const description =
      'User asking about macular-disease - macular-conditions - macular-oedema.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Macular-disease - Macular-conditions - Macular-oedema',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about macular-disease - macular-conditions - macular-oedema.
            Ask the following questions naturally in conversation:
            - What is macular oedema and what causes it?
            - What are the common symptoms of macular oedema?
            - How is macular oedema diagnosed?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must remain within scope and provide only informational content.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Macular-disease - Macular-conditions - Macular-oedema', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Macular-disease - Macular-conditions - Myopic-macular-degeneration', async () => {
    const description =
      'User asking about macular-disease - macular-conditions - myopic-macular-degeneration.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Macular-disease - Macular-conditions - Myopic-macular-degeneration',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about macular-disease - macular-conditions - myopic-macular-degeneration.
            Ask the following questions naturally in conversation:
            - What is myopic macular degeneration and how is it related to severe myopia?
            - How is the severity of myopia measured?
            - What are the potential risks associated with pathological myopia?`,
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

    saveSimulationResult('Macular-disease - Macular-conditions - Myopic-macular-degeneration', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Macular-disease - Macular-conditions - Pattern-dystrophy', async () => {
    const description =
      'User asking about macular-disease - macular-conditions - pattern-dystrophy.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Macular-disease - Macular-conditions - Pattern-dystrophy',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about macular-disease - macular-conditions - pattern-dystrophy.
            Ask the following questions naturally in conversation:
            - What are the different patterns in which pattern dystrophy can present?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
          ],
        }),
      ],
      maxTurns: 3,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Macular-disease - Macular-conditions - Pattern-dystrophy', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Macular-disease - Macular-conditions - Punctate-inner-choroidopathy', async () => {
    const description =
      'User asking about macular-disease - macular-conditions - punctate-inner-choroidopathy.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Macular-disease - Macular-conditions - Punctate-inner-choroidopathy',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about macular-disease - macular-conditions - punctate-inner-choroidopathy.
            Ask the following questions naturally in conversation:
            - What is Punctate Inner Choroidopathy (PIC) and who is primarily affected by it?
            - What are the common symptoms of PIC?
            - How is PIC suspected to be related to the immune system?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must be within scope, providing informational content only.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Macular-disease - Macular-conditions - Punctate-inner-choroidopathy', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Macular-disease - Macular-conditions - Pxe', async () => {
    const description =
      'User asking about macular-disease - macular-conditions - pxe.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Macular-disease - Macular-conditions - Pxe',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about macular-disease - macular-conditions - pxe.
            Ask the following questions naturally in conversation:
            - What is the cause of Pseudoxanthoma elasticum (PXE)?
            - How is PXE inherited?
            - What are the common symptoms of PXE?`,
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

    saveSimulationResult('Macular-disease - Macular-conditions - Pxe', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Macular-disease - Macular-conditions - Retinal-vein-occlusion', async () => {
    const description =
      'User asking about macular-disease - macular-conditions - retinal-vein-occlusion.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Macular-disease - Macular-conditions - Retinal-vein-occlusion',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about macular-disease - macular-conditions - retinal-vein-occlusion.
            Ask the following questions naturally in conversation:
            - What are the two types of Retinal Vein Occlusion (RVO) and how do they differ?
            - What are the common risk factors associated with Retinal Vein Occlusion?
            - How effective are anti-VEGF injections in treating RVO?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must be within scope, providing only informational content.',
            'The response 'the source text does not provide enough information' is valid when applicable.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Macular-disease - Macular-conditions - Retinal-vein-occlusion', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Macular-disease - Macular-conditions - Sorsby-fundus-dystrophy', async () => {
    const description =
      'User asking about macular-disease - macular-conditions - sorsby-fundus-dystrophy.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Macular-disease - Macular-conditions - Sorsby-fundus-dystrophy',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about macular-disease - macular-conditions - sorsby-fundus-dystrophy.
            Ask the following questions naturally in conversation:
            - What is the inheritance pattern of Sorsby fundus dystrophy?
            - What are the early symptoms of Sorsby fundus dystrophy?
            - How does Sorsby fundus dystrophy affect vision as individuals age?`,
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

    saveSimulationResult('Macular-disease - Macular-conditions - Sorsby-fundus-dystrophy', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Macular-disease - Macular-conditions - Stargardt-disease', async () => {
    const description =
      'User asking about macular-disease - macular-conditions - stargardt-disease.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Macular-disease - Macular-conditions - Stargardt-disease',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about macular-disease - macular-conditions - stargardt-disease.
            Ask the following questions naturally in conversation:
            - What is Stargardt disease and how does it affect vision?
            - What are the genetic causes of Stargardt disease?
            - At what age do symptoms of Stargardt disease typically begin?`,
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

    saveSimulationResult('Macular-disease - Macular-conditions - Stargardt-disease', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Macular-disease - Macular-conditions - Wet-age-related-macular-degeneration', async () => {
    const description =
      'User asking about macular-disease - macular-conditions - wet-age-related-macular-degeneration.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Macular-disease - Macular-conditions - Wet-age-related-macular-degeneration',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about macular-disease - macular-conditions - wet-age-related-macular-degeneration.
            Ask the following questions naturally in conversation:
            - What is wet age-related macular degeneration (AMD) and how does it affect vision?
            - Why is early detection and treatment important for wet AMD?
            - What diagnostic procedure is commonly used to identify wet AMD?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must be within scope, providing only informational content.',
            'The response 'the source text does not provide enough information' is acceptable when applicable.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Macular-disease - Macular-conditions - Wet-age-related-macular-degeneration', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Macular-disease - Macular-conditions', async () => {
    const description =
      'User asking about macular-disease - macular-conditions.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: 'Macular-disease - Macular-conditions',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about macular-disease - macular-conditions.
            Ask the following questions naturally in conversation:
            - What is the most common form of macular disease in the UK?
            - Who is primarily affected by age-related macular degeneration (AMD)?
            - What percentage of people with sight loss from macular degeneration experience Charles Bonnet Syndrome?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must remain within scope and provide informational content only.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Macular-disease - Macular-conditions', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });

});
