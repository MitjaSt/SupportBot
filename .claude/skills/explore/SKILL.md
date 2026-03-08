---
name: explore
description: Problem discovery for a rough idea. Maps the problem space with divergent thinking — multiple problem framings, affected users, solution directions, and unknowns — before committing to a PRD. Usage: /explore <idea>
---

# Explore

Maps the problem space of a rough idea before any solution is committed to. The goal is **divergent thinking** — surface multiple interpretations of the problem, understand who it affects, explore the landscape of existing solutions, and name what is unknown.

Do not collapse to a single answer. Surface possibilities and unknowns. Output feeds into `/prd`.

**Target length:** 400–700 words. Prefer clarity over completeness at this stage.

## Usage

```
/explore <idea>
```

Examples:
- `/explore voice mode improvements`
- `/explore data export for analytics`
- `/explore admin dashboard for content management`

---

## Instructions

### Step 0: Capture the idea

The user's idea is in `$ARGS`. If empty, ask: "What idea do you want to explore?"

Restate the idea in one sentence. If it is too vague to restate meaningfully, ask one clarifying question before proceeding.

---

### Step 1: Codebase recon

Quick check — does anything related already exist?

- Use `Grep` to search for relevant keywords
- Use `Glob` to check for relevant files
- Check `docs/adr/` for prior decisions on related topics
- Check `docs/explore/` for prior exploration on similar ideas

Summarise in 2–3 bullets. Note explicitly if nothing exists.

---

### Step 2: Domain research

Use `WebSearch` to understand the problem landscape. Run 2–3 searches focused on the *problem*, not the solution:

- "[problem area] user pain points"
- "[industry] [problem] common challenges"
- "[similar product or space] [feature] approaches"

Extract what you find: common failure modes, unmet needs, what others have tried. Do not just list URLs — synthesise.

---

### Step 3: Write the Exploration Brief

```markdown
# Exploration: [Idea]

> Stage: Explore | Date: [today]
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

[One sentence restatement of the idea.]

## Problem interpretations

What underlying problem might this address? Offer 2–3 framings — the right one is not assumed yet.

### Interpretation A: [Name]
[2–3 sentences. Who has this problem, in what situation, and what does it cost them?]

### Interpretation B: [Name]
[2–3 sentences.]

### Interpretation C: [Name] _(if applicable)_
[2–3 sentences.]

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| [Role] | [When/where this surfaces] | [What they do today] | Low / Med / High |

_Note: End users of this system have macular degeneration — consider how the problem manifests differently for low-vision or screen-reader users._

## Why now

What makes this worth exploring at this moment?

- [New capability available, user feedback received, operational pressure, or strategic alignment]

## Existing solutions

**Internal:**
- [What the current system already does in this area]

**External:**
- [Tools or approaches others use to solve this, with a brief trade-off note]

## Possible directions

Do not evaluate — list what is possible.

### Direction A: [Name]
[Brief description. What approach, rough scope.]

### Direction B: [Name]
[Brief description.]

### Direction C: [Name] _(if applicable)_
[Brief description.]

## Hard problems

What makes this genuinely difficult — technically, operationally, or in terms of user behaviour?

- [Hard problem]
- [Hard problem]

## Unknowns

Things we cannot answer without further investigation.

| Unknown | Why it matters | How to investigate |
|---------|---------------|--------------------|
| [Unknown] | [Impact if wrong] | [Spike / research / user interview] |

## Promising direction

Which direction seems most worth pursuing and why. This is a lean signal — not a commitment.

**Direction [X]** — [one sentence reason]

[2–3 sentences. Reference: user impact, feasibility given existing stack, degree of unknowns.]
```

---

### Step 4: Save to file

1. Run `mkdir -p docs/explore` via Bash
2. Write the brief to `docs/explore/YYYY-MM-DD-[slug].md`
3. Tell the user: "Saved to `docs/explore/[filename]`"

---

### Step 5: Invite next step

```
---

## What next?

1. **[Most critical unknown]** — worth resolving before writing a PRD?
2. **[Alternative direction]** — should we explore Direction B further?
3. **Ready for PRD?** — run `/prd [idea]` to turn Direction [X] into structured requirements.
```

---

## Tone and output rules

- Stay divergent. Offer multiple problem framings — do not assume the user has the right framing.
- Do not write goals, milestones, or technical specs — that is what `/prd` and `/arch` are for.
- Flag unknowns explicitly. They are the primary output of exploration.
- If the idea is UI-facing, call out accessibility implications for macular degeneration users.
- This is not a PRD. Do not recommend a solution — recommend a direction worth investigating.
