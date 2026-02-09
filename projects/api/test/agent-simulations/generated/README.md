# Generated Test Simulations

This directory contains automatically generated test simulations based on the criteria files in `.cache/criteria/`.

## How It Works

1. The criteria files contain:
   - **Questions**: Real user questions with intent, difficulty, and source references
   - **Judge Criteria**: Evaluation criteria for the AI responses
   - **Metadata**: Context-specific notes

2. The generator script (`scripts/generate-tests-from-criteria.ts`):
   - Reads all criteria JSON files
   - Groups them by topic (based on filename prefix)
   - Generates test files with realistic conversation scenarios
   - Uses the judge criteria from the source files

## Generating Tests

To generate/regenerate tests from criteria files:

```bash
npm run test:generate
```

This will:
- Scan all files in `.cache/criteria/`
- Group by topic (macular-disease, diagnosis-treatment, etc.)
- Generate one test file per topic group
- Place generated tests in this directory

## Test Structure

Each generated test:
- Uses questions from the criteria files
- Implements a user simulator with those questions
- Applies the judge criteria from the source files
- Limits conversation to relevant number of turns
- Saves results for analysis

## Example Generated Test

```typescript
it('should answer questions about Cone Dystrophy', async () => {
  const description = 'User asking about cone dystrophy.';
  const agent = new MacularRAGAgent();

  const result = await scenario.run({
    name: 'Cone Dystrophy',
    description,
    agents: [
      agent,
      scenario.userSimulatorAgent({
        systemPrompt:
          \`You are someone seeking information about cone dystrophy.
          Ask the following questions naturally in conversation:
          - What are the main symptoms of cone dystrophy?
          - How is cone dystrophy diagnosed?
          - Are there any current treatments available?\`,
      }),
      scenario.judgeAgent({
        criteria: [
          'Responses must be medically correct according to the source text.',
          'Responses must be faithful and traceable to the source text.',
          'Responses must be appropriate for a real medical conversation.',
        ],
      }),
    ],
    maxTurns: 5,
    setId: SCENARIO_SET_ID,
  });

  saveSimulationResult('Cone Dystrophy', result, description, agent.interactions);
  expect(result.success).toBe(true);
});
```

## Running Generated Tests

```bash
# Run all tests including generated ones
npm run test:simulations

# Run only generated tests
npx vitest run test/agent-simulations/generated/
```

## Maintenance

- **Regenerate** tests after updating criteria files
- **Review** generated tests to ensure quality
- **Customize** specific tests if needed (they won't be overwritten)
- **Delete** this directory and regenerate to start fresh
