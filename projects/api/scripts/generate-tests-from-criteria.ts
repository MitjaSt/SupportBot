import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

interface Question {
  id: string;
  text: string;
  intent: string;
  difficulty: string;
  source_reference: string;
}

interface JudgeCriterion {
  id: string;
  description: string;
  fail_if: string;
}

interface CriteriaFile {
  questions: Question[];
  judge_criteria: JudgeCriterion[];
  meta: {
    notes: string;
  };
}

interface TopicGroup {
  topicName: string;
  files: Array<{
    filename: string;
    criteria: CriteriaFile;
  }>;
}

/**
 * Generate a test file for a topic group
 */
function generateTestFile(group: TopicGroup, index: number): string {
  const testCases: string[] = [];

  for (const file of group.files) {
    const { questions, judge_criteria } = file.criteria;
    const cleanName = file.filename
      .replace('.json', '')
      .split('--')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' - ');

    // Take first 2-3 questions for the test
    const selectedQuestions = questions.slice(0, Math.min(3, questions.length));

    if (selectedQuestions.length === 0) continue;

    // Create user prompt from questions
    const questionsText = selectedQuestions.map((q) => `- ${q.text}`).join('\n            ');

    // Extract judge criteria
    const judgeCriteria = judge_criteria.map((c) => c.description);

    const testCase = `
  it('should answer questions about ${cleanName}', async () => {
    const description =
      'User asking about ${cleanName.toLowerCase()}.';
    const agent = new MacularRAGAgent();

    const result = await scenario.run({
      name: '${cleanName}',
      description,
      agents: [
        agent,
        scenario.userSimulatorAgent({
          systemPrompt:
            \`You are someone seeking information about ${cleanName.toLowerCase()}.
            Ask the following questions naturally in conversation:
            ${questionsText}\`,
        }),
        scenario.judgeAgent({
          criteria: [
${judgeCriteria.map((c) => `            '${c}',`).join('\n')}
          ],
        }),
      ],
      maxTurns: ${Math.min(selectedQuestions.length + 2, 6)},
      setId: SCENARIO_SET_ID,
    });

    saveSimulationResult('${cleanName}', result, description, agent.interactions);
    expect(result.success).toBe(true);
  });
`;

    testCases.push(testCase);
  }

  const testFileContent = `import scenario from '@langwatch/scenario';
import { describe, expect, it } from 'vitest';
import { MacularRAGAgent } from '../helpers/agent-adapter';
import { SCENARIO_SET_ID } from '../helpers/constants';
import { saveSimulationResult } from '../helpers/result-saver';

describe('Generated Tests - ${group.topicName}', () => {
${testCases.join('\n')}
});
`;

  return testFileContent;
}

/**
 * Group criteria files by topic prefix
 */
function groupByTopic(
  files: Array<{ filename: string; criteria: CriteriaFile }>,
): TopicGroup[] {
  const groups: Record<string, TopicGroup> = {};

  for (const file of files) {
    const parts = file.filename.split('--');
    const topicKey = parts[0];
    const topicName = topicKey
      .split('-')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');

    if (!groups[topicKey]) {
      groups[topicKey] = {
        topicName,
        files: [],
      };
    }

    groups[topicKey].files.push(file);
  }

  return Object.values(groups);
}

async function main() {
  const criteriaDir = join(__dirname, '../.cache/criteria');
  const testOutputDir = join(__dirname, '../test/agent-simulations/generated');

  // Ensure output directory exists
  if (!existsSync(testOutputDir)) {
    await mkdir(testOutputDir, { recursive: true });
  }

  // Read all criteria files
  const allFiles = await readdir(criteriaDir);
  const jsonFiles = allFiles.filter((f) => f.endsWith('.json'));

  console.log(`Found ${jsonFiles.length} criteria files`);

  const filesWithCriteria: Array<{ filename: string; criteria: CriteriaFile }> = [];

  for (const filename of jsonFiles) {
    try {
      const content = await readFile(join(criteriaDir, filename), 'utf-8');
      const criteria = JSON.parse(content) as CriteriaFile;

      if (criteria.questions && criteria.questions.length > 0) {
        filesWithCriteria.push({ filename, criteria });
      }
    } catch (error) {
      console.warn(`Failed to parse ${filename}:`, error);
    }
  }

  console.log(`Loaded ${filesWithCriteria.length} valid criteria files`);

  // Group by topic
  const groups = groupByTopic(filesWithCriteria);
  console.log(`Grouped into ${groups.length} topics`);

  // Generate test files
  let generatedCount = 0;
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];

    // Only generate tests for topics with multiple files or interesting questions
    if (group.files.length === 0) continue;

    const testContent = generateTestFile(group, i + 13); // Start from 13 to not conflict
    const outputFilename = `${String(i + 13).padStart(2, '0')}-generated-${group.topicName.toLowerCase().replace(/\s+/g, '-')}.test.ts`;
    const outputPath = join(testOutputDir, outputFilename);

    await writeFile(outputPath, testContent);
    console.log(`✓ Generated ${outputFilename} (${group.files.length} files, ${group.files.reduce((sum, f) => sum + f.criteria.questions.length, 0)} questions)`);
    generatedCount++;
  }

  console.log(`\n✨ Generated ${generatedCount} test files in ${testOutputDir}`);
}

main().catch(console.error);
