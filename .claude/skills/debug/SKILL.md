---
name: debug
description: Systematic approach to identifying and resolving software bugs. Usage: /debug <bug description>
---

# Debug
A structured process for diagnosing and fixing software bugs. Follows a systematic workflow to identify the root cause and propose a minimal fix.

ultrathink.

Goal: Identify the true root cause of a bug before proposing any fixes.

Follow this debugging process:

1. Problem definition
  - Restate the observed behavior
  - Define the expected behavior
  - Identify where the divergence occurs

2. Evidence collection
  - Inspect relevant files, logs, tests, stack traces, and recent changes
  - Identify components involved in the execution path

3. Hypothesis generation
  - List multiple plausible root causes
  - Do not assume the first hypothesis is correct

4. Hypothesis testing
  - Evaluate each hypothesis against the evidence
  - Eliminate those that do not fit

5. Root cause identification
  - Identify the most likely root cause
  - Explain the mechanism that produces the bug

6. Fix strategy
  - Propose the minimal fix that resolves the root cause
  - Avoid broad refactors unless necessary

7. Verification
  - Describe how to confirm the fix
  - Suggest tests or checks that prevent regression

Output format:

## Bug Summary
[short description]

## Evidence
[list of relevant observations]

## Hypotheses
1. ...
2. ...
3. ...

## Root Cause
[clear explanation]

## Proposed Fix
[minimal change]

## Verification Plan
[tests or validation steps]