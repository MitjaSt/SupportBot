# PR Review Guidelines

Adapted from [Google Engineering Practices](https://google.github.io/eng-practices/review/).

The goal of a code review is to **ship good software** — not to produce perfect code. Every review is a tradeoff between correctness, speed, and team friction. Optimise for all three.

---

## The Reviewer's Job

A reviewer's primary question is:

> **Does this PR improve the overall health of the codebase?**

If yes, approve it — even if it's not exactly how you'd have written it. "I would have done it differently" is not grounds for blocking a PR.

A PR that is **good enough and ships** is better than a perfect PR that sits in review for a week.

---

## What to Review (Priority Order)

### 1. Design — *Does it belong here?*

Is the change well-placed in the system? Does it introduce the right abstraction or reach across module boundaries incorrectly?

- Does it follow the module structure in `CLAUDE.md`?
- Controllers handle HTTP only. Services handle logic. Is this respected?
- Is it introducing unnecessary coupling between modules?

### 2. Functionality — *Does it work correctly?*

- Does the code do what the PR description says it does?
- Are there obvious edge cases not handled (null, empty, concurrent)?
- For AI/RAG changes: is there a risk of hallucination or silent retrieval failure?
- For UI changes: does it work for low-vision users? (This is a medical product — accessibility is not optional)

### 3. Security — *Could this cause harm?*

This is a medical product handling user data. Catch these before merge:

- **Injection:** SQL, prompt injection, command injection
- **Auth bypass:** Is a new route protected by the JWT guard where it should be?
- **Data leakage:** Are PII fields (phone, email) logged or exposed in error responses?
- **Input validation:** Is user input validated at the HTTP boundary via TypeBox?

Refer to `docs/SECURITY_RISK_ASSESMENT.md` for the threat model.

### 4. Tests — *Is the change verifiable?*

- New logic should have unit tests. New endpoints should have integration tests.
- Tests should test behaviour, not implementation. Don't assert on private methods.
- For non-deterministic (LLM) paths: loose assertions on structure, not exact text.
- Missing tests for complex logic = request tests. Missing tests for trivial logic = let it go.

### 5. Complexity — *Will the next engineer understand this?*

- Can a developer unfamiliar with the module understand it in under a minute?
- Are there functions doing more than one thing?
- Is there over-engineering for a use case that doesn't exist yet?

### 6. Naming and types — *Does it match project conventions?*

Check naming only when it causes genuine ambiguity — not to impose personal preference. If the name is clear enough to understand, it's fine.

For TypeScript: avoid `any`, avoid index signatures where a concrete interface could be defined. See `docs/CODING_STANDARDS.md`.

### 7. Comments and documentation — *Is the why explained?*

- Comments should explain **why**, not **what**.
- Non-obvious decisions (e.g. `stream_options: { include_usage: true }`) need a comment.
- If the PR changes a public API or env config, check that `docs/` or `CLAUDE.md` is updated.

---

## What NOT to Block a PR Over

These are **suggestions only** — leave a comment, but do not request changes:

- Naming preference when the existing name is unambiguous
- Code style that isn't covered by the linter
- "I would have structured this differently" without a concrete reason
- Minor comment wording
- Refactors that are out of scope for the PR

If you find yourself writing more than one comment about style, stop and ask: is this a style guide gap that should go into `docs/CODING_STANDARDS.md` instead?

---

## Comment Etiquette

Use explicit prefixes to reduce ambiguity:

| Prefix | Meaning |
|---|---|
| `nit:` | Minor, take it or leave it — do not block |
| `optional:` | Worth considering but not required |
| `question:` | Seeking understanding, not requesting a change |
| *(no prefix)* | Must be addressed before merge |

Ask questions before making demands. "Why did you approach it this way?" is better than "this is wrong."

---

## Scope of a PR

PRs should do one thing. If a PR description says "feat X, also refactored Y, also fixed Z", ask for it to be split — unless Y and Z are trivially small and directly related.

As an author: **do not refactor code you didn't need to touch**. Boy Scout Rule applies, but opportunistic refactors that inflate diff size make review harder and increase risk.

---

## Approval Threshold

Approve when:
- No blocking issues remain
- The code is a net improvement over the current state
- You'd be comfortable being on-call for it

You do not need to love the code to approve it.

---

## Author Checklist (before requesting review)

- [ ] `npm run typecheck` passes in both `projects/api` and `projects/frontend`
- [ ] `npm run lint` passes
- [ ] New logic has unit tests; new endpoints have integration tests
- [ ] No secrets or PII in logs or error messages
- [ ] New routes protected by auth guard (if applicable)
- [ ] PR description explains *what* changed and *why*
- [ ] Related docs updated (if API contract, env vars, or architecture changed)

Run `/check` to execute the full pre-push quality gate locally.

---

## Reviewer SLA

- First review within **1 business day**
- Once author responds to comments, re-review within **1 business day**
- If you can't review in time, say so and suggest an alternative reviewer
