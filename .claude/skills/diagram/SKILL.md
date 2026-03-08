---
name: diagram
description: Generate a Mermaid diagram from a document (ADR, PRD, architecture spec, or any doc). Produces a .md file with a fenced Mermaid block, ready to paste into mermaid.live for editing. Usage: /diagram <source file or feature name> [--type flowchart|sequence|state|er|architecture]
---

# Diagram

Reads a source document and produces a minimal, clear Mermaid diagram of the most interesting structure in it — pipeline, data flow, request sequence, state machine, or component map. Saves to `docs/diagrams/` as a Markdown file containing the Mermaid block.

## Usage

```
/diagram <source file or feature name> [--type flowchart|sequence|state|er|architecture]
```

Examples:
- `/diagram docs/adr/2025-11-19-rag-pipeline.md`
- `/diagram RAG pipeline`
- `/diagram contact-collection --type state`
- `/diagram docs/prd/2026-03-07-openapi-spec.md --type sequence`

---

## Instructions

### Step 0: Parse arguments

Extract from `$ARGS`:
- **Source** — a file path or feature name
- **Type hint** — the value after `--type`, if present. Valid values: `flowchart`, `sequence`, `state`, `er`, `architecture`. If absent, infer in Step 2.

---

### Step 1: Locate the source document

- If `$ARGS` contains a `.md`, `.svg`, `.txt`, or other file extension, read it directly.
- Otherwise use `Glob` to search across `docs/` for a filename matching the feature name. Check these locations in order:
  1. `docs/adr/`
  2. `docs/architecture/`
  3. `docs/prd/`
  4. `docs/` (root)
  5. Any markdown file whose name contains the keyword

If multiple matches are found, read the most recently modified one and note the choice.

If no document is found: stop and tell the user — "No document found for '[input]'. Pass a file path directly, or check that the document exists."

---

### Step 2: Read and analyse the document

Read the document fully. Identify:

1. **What is being described?** (system components, a data flow, a request/response sequence, a state machine, a schema)
2. **What is the single most valuable thing to visualise?** Pick ONE focus — do not try to diagram everything.
3. **Which Mermaid diagram type fits best?**

| Content type | Mermaid type |
|---|---|
| Pipeline, data flow, component relationships | `flowchart` |
| Request/response, API call sequence, time-ordered steps | `sequenceDiagram` |
| State machine, lifecycle, transitions | `stateDiagram-v2` |
| Database schema, entity relationships | `erDiagram` |
| High-level system architecture, service map | `architecture-beta` |

If a `--type` was given, use it. Otherwise pick the best fit.

Summarise in 2 bullets: what the diagram will show, and why that type was chosen.

---

### Step 3: Generate the Mermaid diagram

Rules for quality:
- **Minimal nodes** — 5–15 nodes is the sweet spot. If there are more, collapse related items into subgraphs or omit secondary detail.
- **Meaningful labels** — use real names from the document, not generic Box A / Box B labels.
- **Direction** — use `LR` (left-to-right) for pipelines and flows; `TD` (top-down) for hierarchies. Sequence diagrams are inherently vertical.
- **Subgraphs** — group related components (e.g., `subgraph API` or `subgraph Docker`) to reduce visual noise.
- **Edge labels** — label edges when the relationship type matters (e.g., `-->|SSE stream|`, `-->|cosine search|`). Omit when obvious.
- **No colour styling** — keep diagrams unstyled so they import cleanly into mermaid.live for editing.

**Do not generate placeholder nodes.** Every node must come from the actual document.

---

### Step 4: Write the output file

File structure:

````markdown
# [Diagram title]

> Source: [source document path] | Type: [mermaid type] | Date: [today]
> Edit online: paste the code block below into https://mermaid.live

## [Diagram subtitle — one sentence describing what is shown]

```mermaid
[diagram code here]
```

## Notes

- [Key design decision visible in the diagram, if any]
- [Any simplification made and what was omitted]
- [Suggested next diagram if more detail is needed]
````

Save steps:
1. Run `mkdir -p docs/diagrams` via Bash
2. Write to `docs/diagrams/YYYY-MM-DD-[slug].md` where slug is derived from the source document name or the feature name
3. Tell the user: "Saved to `docs/diagrams/[filename]`"

---

### Step 5: Print the diagram inline

After saving, print the full Mermaid code block in your response so the user can immediately copy it into [mermaid.live](https://mermaid.live) without opening the file.

Then offer one follow-up:

```
---

Want another view? Suggest one of:
- `/diagram [source] --type sequence` — to show the request/response flow instead
- `/diagram [source] --type er` — to show the data model
- Or describe what aspect you'd like to zoom in on
```

Only offer options that are meaningfully different from what was just produced.

---

## Tone and output rules

- State what you chose to diagram and why, in one sentence, before showing the diagram.
- Favour clarity over completeness. A diagram that shows one thing clearly is better than one that shows everything badly.
- If the source document is sparse or ambiguous, generate a diagram with the information available and add a note in the Notes section about what would make it more precise.
- Do not add emoji, decoration, or styling classes to the Mermaid code.
