---
name: test-rag-system
description: Comprehensive RAG system testing workflow including unit tests, integration tests, agent simulations, and quality checks
---

# Test RAG System

This skill runs a comprehensive test suite for the RAG system, verifying functionality across all layers.

## What This Skill Does

1. **Pre-flight checks**: Verify environment and services are ready
2. **Type checking**: Ensure TypeScript compilation succeeds
3. **Unit tests**: Test individual service methods
4. **Integration tests**: Test API endpoints and database operations
5. **Agent simulations**: Test RAG conversation quality
6. **Coverage analysis**: Report on test coverage
7. **Quality report**: Summarize results and provide recommendations

## Usage

```
/test-rag-system
```

Or with options:
```
/test-rag-system --skip-simulations  # Skip expensive simulation tests
/test-rag-system --quick            # Only type check and unit tests
/test-rag-system --coverage         # Include coverage report
```

## Instructions

### Step 1: Pre-flight Checks

Check that all required services are running:

```bash
# Check if Postgres is running
docker ps --filter "name=postgres" --format "{{.Status}}" | grep -q "Up" && echo "✓ Postgres running" || echo "✗ Postgres not running (run: make docker-start)"

# Check if API is on expected port
lsof -ti:3030 > /dev/null && echo "✓ API port 3030 available" || echo "✗ Port 3030 not available"

# Verify environment variables
cd projects/api
[ -f .env ] && echo "✓ .env file exists" || echo "✗ .env file missing"
grep -q "OPENAI_API_KEY=" .env && echo "✓ OpenAI API key configured" || echo "⚠ OpenAI API key not set"
grep -q "POSTGRES_HOST=" .env && echo "✓ Postgres configured" || echo "✗ Postgres not configured"
```

### Step 2: Run Type Checking

Verify TypeScript compilation:

```bash
cd projects/api
npm run typecheck
```

If type checking fails, STOP and report errors to user.

### Step 3: Run Unit Tests

Execute unit tests for all services:

```bash
cd projects/api
npm test -- --run test/unit/
```

Report results:
- Number of tests passed/failed
- Any error messages
- Timing information

### Step 4: Run Integration Tests

Execute integration tests (requires Postgres):

```bash
cd projects/api
npm test -- --run test/integration/
```

Report results with special attention to:
- Database connection issues
- Vector search functionality
- API endpoint responses

### Step 5: Run Agent Simulations (Optional)

Execute RAG conversation tests:

```bash
cd projects/api
npm run test:simulations
```

**Note**: This step:
- Makes real OpenAI API calls (costs money)
- Requires embeddings in database
- Takes longer to complete (1-2 minutes)

Skip if `--skip-simulations` flag provided or if OpenAI API key is not set.

Report results:
- Conversation scenarios tested
- Judge evaluation scores
- Any failed criteria

### Step 6: Coverage Analysis (Optional)

If `--coverage` flag provided, generate coverage report:

```bash
cd projects/api
npm run test:cov
```

Report coverage percentages for:
- Statements
- Branches
- Functions
- Lines

Highlight any modules with < 70% coverage.

### Step 7: Generate Quality Report

Provide comprehensive summary:

```markdown
## RAG System Test Report

### Environment Status
- Postgres: ✓/✗
- OpenAI API: ✓/✗
- Services: [list running services]

### Test Results

#### Type Checking
- Status: ✓ Passed / ✗ Failed
- Errors: [count]

#### Unit Tests
- Passed: X/X
- Failed: X
- Duration: Xs
- Notable failures: [list]

#### Integration Tests
- Passed: X/X
- Failed: X
- Duration: Xs
- Notable failures: [list]

#### Agent Simulations
- Passed: X/X
- Failed: X
- Duration: Xs
- Notable failures: [list]

#### Coverage (if run)
- Statements: X%
- Branches: X%
- Functions: X%
- Lines: X%
- Low coverage modules: [list]

### Quality Score: X/100

Calculation:
- Type check pass: 20 points
- Unit tests pass: 30 points
- Integration tests pass: 30 points
- Simulation tests pass: 20 points
- Bonus for >80% coverage: +10 points

### Recommendations

[List specific actions based on failures:]
- Fix type errors in [module]
- Improve test coverage for [module]
- Investigate flaky test: [test name]
- Update failing simulation scenarios

### Next Steps

- [ ] Fix failing tests
- [ ] Improve coverage in low-coverage modules
- [ ] Review and update simulation criteria
- [ ] Consider adding tests for [feature]
```

## Quick Mode

If `--quick` flag provided, only run:
1. Type checking
2. Unit tests

Skip integration tests and simulations for fast feedback.

## Error Handling

If any step fails critically:
1. Report the failure immediately
2. Provide the error message
3. Suggest remediation steps
4. Ask user if they want to continue with remaining tests

## Success Criteria

A healthy RAG system should have:
- ✅ Zero type errors
- ✅ All unit tests passing
- ✅ All integration tests passing
- ✅ >80% test coverage
- ✅ Agent simulations meeting quality criteria

## Example Output

```
Running comprehensive RAG system tests...

✓ Pre-flight checks passed
  ✓ Postgres running
  ✓ .env configured
  ✓ OpenAI API key set

✓ Type checking passed (0 errors)

✓ Unit tests: 24/24 passed (3.2s)

✓ Integration tests: 8/8 passed (5.1s)

✓ Agent simulations: 5/5 passed (45.3s)
  - Conversation quality: 95/100
  - Information accuracy: 92/100
  - Tool usage: 100/100

Coverage:
  - Statements: 87.3%
  - Branches: 81.2%
  - Functions: 89.5%
  - Lines: 86.8%

Quality Score: 100/100

All tests passed! RAG system is healthy. ✨
```

## Notes

- This skill is designed to be run before commits or after significant changes
- Agent simulations can be expensive (OpenAI API costs)
- Integration tests require Postgres to be running
- Coverage analysis adds ~20% overhead to test execution time
