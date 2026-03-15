---
name: challenge
description: Critical review of a proposed feature. Stress-tests the problem framing, assumptions, design decisions, and value case with adversarial thinking. Reads all available pipeline documents. Usage: /challenge <feature name>
---

# Challenge

A structured adversarial review of the full proposal — problem, design, and value case. The goal is to find weaknesses before they become production problems or wasted effort.

megathink.
Critically challenge the proposal and attempt to falsify it.

Evaluate:
- hidden assumptions
- architectural fragility
- operational risks
- opportunity cost
- simpler alternatives


Read all available pipeline documents before writing anything. Then challenge everything.

This is not a veto. It surfaces risks and questions that should inform the final decision.

**Target length:** 500–900 words.

## Usage

```
/challenge <feature name>
```

Examples:
- `/challenge OpenAPI spec`
- `/challenge docs/prd/2026-03-07-openapi-spec.md`

---

## Instructions

### Pre-step: Model check

Before doing anything else, say this to the user:

---

**Model recommendation:** `/challenge` is adversarial reasoning over a full proposal — Opus surfaces non-obvious risks and falsification angles that Sonnet tends to miss.

You are currently on **Sonnet**. To get better results, switch first:
```
/model claude-opus-4-6
```
Then re-run the skill.

**Continue on Sonnet anyway?** Reply `yes` to proceed, or switch models and re-run.

---

Wait for the user to reply. If they say `yes` (or any affirmative), proceed. Otherwise stop here.

### Step 0: Locate all pipeline documents

Search for all available documents across pipeline stages using `Glob`:

- `docs/explore/` — exploration brief
- `docs/prd/` — PRD (required to proceed)
- `docs/architecture/` — architecture spec
- `docs/qa/` — QA strategy
- `docs/value/` — value assessment

Read everything found. If no PRD exists: "Run `/prd [idea]` first."

Summarise the proposal in 3 bullets: problem, solution, and value case.

---

### Step 1: Write the Challenge Review

```markdown
# Challenge Review: [Feature]

> Stage: Challenge | Date: [today]
> Pipeline: Explore → PRD → Architecture → QA → Plan → Value → **Challenge** → Decision

## Proposal summary

[2–3 sentences: what is being built, for whom, and at what estimated cost.]

## Is the problem real?

Does evidence support that this problem is frequent, severe, and actually blocking users?

- [Challenge — e.g., "The PRD states X is painful but provides no user evidence"]
- [Challenge — e.g., "Could this be solved with a process change instead of software?"]

**Verdict:** Problem is [well-evidenced / plausible but unproven / questionable].

## Are the assumptions sound?

| Assumption | Source | Risk if wrong | Verdict |
|------------|--------|--------------|---------|
| [Assumption from PRD] | [Where stated] | [What breaks] | Sound / Questionable / Untested |

## Is this the right solution?

Could the same outcome be achieved with meaningfully less complexity?

- [Simpler alternative — e.g., "A config flag would solve 80% of cases"]
- [Existing capability — e.g., "The system already does X, which partially addresses this"]

**Verdict:** Solution is [the right level of complexity / over-engineered / under-scoped].

## Hidden complexity

What parts of the implementation are likely harder than they appear in the architecture or plan?

- [e.g., "The migration in M2 touches live data — rollback risk is understated"]
- [e.g., "The streaming component has ordering guarantees that aren't addressed"]

## Operational risks

What could go wrong after launch that isn't currently monitored or mitigated?

- [e.g., "No alert defined for the new failure mode introduced in the data flow"]
- [e.g., "The observability section only adds a counter — no latency tracking"]

## User and adoption risk

Why might users struggle with or ignore this feature?

- [e.g., "The proposed flow requires 3 steps where 1 would do — discoverability concern"]
- [e.g., "Users with macular degeneration rely on screen readers — the proposed modal pattern has known accessibility issues"]

## Value case scrutiny

Does the value assessment hold up under pressure?

- [e.g., "Impact estimate assumes 100% adoption — no basis for this"]
- [e.g., "Opportunity cost section shows a higher-value item being deferred for this"]

**Verdict:** Value case is [well-supported / optimistic / unclear].

## Kill criteria

Conditions under which this project should be paused or abandoned mid-implementation.

- [e.g., "If M1 takes >2× the estimated effort, re-evaluate scope before starting M2"]
- [e.g., "If adoption is <10% after 4 weeks, run a user study before continuing"]

## Final verdict

**Proceed** / **Proceed with modifications** / **Run a spike first** / **Do not pursue**

[2–3 sentences. If "Proceed with modifications", list the specific changes needed. If "Run a spike", name what the spike must validate.]

**Top 3 things to resolve before starting:**
1. [Most critical risk or open question]
2. [Second most critical]
3. [Third]
```

---

### Step 2: Save to file

1. Run `mkdir -p docs/challenge` via Bash
2. Write to `docs/challenge/YYYY-MM-DD-[slug].md`
3. Tell the user: "Saved to `docs/challenge/[filename]`"

---

### Step 3: Invite next step

```
---

## What next?

1. **[Most critical concern]** — needs resolution before proceeding
2. **[Modification if recommended]** — specific change to PRD or architecture?
3. **Ready to decide?** — run `/decision [feature]` to write the final decision record.
```

---

## Tone and output rules

- Be adversarial. The goal is to find weaknesses, not validate the proposal.
- Every verdict must be justified — "questionable" with no reasoning is not useful output.
- "Do not pursue" is valuable output. State it clearly when warranted.
- Do not balance criticism with praise — focus on risk.
- If no significant challenges are found, say so directly: "The proposal is well-constructed. Proceed." Then state what to watch post-launch.
- This project's users have macular degeneration. Any UX or accessibility weakness should be called out prominently.
