import scenario from '@langwatch/scenario';
import { describe, expect, it } from 'vitest';
import { RAGAgent } from '../../../helpers/agent-adapter';
import { SCENARIO_SET_ID } from '../../../helpers/constants';
import { saveSimulationResult } from '../../../helpers/result-saver';

describe('Generated Tests - Research', () => {

  it('should answer questions about Research - Explore - Achievements', async () => {
    const description =
      'User asking about research - explore - achievements.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Achievements',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - achievements.
            Ask the following questions naturally in conversation:
            - What is the primary goal of the Macular Society?
            - How does the MD_evReader app assist individuals with macular degeneration?
            - What is the purpose of the Manchester Eye Tissue Repository (METR)?`,
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

    saveSimulationResult('Research - Explore - Achievements', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Finding-cure', async () => {
    const description =
      'User asking about research - explore - finding-cure.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Finding-cure',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - finding-cure.
            Ask the following questions naturally in conversation:
            - What is the main goal of the Macular Society?
            - How does the Macular Society involve patients in their research efforts?
            - What is the purpose of the Action Against AMD initiative?`,
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

    saveSimulationResult('Research - Explore - Finding-cure', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Improving-life', async () => {
    const description =
      'User asking about research - explore - improving-life.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Improving-life',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - improving-life.
            Ask the following questions naturally in conversation:
            - What is the eccentric viewing technique?
            - How does the Macular Society support individuals with macular disease?
            - What kind of support do the local groups provide?`,
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

    saveSimulationResult('Research - Explore - Improving-life', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Insight', async () => {
    const description =
      'User asking about research - explore - insight.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Insight',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - insight.
            Ask the following questions naturally in conversation:
            - What is the main goal of the collaboration between Action Against AMD and the INSIGHT Hub?
            - How does INSIGHT contribute to eye health research?
            - What role do patients play in the research initiative mentioned?`,
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

    saveSimulationResult('Research - Explore - Insight', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Fellowships - Measuring-visual-pigment-regeneration-to-track-stargardt-progression', async () => {
    const description =
      'User asking about research - explore - projects - fellowships - measuring-visual-pigment-regeneration-to-track-stargardt-progression.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Fellowships - Measuring-visual-pigment-regeneration-to-track-stargardt-progression',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - fellowships - measuring-visual-pigment-regeneration-to-track-stargardt-progression.
            Ask the following questions naturally in conversation:
            - What is Stargardt disease and how does it affect vision?
            - How does the faulty ABCA4 gene contribute to vision loss in Stargardt disease?
            - What is imaging retinal densitometry (IRD) and what does it measure?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must be within scope and informational only.',
            'Accept 'the source text does not provide enough information' as a valid response when applicable.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Research - Explore - Projects - Fellowships - Measuring-visual-pigment-regeneration-to-track-stargardt-progression', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Phds - Creating-an-atlas-of-the-macula', async () => {
    const description =
      'User asking about research - explore - projects - phds - creating-an-atlas-of-the-macula.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Phds - Creating-an-atlas-of-the-macula',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - phds - creating-an-atlas-of-the-macula.
            Ask the following questions naturally in conversation:
            - What is the primary goal of Dr. Colin Chu's project at UCL's Institute of Ophthalmology?
            - How does Dr. Colin Chu's project plan to map and visualize macular cells?
            - What are the expected benefits of the macular atlas being developed?`,
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

    saveSimulationResult('Research - Explore - Projects - Phds - Creating-an-atlas-of-the-macula', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Phds - Developing-eye-drops-can-reach-back-eye', async () => {
    const description =
      'User asking about research - explore - projects - phds - developing-eye-drops-can-reach-back-eye.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Phds - Developing-eye-drops-can-reach-back-eye',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - phds - developing-eye-drops-can-reach-back-eye.
            Ask the following questions naturally in conversation:
            - What is the current standard treatment for wet age-related macular degeneration (AMD)?
            - What are the potential benefits of using eye drops with polymersomes for treating wet AMD?
            - How do polymersomes improve drug delivery to the back of the eye?`,
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

    saveSimulationResult('Research - Explore - Projects - Phds - Developing-eye-drops-can-reach-back-eye', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Phds - Developing-new-anti-complement-drugs-for-dry-amd', async () => {
    const description =
      'User asking about research - explore - projects - phds - developing-new-anti-complement-drugs-for-dry-amd.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Phds - Developing-new-anti-complement-drugs-for-dry-amd',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - phds - developing-new-anti-complement-drugs-for-dry-amd.
            Ask the following questions naturally in conversation:
            - What is the main goal of Dr. Wioleta Zelek's research project?
            - How does the complement system contribute to age-related macular degeneration (AMD)?
            - What is the membrane attack complex (MAC) and its role in AMD?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must be within scope, providing informational content only.',
            'The response 'the source text does not provide enough information' is valid when applicable.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Research - Explore - Projects - Phds - Developing-new-anti-complement-drugs-for-dry-amd', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Phds - Finding-new-test-early-amd', async () => {
    const description =
      'User asking about research - explore - projects - phds - finding-new-test-early-amd.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Phds - Finding-new-test-early-amd',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - phds - finding-new-test-early-amd.
            Ask the following questions naturally in conversation:
            - What is the main focus of Dr. Ashley Wood's research at Cardiff University?
            - Why is early detection of age-related macular degeneration important?
            - What specific aspect of vision does the research focus on in relation to early AMD?`,
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

    saveSimulationResult('Research - Explore - Projects - Phds - Finding-new-test-early-amd', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Phds - Gene-editing-for-stargardt-disease', async () => {
    const description =
      'User asking about research - explore - projects - phds - gene-editing-for-stargardt-disease.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Phds - Gene-editing-for-stargardt-disease',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - phds - gene-editing-for-stargardt-disease.
            Ask the following questions naturally in conversation:
            - What is Stargardt disease and what causes it?
            - How does the gene editing approach aim to address Stargardt disease?
            - What role do retinal organoids play in the research conducted by Professor MacLaren's team?`,
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

    saveSimulationResult('Research - Explore - Projects - Phds - Gene-editing-for-stargardt-disease', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Phds - Gene-editing-stargardt-disease', async () => {
    const description =
      'User asking about research - explore - projects - phds - gene-editing-stargardt-disease.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Phds - Gene-editing-stargardt-disease',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - phds - gene-editing-stargardt-disease.
            Ask the following questions naturally in conversation:
            - What is Stargardt disease and how does it affect vision?
            - What gene mutation causes Stargardt disease?
            - What is the current status of treatments available for Stargardt disease?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must be within scope, providing only informational content.',
            'Accept 'the source text does not provide enough information' as a valid response when applicable.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Research - Explore - Projects - Phds - Gene-editing-stargardt-disease', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Phds - Improving-integration-stem-cell-transplants-retina', async () => {
    const description =
      'User asking about research - explore - projects - phds - improving-integration-stem-cell-transplants-retina.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Phds - Improving-integration-stem-cell-transplants-retina',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - phds - improving-integration-stem-cell-transplants-retina.
            Ask the following questions naturally in conversation:
            - What is the main focus of stem cell therapy in treating macular disease?
            - Who is leading the project on stem cell therapy for macular disease at University College London?
            - What are the challenges faced in integrating transplanted photoreceptors into the retina?`,
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

    saveSimulationResult('Research - Explore - Projects - Phds - Improving-integration-stem-cell-transplants-retina', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Phds - Investigating-a-possible-gene-therapy-for-dry-amd', async () => {
    const description =
      'User asking about research - explore - projects - phds - investigating-a-possible-gene-therapy-for-dry-amd.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Phds - Investigating-a-possible-gene-therapy-for-dry-amd',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - phds - investigating-a-possible-gene-therapy-for-dry-amd.
            Ask the following questions naturally in conversation:
            - What is the role of the retinal pigment epithelium (RPE) in vision?
            - What is the focus of Professor Karl Matter's research on dry AMD?
            - How does the molecule Dbl3 contribute to RPE health?`,
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

    saveSimulationResult('Research - Explore - Projects - Phds - Investigating-a-possible-gene-therapy-for-dry-amd', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Phds - Investigating-how-eye-doctors-discuss-amd-patients', async () => {
    const description =
      'User asking about research - explore - projects - phds - investigating-how-eye-doctors-discuss-amd-patients.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Phds - Investigating-how-eye-doctors-discuss-amd-patients',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - phds - investigating-how-eye-doctors-discuss-amd-patients.
            Ask the following questions naturally in conversation:
            - What was the main goal of Dr. Tamsin Callaghan's project at City, University of London?
            - Why might patients with dry AMD feel discouraged according to the project findings?
            - What types of surveys were conducted in the project?`,
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

    saveSimulationResult('Research - Explore - Projects - Phds - Investigating-how-eye-doctors-discuss-amd-patients', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Phds - Investigating-stargardt-disease-as-a-target-for-gene-repair', async () => {
    const description =
      'User asking about research - explore - projects - phds - investigating-stargardt-disease-as-a-target-for-gene-repair.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Phds - Investigating-stargardt-disease-as-a-target-for-gene-repair',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - phds - investigating-stargardt-disease-as-a-target-for-gene-repair.
            Ask the following questions naturally in conversation:
            - What is the primary cause of Stargardt disease?
            - Who is leading the project on gene editing for Stargardt disease?
            - What is the goal of the project led by Professor Jacqueline van der Spuy?`,
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

    saveSimulationResult('Research - Explore - Projects - Phds - Investigating-stargardt-disease-as-a-target-for-gene-repair', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Phds - Mutations-cfi-gene-which-are-harmless-or-harmful', async () => {
    const description =
      'User asking about research - explore - projects - phds - mutations-cfi-gene-which-are-harmless-or-harmful.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Phds - Mutations-cfi-gene-which-are-harmless-or-harmful',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - phds - mutations-cfi-gene-which-are-harmless-or-harmful.
            Ask the following questions naturally in conversation:
            - What is the main focus of Professor David Kavanagh's research project at Newcastle University?
            - How do mutations in the CFI gene relate to age-related macular disease?
            - What role does the Complement regulatory protein factor I (CFI) play in AMD?`,
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

    saveSimulationResult('Research - Explore - Projects - Phds - Mutations-cfi-gene-which-are-harmless-or-harmful', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Phds - New-form-gene-editing-macular-dystrophies', async () => {
    const description =
      'User asking about research - explore - projects - phds - new-form-gene-editing-macular-dystrophies.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Phds - New-form-gene-editing-macular-dystrophies',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - phds - new-form-gene-editing-macular-dystrophies.
            Ask the following questions naturally in conversation:
            - What is CRISPR-activation (CRISPR-a) and how does it differ from traditional gene editing methods?
            - What are the potential benefits of CRISPR-a for patients with macular dystrophies?
            - Which genes are currently being targeted by CRISPR-a in the research conducted by Dr. Forbes Manson?`,
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

    saveSimulationResult('Research - Explore - Projects - Phds - New-form-gene-editing-macular-dystrophies', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Phds - Real-life-costs-and-benefits-wearable-low-vision-aids', async () => {
    const description =
      'User asking about research - explore - projects - phds - real-life-costs-and-benefits-wearable-low-vision-aids.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Phds - Real-life-costs-and-benefits-wearable-low-vision-aids',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - phds - real-life-costs-and-benefits-wearable-low-vision-aids.
            Ask the following questions naturally in conversation:
            - What are Wearable Electronic Vision Enablement Systems (wEVES) and how do they work?
            - How does the effectiveness of wEVES compare to traditional low vision aids for individuals with macular disease?
            - What was the scope of the study conducted by Dr. Keziah Latham's team at Anglia Ruskin University?`,
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

    saveSimulationResult('Research - Explore - Projects - Phds - Real-life-costs-and-benefits-wearable-low-vision-aids', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Phds - Stopping-build-toxic-waste-dry-amd', async () => {
    const description =
      'User asking about research - explore - projects - phds - stopping-build-toxic-waste-dry-amd.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Phds - Stopping-build-toxic-waste-dry-amd',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - phds - stopping-build-toxic-waste-dry-amd.
            Ask the following questions naturally in conversation:
            - What is the role of lipofuscin in dry age-related macular degeneration (AMD)?
            - How does lysosomal dysfunction contribute to dry AMD?
            - What are the main goals of Dr. Ratnayaka's research on dry AMD?`,
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

    saveSimulationResult('Research - Explore - Projects - Phds - Stopping-build-toxic-waste-dry-amd', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Phds - Understanding-photopsia-and-photophobia-in-stargardt-disease', async () => {
    const description =
      'User asking about research - explore - projects - phds - understanding-photopsia-and-photophobia-in-stargardt-disease.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Phds - Understanding-photopsia-and-photophobia-in-stargardt-disease',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - phds - understanding-photopsia-and-photophobia-in-stargardt-disease.
            Ask the following questions naturally in conversation:
            - What are the common symptoms of Stargardt disease mentioned in the text?
            - How do the symptoms of Stargardt disease affect daily life?
            - What is the goal of Professor Omar Mahroo's research on Stargardt disease?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must remain within scope and be informational only.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Research - Explore - Projects - Phds - Understanding-photopsia-and-photophobia-in-stargardt-disease', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Phds - Understanding-rpgr-gene-function-in-cone-photoreceptors', async () => {
    const description =
      'User asking about research - explore - projects - phds - understanding-rpgr-gene-function-in-cone-photoreceptors.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Phds - Understanding-rpgr-gene-function-in-cone-photoreceptors',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - phds - understanding-rpgr-gene-function-in-cone-photoreceptors.
            Ask the following questions naturally in conversation:
            - What is the main focus of Dr. Roly Megaw's research at the University of Edinburgh?
            - What are the retinal diseases associated with mutations in the RPGR gene?
            - How do mutations in the RPGR gene affect vision?`,
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

    saveSimulationResult('Research - Explore - Projects - Phds - Understanding-rpgr-gene-function-in-cone-photoreceptors', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Phds - Wrong-place-wrong-time-protein-delivery-and-macular-disease', async () => {
    const description =
      'User asking about research - explore - projects - phds - wrong-place-wrong-time-protein-delivery-and-macular-disease.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Phds - Wrong-place-wrong-time-protein-delivery-and-macular-disease',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - phds - wrong-place-wrong-time-protein-delivery-and-macular-disease.
            Ask the following questions naturally in conversation:
            - What role does the TIMP-3 protein play in macular diseases?
            - How do mutations in the TIMP-3 gene affect retinal health?
            - What differences exist in TIMP-3 delivery between the retina and joints?`,
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

    saveSimulationResult('Research - Explore - Projects - Phds - Wrong-place-wrong-time-protein-delivery-and-macular-disease', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Research-grants - A-marvellous-new-approach-to-tackle-retinopathy', async () => {
    const description =
      'User asking about research - explore - projects - research-grants - a-marvellous-new-approach-to-tackle-retinopathy.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Research-grants - A-marvellous-new-approach-to-tackle-retinopathy',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - research-grants - a-marvellous-new-approach-to-tackle-retinopathy.
            Ask the following questions naturally in conversation:
            - What is the main focus of Professor Karl Matter's research on diabetic retinopathy?
            - How does MarvelD3 contribute to the protection of blood vessels in the eyes?
            - What techniques are being used in the research to study MarvelD3's role?`,
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

    saveSimulationResult('Research - Explore - Projects - Research-grants - A-marvellous-new-approach-to-tackle-retinopathy', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Research-grants - Artificial-intelligence-amd', async () => {
    const description =
      'User asking about research - explore - projects - research-grants - artificial-intelligence-amd.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Research-grants - Artificial-intelligence-amd',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - research-grants - artificial-intelligence-amd.
            Ask the following questions naturally in conversation:
            - What is the goal of the AI being developed by Professor Andrew Lotery's team?
            - How does wet AMD differ from dry AMD in terms of progression?
            - What was the purpose of the PINNACLE study?`,
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

    saveSimulationResult('Research - Explore - Projects - Research-grants - Artificial-intelligence-amd', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Research-grants - Creating-blood-test-detect-early-amd', async () => {
    const description =
      'User asking about research - explore - projects - research-grants - creating-blood-test-detect-early-amd.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Research-grants - Creating-blood-test-detect-early-amd',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - research-grants - creating-blood-test-detect-early-amd.
            Ask the following questions naturally in conversation:
            - What is the main goal of the project led by Professor Majlinda Lako?
            - How are patient skin cells used in the research on AMD?
            - What role do RPE exosomes play in age-related macular degeneration?`,
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

    saveSimulationResult('Research - Explore - Projects - Research-grants - Creating-blood-test-detect-early-amd', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Research-grants - Creating-wet-amd-drug-using-flower-compounds', async () => {
    const description =
      'User asking about research - explore - projects - research-grants - creating-wet-amd-drug-using-flower-compounds.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Research-grants - Creating-wet-amd-drug-using-flower-compounds',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - research-grants - creating-wet-amd-drug-using-flower-compounds.
            Ask the following questions naturally in conversation:
            - What are homoisoflavanoids and why are they being studied for wet age-related macular degeneration?
            - Why are current treatments for wet AMD considered costly and invasive?
            - What is the goal of developing a library of homoisoflavanoids?`,
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

    saveSimulationResult('Research - Explore - Projects - Research-grants - Creating-wet-amd-drug-using-flower-compounds', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Research-grants - Darkness-amd', async () => {
    const description =
      'User asking about research - explore - projects - research-grants - darkness-amd.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Research-grants - Darkness-amd',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - research-grants - darkness-amd.
            Ask the following questions naturally in conversation:
            - What is the primary goal of Dr. Alison Binns' research project?
            - How does the speed of dark adaptation vary among individuals with AMD?
            - What structural features of AMD are believed to influence dark adaptation?`,
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

    saveSimulationResult('Research - Explore - Projects - Research-grants - Darkness-amd', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Research-grants - Developing-an-eye-drop-to-treat-dry-age-related-macular-degeneration', async () => {
    const description =
      'User asking about research - explore - projects - research-grants - developing-an-eye-drop-to-treat-dry-age-related-macular-degeneration.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Research-grants - Developing-an-eye-drop-to-treat-dry-age-related-macular-degeneration',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - research-grants - developing-an-eye-drop-to-treat-dry-age-related-macular-degeneration.
            Ask the following questions naturally in conversation:
            - What is the main goal of the eye drop treatment being developed by Dr. Lisa Hill's team?
            - What is dry age-related macular degeneration (AMD) and what are its effects?
            - Why is there a need for a new treatment for dry AMD in the UK?`,
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

    saveSimulationResult('Research - Explore - Projects - Research-grants - Developing-an-eye-drop-to-treat-dry-age-related-macular-degeneration', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Research-grants - Early-changes-amd', async () => {
    const description =
      'User asking about research - explore - projects - research-grants - early-changes-amd.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Research-grants - Early-changes-amd',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - research-grants - early-changes-amd.
            Ask the following questions naturally in conversation:
            - What is the main focus of Dr. Richard Unwin's research at The University of Manchester?
            - How do genetic risk factors influence the structure of the eye before AMD symptoms appear?
            - What previous findings have been made regarding individuals with high genetic risk for AMD?`,
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

    saveSimulationResult('Research - Explore - Projects - Research-grants - Early-changes-amd', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Research-grants - Finding-early-amd-changes-using-eye-scans', async () => {
    const description =
      'User asking about research - explore - projects - research-grants - finding-early-amd-changes-using-eye-scans.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Research-grants - Finding-early-amd-changes-using-eye-scans',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - research-grants - finding-early-amd-changes-using-eye-scans.
            Ask the following questions naturally in conversation:
            - What is the main goal of Dr. Ruth Hogg's project at Queen's University Belfast?
            - What data source is being used for the study on age-related macular degeneration?
            - How many participants are involved in the NICOLA study related to AMD?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must remain within scope and be informational only.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Research - Explore - Projects - Research-grants - Finding-early-amd-changes-using-eye-scans', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Research-grants - Folding-correction-for-stargardt-disease', async () => {
    const description =
      'User asking about research - explore - projects - research-grants - folding-correction-for-stargardt-disease.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Research-grants - Folding-correction-for-stargardt-disease',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - research-grants - folding-correction-for-stargardt-disease.
            Ask the following questions naturally in conversation:
            - What causes Stargardt disease?
            - How do mutations in the ABCA4 gene affect vision?
            - What is the role of ABCA4 proteins in the eye?`,
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

    saveSimulationResult('Research - Explore - Projects - Research-grants - Folding-correction-for-stargardt-disease', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Research-grants - Helping-keep-mitochondria-healthy-keep-macula-cells-alive', async () => {
    const description =
      'User asking about research - explore - projects - research-grants - helping-keep-mitochondria-healthy-keep-macula-cells-alive.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Research-grants - Helping-keep-mitochondria-healthy-keep-macula-cells-alive',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - research-grants - helping-keep-mitochondria-healthy-keep-macula-cells-alive.
            Ask the following questions naturally in conversation:
            - What is the main focus of Professor Andrew Dick's research project?
            - Why are IRAK-M and IL-33 molecules important in the study of AMD?
            - How does damage to mitochondria in RPE cells affect AMD progression?`,
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

    saveSimulationResult('Research - Explore - Projects - Research-grants - Helping-keep-mitochondria-healthy-keep-macula-cells-alive', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Research-grants - How-do-ageing-mitochondria-work-and-communicate-differently', async () => {
    const description =
      'User asking about research - explore - projects - research-grants - how-do-ageing-mitochondria-work-and-communicate-differently.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Research-grants - How-do-ageing-mitochondria-work-and-communicate-differently',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - research-grants - how-do-ageing-mitochondria-work-and-communicate-differently.
            Ask the following questions naturally in conversation:
            - What is the main focus of Prof. Luminita Paraoan's research?
            - Why are mitochondria important in the context of age-related macular degeneration?
            - What happens to the retinal pigment epithelium (RPE) as mitochondria age and incur damage?`,
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

    saveSimulationResult('Research - Explore - Projects - Research-grants - How-do-ageing-mitochondria-work-and-communicate-differently', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Research-grants - Implantable-eye-lens-macular-disease', async () => {
    const description =
      'User asking about research - explore - projects - research-grants - implantable-eye-lens-macular-disease.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Research-grants - Implantable-eye-lens-macular-disease',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - research-grants - implantable-eye-lens-macular-disease.
            Ask the following questions naturally in conversation:
            - What is the main objective of the clinical trial led by Dr. Giuliana Silvestri?
            - How many patients are involved in the clinical trial for magnifying intraocular lens implants?
            - What are the comparison groups in the clinical trial?`,
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

    saveSimulationResult('Research - Explore - Projects - Research-grants - Implantable-eye-lens-macular-disease', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Research-grants - Improving-support-services-teenagers-macular-disease', async () => {
    const description =
      'User asking about research - explore - projects - research-grants - improving-support-services-teenagers-macular-disease.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Research-grants - Improving-support-services-teenagers-macular-disease',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - research-grants - improving-support-services-teenagers-macular-disease.
            Ask the following questions naturally in conversation:
            - What is the primary goal of Dr. Michael Crossland's project at UCL and Moorfields Eye Hospital?
            - What challenges do teenagers with macular disease face?
            - Why are current support services for teenagers with macular disease considered inadequate?`,
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

    saveSimulationResult('Research - Explore - Projects - Research-grants - Improving-support-services-teenagers-macular-disease', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Research-grants - Investigating-early-onset-macular-degeneration', async () => {
    const description =
      'User asking about research - explore - projects - research-grants - investigating-early-onset-macular-degeneration.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Research-grants - Investigating-early-onset-macular-degeneration',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - research-grants - investigating-early-onset-macular-degeneration.
            Ask the following questions naturally in conversation:
            - What is early onset macular degeneration (EOMD) and how does it differ from age-related macular degeneration (AMD)?
            - What role does the CFH gene play in early onset macular degeneration?
            - How might the discovery of the FHL-1 protein impact genetic testing for EOMD?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must remain within scope, providing informational content only.',
            'Accept 'the source text does not provide enough information' as a valid response when applicable.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Research - Explore - Projects - Research-grants - Investigating-early-onset-macular-degeneration', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Research-grants - Investigating-factors-involved-rate-amd-progression', async () => {
    const description =
      'User asking about research - explore - projects - research-grants - investigating-factors-involved-rate-amd-progression.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Research-grants - Investigating-factors-involved-rate-amd-progression',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - research-grants - investigating-factors-involved-rate-amd-progression.
            Ask the following questions naturally in conversation:
            - What is the main goal of Professor Adam Dubis's research project on age-related macular degeneration?
            - How does the research project plan to use artificial intelligence in studying AMD?
            - Why is it important to identify genetic links to AMD progression?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must be within scope, providing informational content only.',
            'The response 'the source text does not provide enough information' is valid when applicable.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Research - Explore - Projects - Research-grants - Investigating-factors-involved-rate-amd-progression', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Research-grants - Maintaining-the-health-of-the-blood-vessels-in-the-macula', async () => {
    const description =
      'User asking about research - explore - projects - research-grants - maintaining-the-health-of-the-blood-vessels-in-the-macula.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Research-grants - Maintaining-the-health-of-the-blood-vessels-in-the-macula',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - research-grants - maintaining-the-health-of-the-blood-vessels-in-the-macula.
            Ask the following questions naturally in conversation:
            - What is the main goal of the project led by Professor Majlinda Lako at Newcastle University?
            - How does age-related macular degeneration (AMD) affect vision?
            - What role do choroid endothelial cells play in the health of the macula?`,
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

    saveSimulationResult('Research - Explore - Projects - Research-grants - Maintaining-the-health-of-the-blood-vessels-in-the-macula', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Research-grants - Manchester-eye-tissue-repository-genome-transcriptome-project', async () => {
    const description =
      'User asking about research - explore - projects - research-grants - manchester-eye-tissue-repository-genome-transcriptome-project.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Research-grants - Manchester-eye-tissue-repository-genome-transcriptome-project',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - research-grants - manchester-eye-tissue-repository-genome-transcriptome-project.
            Ask the following questions naturally in conversation:
            - What is the primary goal of the Manchester Eye Tissue Repository Genome-Transcriptome Project?
            - Who is leading the Manchester Eye Tissue Repository Genome-Transcriptome Project?
            - How much funding has been allocated to the Manchester Eye Tissue Repository Genome-Transcriptome Project?`,
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

    saveSimulationResult('Research - Explore - Projects - Research-grants - Manchester-eye-tissue-repository-genome-transcriptome-project', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Research-grants - New-treatment-option-wet-amd', async () => {
    const description =
      'User asking about research - explore - projects - research-grants - new-treatment-option-wet-amd.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Research-grants - New-treatment-option-wet-amd',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - research-grants - new-treatment-option-wet-amd.
            Ask the following questions naturally in conversation:
            - What is the current standard treatment for wet age-related macular degeneration (AMD)?
            - Who is leading the research on the new treatment option for wet AMD?
            - What is the role of syndecan-3 in the treatment of wet AMD?`,
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

    saveSimulationResult('Research - Explore - Projects - Research-grants - New-treatment-option-wet-amd', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Research-grants - Protecting-damaged-blood-vessels-back-eye', async () => {
    const description =
      'User asking about research - explore - projects - research-grants - protecting-damaged-blood-vessels-back-eye.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Research-grants - Protecting-damaged-blood-vessels-back-eye',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - research-grants - protecting-damaged-blood-vessels-back-eye.
            Ask the following questions naturally in conversation:
            - What is the main focus of Professor Reinhold Medina's research project?
            - How does the choriocapillaris change with age, particularly in individuals with dry AMD?
            - What is the research project trying to determine about vascular damage and AMD?`,
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

    saveSimulationResult('Research - Explore - Projects - Research-grants - Protecting-damaged-blood-vessels-back-eye', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Research-grants - Shining-new-light-on-the-body-clock-and-retinopathy', async () => {
    const description =
      'User asking about research - explore - projects - research-grants - shining-new-light-on-the-body-clock-and-retinopathy.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Research-grants - Shining-new-light-on-the-body-clock-and-retinopathy',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - research-grants - shining-new-light-on-the-body-clock-and-retinopathy.
            Ask the following questions naturally in conversation:
            - What is diabetic retinopathy and how is it related to high blood sugar levels?
            - How does Dr. Beli's research plan to investigate the role of the eye's internal clock in retinopathy?
            - What is the significance of using mice models in this research?`,
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

    saveSimulationResult('Research - Explore - Projects - Research-grants - Shining-new-light-on-the-body-clock-and-retinopathy', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Research-grants - Switching-off-the-genes-that-cause-best-disease', async () => {
    const description =
      'User asking about research - explore - projects - research-grants - switching-off-the-genes-that-cause-best-disease.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Research-grants - Switching-off-the-genes-that-cause-best-disease',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - research-grants - switching-off-the-genes-that-cause-best-disease.
            Ask the following questions naturally in conversation:
            - What causes Best disease and how does it affect vision?
            - How is Best disease inherited?
            - Are there any treatments currently available for Best disease?`,
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

    saveSimulationResult('Research - Explore - Projects - Research-grants - Switching-off-the-genes-that-cause-best-disease', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Research-grants - Testing-therapies-reduce-severity-visual-hallucinations', async () => {
    const description =
      'User asking about research - explore - projects - research-grants - testing-therapies-reduce-severity-visual-hallucinations.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Research-grants - Testing-therapies-reduce-severity-visual-hallucinations',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - research-grants - testing-therapies-reduce-severity-visual-hallucinations.
            Ask the following questions naturally in conversation:
            - What is Charles Bonnet Syndrome and how does it affect individuals?
            - What are the two therapies being tested in the study for Charles Bonnet Syndrome?
            - How does eye movement therapy aim to reduce hallucinations in CBS patients?`,
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

    saveSimulationResult('Research - Explore - Projects - Research-grants - Testing-therapies-reduce-severity-visual-hallucinations', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Research-grants - Turning-faulty-genes-treat-macular-dystrophy', async () => {
    const description =
      'User asking about research - explore - projects - research-grants - turning-faulty-genes-treat-macular-dystrophy.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Research-grants - Turning-faulty-genes-treat-macular-dystrophy',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - research-grants - turning-faulty-genes-treat-macular-dystrophy.
            Ask the following questions naturally in conversation:
            - What is Doyne honeycomb dystrophy and how does it affect vision?
            - Are there any current treatments available for Doyne honeycomb dystrophy?
            - What is the role of antisense oligonucleotide (ASO) therapy in treating Doyne honeycomb dystrophy?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must remain within the informational scope provided by the text.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Research - Explore - Projects - Research-grants - Turning-faulty-genes-treat-macular-dystrophy', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Research-grants - Understanding-abca4-and-predicting-future', async () => {
    const description =
      'User asking about research - explore - projects - research-grants - understanding-abca4-and-predicting-future.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Research-grants - Understanding-abca4-and-predicting-future',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - research-grants - understanding-abca4-and-predicting-future.
            Ask the following questions naturally in conversation:
            - What gene is linked to macular dystrophies like Stargardt disease?
            - Why is genetic diagnosis of macular dystrophies complicated?
            - What did Professor Andrew Webster's team discover about ABCA4 variants?`,
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

    saveSimulationResult('Research - Explore - Projects - Research-grants - Understanding-abca4-and-predicting-future', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Research-grants - Understanding-new-stress-response-pathway-involved-amd', async () => {
    const description =
      'User asking about research - explore - projects - research-grants - understanding-new-stress-response-pathway-involved-amd.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Research-grants - Understanding-new-stress-response-pathway-involved-amd',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - research-grants - understanding-new-stress-response-pathway-involved-amd.
            Ask the following questions naturally in conversation:
            - What is the focus of Professor Maria Balda's research at University College London?
            - How does the retinal pigment epithelium (RPE) relate to age-related macular degeneration (AMD)?
            - What is the Apg-2 pathway and its significance in AMD?`,
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

    saveSimulationResult('Research - Explore - Projects - Research-grants - Understanding-new-stress-response-pathway-involved-amd', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Research-grants - Using-artificial-intelligence-predict-amd-progression', async () => {
    const description =
      'User asking about research - explore - projects - research-grants - using-artificial-intelligence-predict-amd-progression.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Research-grants - Using-artificial-intelligence-predict-amd-progression',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - research-grants - using-artificial-intelligence-predict-amd-progression.
            Ask the following questions naturally in conversation:
            - What is the main goal of the project led by Pearse Keane at UCL and Moorfields Eye Hospital?
            - What specific type of age-related macular degeneration does the project focus on?
            - How did the researchers analyze the progression of wet AMD in the study?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must be within scope, providing informational content only.',
            'The response 'the source text does not provide enough information' is valid when applicable.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Research - Explore - Projects - Research-grants - Using-artificial-intelligence-predict-amd-progression', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Research-grants - Using-data-science-diagnose-amd-sooner-and-detect-change-over-ti', async () => {
    const description =
      'User asking about research - explore - projects - research-grants - using-data-science-diagnose-amd-sooner-and-detect-change-over-ti.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Research-grants - Using-data-science-diagnose-amd-sooner-and-detect-change-over-ti',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - research-grants - using-data-science-diagnose-amd-sooner-and-detect-change-over-ti.
            Ask the following questions naturally in conversation:
            - What is the primary goal of Dr. Ruth Hogg's research on age-related macular degeneration (AMD)?
            - What kind of data is being analyzed in the NICOLA study related to AMD?
            - How might Dr. Hogg's research contribute to the treatment of AMD?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must be within scope, providing informational content only.',
            'The response 'the source text does not provide enough information' is valid when applicable.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Research - Explore - Projects - Research-grants - Using-data-science-diagnose-amd-sooner-and-detect-change-over-ti', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Research-grants - Using-technology-aid-functional-vision', async () => {
    const description =
      'User asking about research - explore - projects - research-grants - using-technology-aid-functional-vision.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Research-grants - Using-technology-aid-functional-vision',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - research-grants - using-technology-aid-functional-vision.
            Ask the following questions naturally in conversation:
            - What is eccentric viewing and why is it used by individuals with macular disease?
            - How does Contrast Polarity Reversal (CPR) improve visual performance?
            - In what situations did CPR not enhance visual performance according to the study?`,
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

    saveSimulationResult('Research - Explore - Projects - Research-grants - Using-technology-aid-functional-vision', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Research-grants - Virtual-visually-impaired-rehabilitation-assistant', async () => {
    const description =
      'User asking about research - explore - projects - research-grants - virtual-visually-impaired-rehabilitation-assistant.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Research-grants - Virtual-visually-impaired-rehabilitation-assistant',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - research-grants - virtual-visually-impaired-rehabilitation-assistant.
            Ask the following questions naturally in conversation:
            - What is the main purpose of the virtual rehabilitation assistant developed by Professor Chris Dickinson?
            - How was the development of the virtual assistant informed by individuals with visual impairments?
            - What were the reported experiences of participants who tested the prototype of the virtual assistant?`,
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

    saveSimulationResult('Research - Explore - Projects - Research-grants - Virtual-visually-impaired-rehabilitation-assistant', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Seedcorn-projects - Combining-gene-editing-and-anti-inflammatory-therapy-to-treat-dry-amd', async () => {
    const description =
      'User asking about research - explore - projects - seedcorn-projects - combining-gene-editing-and-anti-inflammatory-therapy-to-treat-dry-amd.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Seedcorn-projects - Combining-gene-editing-and-anti-inflammatory-therapy-to-treat-dry-amd',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - seedcorn-projects - combining-gene-editing-and-anti-inflammatory-therapy-to-treat-dry-amd.
            Ask the following questions naturally in conversation:
            - What is the main focus of the research conducted by the University of Bristol on dry age-related macular degeneration?
            - What are the two components of the treatment strategy being studied for dry AMD?
            - Why is the production of IRAK-M important in the context of retinal health?`,
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

    saveSimulationResult('Research - Explore - Projects - Seedcorn-projects - Combining-gene-editing-and-anti-inflammatory-therapy-to-treat-dry-amd', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Seedcorn-projects - Creating-a-new-laboratory-macular-model', async () => {
    const description =
      'User asking about research - explore - projects - seedcorn-projects - creating-a-new-laboratory-macular-model.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Seedcorn-projects - Creating-a-new-laboratory-macular-model',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - seedcorn-projects - creating-a-new-laboratory-macular-model.
            Ask the following questions naturally in conversation:
            - What is the primary focus of Professor Rachael Pearson's project at the KCL Centre for Gene Therapy & Regenerative Medicine?
            - Why is the macula important for vision?
            - What technique was used to map gene activity in the macula?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must remain within the informational scope provided by the source text.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Research - Explore - Projects - Seedcorn-projects - Creating-a-new-laboratory-macular-model', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Seedcorn-projects - Developing-new-visual-tests-to-monitor-macular-disease', async () => {
    const description =
      'User asking about research - explore - projects - seedcorn-projects - developing-new-visual-tests-to-monitor-macular-disease.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Seedcorn-projects - Developing-new-visual-tests-to-monitor-macular-disease',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - seedcorn-projects - developing-new-visual-tests-to-monitor-macular-disease.
            Ask the following questions naturally in conversation:
            - What is the main goal of Dr. Richard Leadbeater's project at the University of Leicester?
            - How do the new visual tests differ from the current tools like the Amsler grid?
            - What potential benefits could the new visual tests offer for patients with macular disease?`,
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

    saveSimulationResult('Research - Explore - Projects - Seedcorn-projects - Developing-new-visual-tests-to-monitor-macular-disease', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Seedcorn-projects - How-the-genetics-of-fat-metabolism-influence-amd-development', async () => {
    const description =
      'User asking about research - explore - projects - seedcorn-projects - how-the-genetics-of-fat-metabolism-influence-amd-development.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Seedcorn-projects - How-the-genetics-of-fat-metabolism-influence-amd-development',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - seedcorn-projects - how-the-genetics-of-fat-metabolism-influence-amd-development.
            Ask the following questions naturally in conversation:
            - What is the role of the APOE gene in the body?
            - How does the APOE2 variant potentially affect lipid metabolism?
            - What is the focus of Dr. Samantha de Silva's research?`,
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

    saveSimulationResult('Research - Explore - Projects - Seedcorn-projects - How-the-genetics-of-fat-metabolism-influence-amd-development', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Seedcorn-projects - Impact-misaligned-daily-light-cycles-development-diabetic-retino', async () => {
    const description =
      'User asking about research - explore - projects - seedcorn-projects - impact-misaligned-daily-light-cycles-development-diabetic-retino.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Seedcorn-projects - Impact-misaligned-daily-light-cycles-development-diabetic-retino',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - seedcorn-projects - impact-misaligned-daily-light-cycles-development-diabetic-retino.
            Ask the following questions naturally in conversation:
            - What is diabetic retinopathy and how does it affect the eyes?
            - What are the current limitations of treatments for diabetic retinopathy?
            - How do circadian rhythm disruptions potentially impact the progression of diabetic retinopathy?`,
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

    saveSimulationResult('Research - Explore - Projects - Seedcorn-projects - Impact-misaligned-daily-light-cycles-development-diabetic-retino', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Seedcorn-projects - Improving-reading-aids-for-those-with-macular-conditions', async () => {
    const description =
      'User asking about research - explore - projects - seedcorn-projects - improving-reading-aids-for-those-with-macular-conditions.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Seedcorn-projects - Improving-reading-aids-for-those-with-macular-conditions',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - seedcorn-projects - improving-reading-aids-for-those-with-macular-conditions.
            Ask the following questions naturally in conversation:
            - What is the main goal of Dr. Dirk Seidel's project?
            - How does macular damage affect the natural scanning process of the eye?
            - What are the limitations of current methods like eccentric viewing and steady eye strategy techniques?`,
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

    saveSimulationResult('Research - Explore - Projects - Seedcorn-projects - Improving-reading-aids-for-those-with-macular-conditions', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Seedcorn-projects - Improving-wet-amd-care-through-patient-experience', async () => {
    const description =
      'User asking about research - explore - projects - seedcorn-projects - improving-wet-amd-care-through-patient-experience.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Seedcorn-projects - Improving-wet-amd-care-through-patient-experience',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - seedcorn-projects - improving-wet-amd-care-through-patient-experience.
            Ask the following questions naturally in conversation:
            - What is the primary goal of the study led by Mr. Martin McKibbin?
            - How does the study plan to improve the delivery of care for wet AMD patients?
            - What aspects of patient feedback are being captured by the PREM for wet AMD?`,
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

    saveSimulationResult('Research - Explore - Projects - Seedcorn-projects - Improving-wet-amd-care-through-patient-experience', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Seedcorn-projects - Investigating-the-genetic-roots-of-hydroxychloroquine-hcq-retinopathy', async () => {
    const description =
      'User asking about research - explore - projects - seedcorn-projects - investigating-the-genetic-roots-of-hydroxychloroquine-hcq-retinopathy.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Seedcorn-projects - Investigating-the-genetic-roots-of-hydroxychloroquine-hcq-retinopathy',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - seedcorn-projects - investigating-the-genetic-roots-of-hydroxychloroquine-hcq-retinopathy.
            Ask the following questions naturally in conversation:
            - What is the main goal of Professor Susan Downes' project at Oxford University?
            - Why is the current NHS screening method for HCQ retinopathy considered limited?
            - How many individuals' genomes are being compared in the research study?`,
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

    saveSimulationResult('Research - Explore - Projects - Seedcorn-projects - Investigating-the-genetic-roots-of-hydroxychloroquine-hcq-retinopathy', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Seedcorn-projects - Investigating-the-genetics-of-cone-dystrophy', async () => {
    const description =
      'User asking about research - explore - projects - seedcorn-projects - investigating-the-genetics-of-cone-dystrophy.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Seedcorn-projects - Investigating-the-genetics-of-cone-dystrophy',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - seedcorn-projects - investigating-the-genetics-of-cone-dystrophy.
            Ask the following questions naturally in conversation:
            - What is cone dystrophy and how does it affect vision?
            - Which gene is commonly associated with cone dystrophy?
            - How do mutations in the RPGR gene specifically affect cone photoreceptors?`,
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

    saveSimulationResult('Research - Explore - Projects - Seedcorn-projects - Investigating-the-genetics-of-cone-dystrophy', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Seedcorn-projects - Looking-at-the-connection-between-proline-transport-and-macular-health', async () => {
    const description =
      'User asking about research - explore - projects - seedcorn-projects - looking-at-the-connection-between-proline-transport-and-macular-health.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Seedcorn-projects - Looking-at-the-connection-between-proline-transport-and-macular-health',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - seedcorn-projects - looking-at-the-connection-between-proline-transport-and-macular-health.
            Ask the following questions naturally in conversation:
            - What is the role of proline in macular health?
            - How does the SIT-1 transporter protein affect proline movement in the retina?
            - What are the potential consequences of mutations in the SIT-1 gene?`,
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

    saveSimulationResult('Research - Explore - Projects - Seedcorn-projects - Looking-at-the-connection-between-proline-transport-and-macular-health', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Seedcorn-projects - Multi-dimensional-imaging-in-early-amd', async () => {
    const description =
      'User asking about research - explore - projects - seedcorn-projects - multi-dimensional-imaging-in-early-amd.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Seedcorn-projects - Multi-dimensional-imaging-in-early-amd',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - seedcorn-projects - multi-dimensional-imaging-in-early-amd.
            Ask the following questions naturally in conversation:
            - What is the role of the complement system in early age-related macular degeneration (AMD)?
            - How does imaging mass cytometry work in the study of AMD?
            - Who is Dr. Richard Unwin and what is his contribution to AMD research?`,
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

    saveSimulationResult('Research - Explore - Projects - Seedcorn-projects - Multi-dimensional-imaging-in-early-amd', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Seedcorn-projects - Role-protein-abcc5-diabetic-macular-oedema', async () => {
    const description =
      'User asking about research - explore - projects - seedcorn-projects - role-protein-abcc5-diabetic-macular-oedema.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Seedcorn-projects - Role-protein-abcc5-diabetic-macular-oedema',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - seedcorn-projects - role-protein-abcc5-diabetic-macular-oedema.
            Ask the following questions naturally in conversation:
            - What is the role of ABCC5 in diabetic macular oedema (DMO)?
            - How does diabetic retinopathy lead to vision loss?
            - What substances does ABCC5 transport in the retina?`,
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

    saveSimulationResult('Research - Explore - Projects - Seedcorn-projects - Role-protein-abcc5-diabetic-macular-oedema', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Seedcorn-projects - Studying-retinal-ageing-in-a-rapidly-ageing-fish', async () => {
    const description =
      'User asking about research - explore - projects - seedcorn-projects - studying-retinal-ageing-in-a-rapidly-ageing-fish.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Seedcorn-projects - Studying-retinal-ageing-in-a-rapidly-ageing-fish',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - seedcorn-projects - studying-retinal-ageing-in-a-rapidly-ageing-fish.
            Ask the following questions naturally in conversation:
            - What makes the African turquoise killifish a suitable model for studying age-related macular degeneration (AMD)?
            - What specific retinal changes are observed in the African turquoise killifish that are similar to those in humans with AMD?
            - How does RNA sequencing contribute to the study of retinal ageing and AMD in the research?`,
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

    saveSimulationResult('Research - Explore - Projects - Seedcorn-projects - Studying-retinal-ageing-in-a-rapidly-ageing-fish', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Seedcorn-projects - The-zebrafishs-high-acuity-zone-as-a-novel-model-for-the-human-m', async () => {
    const description =
      'User asking about research - explore - projects - seedcorn-projects - the-zebrafishs-high-acuity-zone-as-a-novel-model-for-the-human-m.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Seedcorn-projects - The-zebrafishs-high-acuity-zone-as-a-novel-model-for-the-human-m',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - seedcorn-projects - the-zebrafishs-high-acuity-zone-as-a-novel-model-for-the-human-m.
            Ask the following questions naturally in conversation:
            - What challenges does research into macular disease face?
            - What new model has Dr. Takeshi Yoshimatsu's team identified for studying macular disease?
            - How was single-cell RNA-sequencing used in the study of zebrafish retina cells?`,
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

    saveSimulationResult('Research - Explore - Projects - Seedcorn-projects - The-zebrafishs-high-acuity-zone-as-a-novel-model-for-the-human-m', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects - Seedcorn-projects - Using-gene-therapy-to-investigate-the-pathways-involved-in-amd-progression', async () => {
    const description =
      'User asking about research - explore - projects - seedcorn-projects - using-gene-therapy-to-investigate-the-pathways-involved-in-amd-progression.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects - Seedcorn-projects - Using-gene-therapy-to-investigate-the-pathways-involved-in-amd-progression',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects - seedcorn-projects - using-gene-therapy-to-investigate-the-pathways-involved-in-amd-progression.
            Ask the following questions naturally in conversation:
            - What is the main goal of Dr. Ioan Matei's research project at Edgehill University?
            - How does the research project intend to use CRISPR Cas-9 gene editing?
            - What role does the retinal pigment epithelium (RPE) play in the eye?`,
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

    saveSimulationResult('Research - Explore - Projects - Seedcorn-projects - Using-gene-therapy-to-investigate-the-pathways-involved-in-amd-progression', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore - Projects', async () => {
    const description =
      'User asking about research - explore - projects.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore - Projects',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore - projects.
            Ask the following questions naturally in conversation:
            - What types of funding does the Macular Society provide for research?
            - What is the focus of the research on Stargardt Disease at Cardiff University?
            - How does the research on Age-related Macular Degeneration (AMD) aim to identify early changes?`,
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

    saveSimulationResult('Research - Explore - Projects', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Explore', async () => {
    const description =
      'User asking about research - explore.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Explore',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - explore.
            Ask the following questions naturally in conversation:
            - What is the main goal of the Macular Society's 2020-2030 Research Strategy?
            - How much has the Macular Society invested in research projects since 1987?
            - What is the eccentric viewing technique mentioned in the text?`,
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

    saveSimulationResult('Research - Explore', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Features - Aspirin-risk', async () => {
    const description =
      'User asking about research - features - aspirin-risk.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Features - Aspirin-risk',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - features - aspirin-risk.
            Ask the following questions naturally in conversation:
            - What is the relationship between aspirin use and age-related macular degeneration (AMD) according to observational studies?
            - Why might observational studies suggest a link between aspirin use and AMD?
            - What do randomized controlled trials (RCTs) indicate about the risk of developing AMD with aspirin use?`,
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

    saveSimulationResult('Research - Features - Aspirin-risk', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Features - Report-finds-lack-of-support-for-sight-loss-due-to-diabetes', async () => {
    const description =
      'User asking about research - features - report-finds-lack-of-support-for-sight-loss-due-to-diabetes.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Features - Report-finds-lack-of-support-for-sight-loss-due-to-diabetes',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - features - report-finds-lack-of-support-for-sight-loss-due-to-diabetes.
            Ask the following questions naturally in conversation:
            - What is diabetic macular oedema (DMO) and how does it affect vision?
            - How many people in the UK are affected by diabetic macular oedema?
            - What percentage of newly diagnosed DMO patients felt adequately informed about their condition?`,
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

    saveSimulationResult('Research - Features - Report-finds-lack-of-support-for-sight-loss-due-to-diabetes', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Features - Report-reveals-burden-of-treatment-for-patients-with-wet-amd', async () => {
    const description =
      'User asking about research - features - report-reveals-burden-of-treatment-for-patients-with-wet-amd.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Features - Report-reveals-burden-of-treatment-for-patients-with-wet-amd',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - features - report-reveals-burden-of-treatment-for-patients-with-wet-amd.
            Ask the following questions naturally in conversation:
            - What is the main treatment for wet Age-related Macular Degeneration (AMD) mentioned in the survey?
            - How do patients generally feel about the anti-VEGF injections over time?
            - What logistical challenges do patients face when attending eye clinic appointments?`,
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

    saveSimulationResult('Research - Features - Report-reveals-burden-of-treatment-for-patients-with-wet-amd', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Features - Virtual-eye', async () => {
    const description =
      'User asking about research - features - virtual-eye.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Features - Virtual-eye',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - features - virtual-eye.
            Ask the following questions naturally in conversation:
            - What is the main goal of the 'virtual eye' project?
            - Who facilitated the first in-person meeting for the 'virtual eye' project?
            - What progress was highlighted by Dr. Peter Stewart during the meeting?`,
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

    saveSimulationResult('Research - Features - Virtual-eye', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Features', async () => {
    const description =
      'User asking about research - features.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Features',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - features.
            Ask the following questions naturally in conversation:
            - What is the purpose of developing a 'virtual eye' according to the Macular Society?
            - Is there a confirmed link between aspirin use and age-related macular degeneration (AMD)?
            - What issues do patients with diabetic macular oedema (DMO) face according to the 2021 survey?`,
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

    saveSimulationResult('Research - Features', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Get-involved - Foresight', async () => {
    const description =
      'User asking about research - get-involved - foresight.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Get-involved - Foresight',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - get-involved - foresight.
            Ask the following questions naturally in conversation:
            - What is the main goal of the Foresight project?
            - Who is leading the Foresight project?
            - How does the Foresight project plan to use AI in its research?`,
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

    saveSimulationResult('Research - Get-involved - Foresight', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Get-involved - Research-participant-database - Thank-you', async () => {
    const description =
      'User asking about research - get-involved - research-participant-database - thank-you.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Get-involved - Research-participant-database - Thank-you',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - get-involved - research-participant-database - thank-you.
            Ask the following questions naturally in conversation:
            - Why is patient participation important in research trials for macular disease?
            - What role does the Macular Society play in research for macular disease?
            - How can individuals stay informed about the latest research developments in macular disease?`,
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

    saveSimulationResult('Research - Get-involved - Research-participant-database - Thank-you', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Get-involved - Research-participant-database', async () => {
    const description =
      'User asking about research - get-involved - research-participant-database.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Get-involved - Research-participant-database',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - get-involved - research-participant-database.
            Ask the following questions naturally in conversation:
            - Who is eligible to join the macular disease research participant database?
            - What information is collected from participants for the research database?
            - Can participants opt out of the macular disease research database, and if so, how?`,
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

    saveSimulationResult('Research - Get-involved - Research-participant-database', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Get-involved - Share-your-experience', async () => {
    const description =
      'User asking about research - get-involved - share-your-experience.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Get-involved - Share-your-experience',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - get-involved - share-your-experience.
            Ask the following questions naturally in conversation:
            - What is the focus of the study conducted by University College London related to macular disease?
            - Who is eligible to participate in the study about the early stages of AMD development at Cardiff University?
            - What are the participation requirements for the study on writing with sight loss at Anglia Ruskin University?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must remain within scope and be informational only.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Research - Get-involved - Share-your-experience', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Get-involved - Take-part', async () => {
    const description =
      'User asking about research - get-involved - take-part.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Get-involved - Take-part',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - get-involved - take-part.
            Ask the following questions naturally in conversation:
            - What role do patients play in macular disease research?
            - What are the different ways patients can participate in macular disease research?
            - Are there age restrictions for participating in macular disease clinical trials?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must stay within the scope of informational content only.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Research - Get-involved - Take-part', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Get-involved', async () => {
    const description =
      'User asking about research - get-involved.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Get-involved',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - get-involved.
            Ask the following questions naturally in conversation:
            - What role do patients play in medical research related to macular disease?
            - How can individuals with macular disease contribute to research?
            - What types of activities might research participants be involved in?`,
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

    saveSimulationResult('Research - Get-involved', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Macular-researchers - Grant-info - Research-committee-terms-reference', async () => {
    const description =
      'User asking about research - macular-researchers - grant-info - research-committee-terms-reference.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Macular-researchers - Grant-info - Research-committee-terms-reference',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - macular-researchers - grant-info - research-committee-terms-reference.
            Ask the following questions naturally in conversation:
            - What is the role of the Research Committee of the Macular Society?
            - How long can a member serve on the Research Committee before they must rotate off?
            - What measures are in place to prevent conflicts of interest within the Research Committee?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must remain within scope and provide only informational content.',
            'The response 'the source text does not provide enough information' is valid when applicable.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Research - Macular-researchers - Grant-info - Research-committee-terms-reference', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Macular-researchers - Grant-info - Research-grant-terms-and-conditions', async () => {
    const description =
      'User asking about research - macular-researchers - grant-info - research-grant-terms-and-conditions.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Macular-researchers - Grant-info - Research-grant-terms-and-conditions',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - macular-researchers - grant-info - research-grant-terms-and-conditions.
            Ask the following questions naturally in conversation:
            - What is the main goal of the Macular Society?
            - What type of information does the Macular Society provide about their research?
            - How can individuals stay informed about advancements in macular disease research and treatments?`,
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

    saveSimulationResult('Research - Macular-researchers - Grant-info - Research-grant-terms-and-conditions', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Macular-researchers - Grant-info', async () => {
    const description =
      'User asking about research - macular-researchers - grant-info.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Macular-researchers - Grant-info',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - macular-researchers - grant-info.
            Ask the following questions naturally in conversation:
            - What types of research projects does the Macular Society fund?
            - What are some of the conditions that the Macular Society's research grants focus on?
            - How are research grant applications evaluated by the Macular Society?`,
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

    saveSimulationResult('Research - Macular-researchers - Grant-info', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Macular-researchers - Grant-programmes - Fellowships', async () => {
    const description =
      'User asking about research - macular-researchers - grant-programmes - fellowships.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Macular-researchers - Grant-programmes - Fellowships',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - macular-researchers - grant-programmes - fellowships.
            Ask the following questions naturally in conversation:
            - What is the purpose of the fellowship program introduced by the Macular Society?
            - Who are the key partners involved in the Macular Society's fellowship program?
            - How does the Daphne Jackson Trust support researchers in the fellowship program?`,
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

    saveSimulationResult('Research - Macular-researchers - Grant-programmes - Fellowships', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Macular-researchers - Grant-programmes - Research-grants-and-phd-studentships', async () => {
    const description =
      'User asking about research - macular-researchers - grant-programmes - research-grants-and-phd-studentships.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Macular-researchers - Grant-programmes - Research-grants-and-phd-studentships',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - macular-researchers - grant-programmes - research-grants-and-phd-studentships.
            Ask the following questions naturally in conversation:
            - What types of research projects does the Macular Society fund?
            - How much funding is available for research grants from the Macular Society?
            - What is the maximum funding available for PhD studentships from the Macular Society?`,
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

    saveSimulationResult('Research - Macular-researchers - Grant-programmes - Research-grants-and-phd-studentships', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Macular-researchers - Grant-programmes - Seedcorn-grants', async () => {
    const description =
      'User asking about research - macular-researchers - grant-programmes - seedcorn-grants.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Macular-researchers - Grant-programmes - Seedcorn-grants',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - macular-researchers - grant-programmes - seedcorn-grants.
            Ask the following questions naturally in conversation:
            - What is the maximum funding amount provided by the Seedcorn grants?
            - What types of projects are eligible for Seedcorn grants?
            - Can Seedcorn grants be used as supplementary funding for other grants?`,
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

    saveSimulationResult('Research - Macular-researchers - Grant-programmes - Seedcorn-grants', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Macular-researchers - Grant-programmes - Travel-grants', async () => {
    const description =
      'User asking about research - macular-researchers - grant-programmes - travel-grants.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Macular-researchers - Grant-programmes - Travel-grants',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - macular-researchers - grant-programmes - travel-grants.
            Ask the following questions naturally in conversation:
            - What is the purpose of the travel grants offered by the Macular Society?
            - Who is eligible to apply for the Macular Society travel grants?
            - Are applications from companies or industry eligible for the travel grants?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must remain within the scope of informational content only.',
            'The response 'the source text does not provide enough information' is valid when applicable.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Research - Macular-researchers - Grant-programmes - Travel-grants', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Macular-researchers - Grant-programmes', async () => {
    const description =
      'User asking about research - macular-researchers - grant-programmes.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Macular-researchers - Grant-programmes',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - macular-researchers - grant-programmes.
            Ask the following questions naturally in conversation:
            - What is the maximum funding amount available for Research Grants from the Macular Society?
            - When do applications for PhD Studentships reopen?
            - What expenses do the PhD Studentships cover?`,
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

    saveSimulationResult('Research - Macular-researchers - Grant-programmes', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Macular-researchers - Patient-public-involvement', async () => {
    const description =
      'User asking about research - macular-researchers - patient-public-involvement.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Macular-researchers - Patient-public-involvement',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - macular-researchers - patient-public-involvement.
            Ask the following questions naturally in conversation:
            - How does the Macular Society facilitate connections between researchers and patient representatives?
            - What kind of guidance does the Health Research Authority provide regarding patient involvement in research?
            - In what ways does the Macular Society support research aimed at beating macular disease?`,
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

    saveSimulationResult('Research - Macular-researchers - Patient-public-involvement', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Macular-researchers - Policies - Animals-in-research', async () => {
    const description =
      'User asking about research - macular-researchers - policies - animals-in-research.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Macular-researchers - Policies - Animals-in-research',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - macular-researchers - policies - animals-in-research.
            Ask the following questions naturally in conversation:
            - What are the '3 Rs' principle mentioned by the Macular Society?
            - Why does the Macular Society support the use of animals in research?
            - What ethical standards must research funded by the Macular Society comply with?`,
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

    saveSimulationResult('Research - Macular-researchers - Policies - Animals-in-research', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Macular-researchers - Policies - Committee-conflicts-of-interest-policy', async () => {
    const description =
      'User asking about research - macular-researchers - policies - committee-conflicts-of-interest-policy.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Macular-researchers - Policies - Committee-conflicts-of-interest-policy',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - macular-researchers - policies - committee-conflicts-of-interest-policy.
            Ask the following questions naturally in conversation:
            - What is the purpose of the Macular Society's Committee Conflicts of Interest Policy?
            - What must members of the Research Committee do if they have a conflict of interest?
            - How often is the Conflicts of Interest Policy reviewed?`,
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

    saveSimulationResult('Research - Macular-researchers - Policies - Committee-conflicts-of-interest-policy', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Macular-researchers - Policies - Research-committee-rotation-policy', async () => {
    const description =
      'User asking about research - macular-researchers - policies - research-committee-rotation-policy.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Macular-researchers - Policies - Research-committee-rotation-policy',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - macular-researchers - policies - research-committee-rotation-policy.
            Ask the following questions naturally in conversation:
            - What is the purpose of the rotation policy for the Macular Society's Research Committee?
            - How many trustees are allowed to serve on the Research Committee at the same time?
            - How can individuals stay updated on research and treatments related to macular disease?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must remain within scope and informational only.',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Research - Macular-researchers - Policies - Research-committee-rotation-policy', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Macular-researchers - Policies - Stem-cell-statement', async () => {
    const description =
      'User asking about research - macular-researchers - policies - stem-cell-statement.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Macular-researchers - Policies - Stem-cell-statement',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - macular-researchers - policies - stem-cell-statement.
            Ask the following questions naturally in conversation:
            - What types of stem cells does the Macular Society support for treating macular conditions?
            - How is stem cell research regulated in the UK?
            - What role does the Macular Society play in stem cell research for macular disease?`,
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

    saveSimulationResult('Research - Macular-researchers - Policies - Stem-cell-statement', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Macular-researchers - Policies', async () => {
    const description =
      'User asking about research - macular-researchers - policies.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Macular-researchers - Policies',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - macular-researchers - policies.
            Ask the following questions naturally in conversation:
            - What is the role of the Macular Society in supporting research for macular disease?
            - How does the Macular Society collaborate with researchers?
            - What kind of updates does the Macular Society provide regarding macular disease?`,
        }),
        scenario.judgeAgent({
          criteria: [
            'Responses must be medically correct according to the source text.',
            'Responses must be faithful and traceable to the source text.',
            'Responses must be logically coherent across multiple conversation turns.',
            'Responses must be appropriate for a real medical conversation.',
            'Responses must remain within scope (informational only, no unsupported diagnosis or treatment advice).',
          ],
        }),
      ],
      maxTurns: 5,
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('Research - Macular-researchers - Policies', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Macular-researchers - Recruit-participants-your-study', async () => {
    const description =
      'User asking about research - macular-researchers - recruit-participants-your-study.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Macular-researchers - Recruit-participants-your-study',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - macular-researchers - recruit-participants-your-study.
            Ask the following questions naturally in conversation:
            - How does the Macular Society assist in patient recruitment for clinical studies?
            - What methods does the Macular Society use to promote volunteer opportunities for research?
            - How many people in the UK participate in research annually, according to the Macular Society?`,
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

    saveSimulationResult('Research - Macular-researchers - Recruit-participants-your-study', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Macular-researchers', async () => {
    const description =
      'User asking about research - macular-researchers.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Macular-researchers',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - macular-researchers.
            Ask the following questions naturally in conversation:
            - Why is research into macular disease considered underfunded in the UK?
            - How does the Macular Society support research into macular conditions?
            - What role do patients play in the Macular Society's research efforts?`,
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

    saveSimulationResult('Research - Macular-researchers', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - News', async () => {
    const description =
      'User asking about research - news.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - News',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - news.
            Ask the following questions naturally in conversation:
            - What recent developments have been made in the treatment of age-related macular degeneration (AMD)?
            - How does understanding cell ageing contribute to treating AMD according to Professor Lynne Cox?
            - What are the promising results of the revolutionary implant for patients with dry AMD?`,
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

    saveSimulationResult('Research - News', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Now - Gene-therapy', async () => {
    const description =
      'User asking about research - now - gene-therapy.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Now - Gene-therapy',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - now - gene-therapy.
            Ask the following questions naturally in conversation:
            - What is the primary goal of gene therapy in treating macular diseases?
            - How do genetic mutations lead to vision loss in macular dystrophies?
            - What are some specific gene therapy techniques being explored for macular diseases?`,
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

    saveSimulationResult('Research - Now - Gene-therapy', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Now - Nutrition', async () => {
    const description =
      'User asking about research - now - nutrition.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Now - Nutrition',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - now - nutrition.
            Ask the following questions naturally in conversation:
            - What lifestyle factors can influence the risk of developing age-related macular degeneration (AMD)?
            - How does smoking affect age-related macular degeneration (AMD)?
            - Which nutrients are beneficial for reducing the risk of AMD, and in which foods can they be found?`,
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

    saveSimulationResult('Research - Now - Nutrition', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Now - Science-ageing', async () => {
    const description =
      'User asking about research - now - science-ageing.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Now - Science-ageing',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - now - science-ageing.
            Ask the following questions naturally in conversation:
            - What are the primary factors influencing age-related macular degeneration (AMD)?
            - How does inflammation contribute to the progression of AMD?
            - What role does smoking play in the risk of developing AMD?`,
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

    saveSimulationResult('Research - Now - Science-ageing', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Now - Stem-cell-therapy', async () => {
    const description =
      'User asking about research - now - stem-cell-therapy.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Now - Stem-cell-therapy',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - now - stem-cell-therapy.
            Ask the following questions naturally in conversation:
            - What is the potential benefit of stem cell therapy for macular disease?
            - How do stem cells work in the context of treating AMD?
            - What is the current status of stem cell therapy for AMD?`,
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

    saveSimulationResult('Research - Now - Stem-cell-therapy', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });


  it('should answer questions about Research - Now', async () => {
    const description =
      'User asking about research - now.';
    const agent = new RAGAgent();

    const result = await scenario.run({
      name: 'Research - Now',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            `You are someone seeking information about research - now.
            Ask the following questions naturally in conversation:
            - What are the current treatment options for wet age-related macular degeneration (AMD)?
            - What promising areas of research are being explored for macular diseases?
            - How might gene therapy be beneficial for macular diseases?`,
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

    saveSimulationResult('Research - Now', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });

});
