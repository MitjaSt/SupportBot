/**
 * confluence-responder.ts
 *
 * Polls Confluence for comments that @mention the bot account and posts AI-drafted replies.
 * Only responds to explicit @mentions — never replies to all comments.
 *
 * Usage:
 *   npx tsx src/confluence-responder.ts [options]
 *
 * Options:
 *   --space-key <KEY>     Space to poll (defaults to CONFLUENCE_SPACE_KEY env var)
 *   --page-id <ID>        Scope to a single page instead of entire space
 *   --max-comments <N>    Max Claude API calls per run (default: 10)
 *   --dry-run             Log planned actions without posting
 */

import Anthropic from "@anthropic-ai/sdk";
import { ConfluenceClient } from "confluence.js";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../../");

// Load env from repo root
dotenv.config({ path: path.join(REPO_ROOT, ".env.secrets") });
dotenv.config({ path: path.join(REPO_ROOT, ".env.config") });

// ─── Types ───────────────────────────────────────────────────────────────────

type LogAction =
  | "replied"
  | "skipped_no_mention"
  | "skipped_already_replied"
  | "skipped_dry_run"
  | "error";

interface RunLogEntry {
  timestamp: string;
  pageId: string;
  pageTitle: string;
  commentId: string;
  action: LogAction;
  reason?: string;
  tokensUsed?: number;
}

interface RunSummary {
  runAt: string;
  spaceKey: string;
  dryRun: boolean;
  pagesChecked: number;
  commentsChecked: number;
  replied: number;
  skipped: number;
  errors: number;
  entries: RunLogEntry[];
}

// ─── CLI args ─────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };
  return {
    spaceKey: get("--space-key") ?? process.env.CONFLUENCE_SPACE_KEY ?? "",
    pageId: get("--page-id"),
    maxComments: parseInt(get("--max-comments") ?? "10", 10),
    dryRun: args.includes("--dry-run"),
  };
}

// ─── Env validation ───────────────────────────────────────────────────────────

function validateEnv(spaceKey: string) {
  const required: Record<string, string | undefined> = {
    CONFLUENCE_BASE_URL: process.env.CONFLUENCE_BASE_URL,
    CONFLUENCE_BOT_EMAIL: process.env.CONFLUENCE_BOT_EMAIL,
    CONFLUENCE_BOT_API_TOKEN: process.env.CONFLUENCE_BOT_API_TOKEN,
    CONFLUENCE_BOT_ACCOUNT_ID: process.env.CONFLUENCE_BOT_ACCOUNT_ID,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  };
  const missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (!spaceKey) missing.push("CONFLUENCE_SPACE_KEY (or --space-key flag)");
  if (missing.length > 0) {
    console.error("Missing required environment variables:");
    missing.forEach((k) => console.error(`  - ${k}`));
    console.error("\nSet these in .env.secrets / .env.config at repo root.");
    process.exit(1);
  }
}

// ─── Confluence client ────────────────────────────────────────────────────────

function makeClient() {
  return new ConfluenceClient({
    host: process.env.CONFLUENCE_BASE_URL!,
    authentication: {
      basic: {
        email: process.env.CONFLUENCE_BOT_EMAIL!,
        apiToken: process.env.CONFLUENCE_BOT_API_TOKEN!,
      },
    },
  });
}

// ─── Mention detection ────────────────────────────────────────────────────────

const BOT_ACCOUNT_ID = () => process.env.CONFLUENCE_BOT_ACCOUNT_ID!;

/**
 * Returns true if the comment storage-format body contains a mention of the bot account.
 * Confluence storage format: <ri:user ri:account-id="ACCOUNT_ID"/>
 */
export function isMentioned(body: string): boolean {
  return body.includes(`ri:account-id="${BOT_ACCOUNT_ID()}"`);
}

/**
 * Returns true if any existing child comment was authored by the bot account.
 * This is the idempotency guard — prevents double-posting.
 */
export function alreadyReplied(
  children: Array<{ authorId?: string }>,
): boolean {
  return children.some((c) => c.authorId === BOT_ACCOUNT_ID());
}

/**
 * Strips @mention markup from the comment body for cleaner LLM input.
 * Removes <ri:user ... /> tags.
 */
export function stripMentions(storageBody: string): string {
  return storageBody
    .replace(/<ri:user[^/]*/>/g, "")
    .replace(/<ac:link>[^<]*<\/ac:link>/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ─── AI reply generator ───────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an AI assistant embedded in a Confluence page comment thread.
You help team members understand the content of the page they are commenting on.

Rules you must follow:
- Only answer questions about the page content provided. If the question is off-topic, say so politely and suggest they check with the team.
- Never make commitments on behalf of the organisation (dates, budgets, decisions, approvals).
- If a question requires a human decision, say: "This needs a human decision — please raise it with the team directly."
- Keep replies under 400 words. Be clear and direct.
- Do not repeat the question back to the user.
- If the comment contains only a @mention with no question, ask the user to clarify what they need.`;

export async function generateCommentReply(opts: {
  pageTitle: string;
  pageExcerpt: string;
  commentBody: string;
}): Promise<{ text: string; tokensUsed: number }> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Page title: ${opts.pageTitle}

Page content (excerpt):
${opts.pageExcerpt}

Comment asking for help:
${opts.commentBody}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const tokensUsed =
    (response.usage.input_tokens ?? 0) + (response.usage.output_tokens ?? 0);
  return { text, tokensUsed };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  const { spaceKey, pageId, maxComments, dryRun } = parseArgs();
  validateEnv(spaceKey);

  const client = makeClient();
  const summary: RunSummary = {
    runAt: new Date().toISOString(),
    spaceKey,
    dryRun,
    pagesChecked: 0,
    commentsChecked: 0,
    replied: 0,
    skipped: 0,
    errors: 0,
    entries: [],
  };

  if (dryRun) console.log("[dry-run] No comments will be posted.");

  // Fetch pages
  let pages: Array<{ id: string; title: string }> = [];
  if (pageId) {
    pages = [{ id: pageId, title: `(single page: ${pageId})` }];
  } else {
    const result = await client.space.getSpaceContent({
      spaceKey,
      type: "page",
      limit: 100,
    });
    pages = (result.results ?? []).map((p: { id: string; title: string }) => ({
      id: p.id,
      title: p.title,
    }));
  }

  summary.pagesChecked = pages.length;
  console.log(`Checking ${pages.length} page(s) in space ${spaceKey}...`);

  let callsRemaining = maxComments;

  for (const page of pages) {
    if (callsRemaining <= 0) break;

    // Fetch footer comments with storage representation
    let commentsResult: { results?: Array<{ id: string; version?: { by?: { accountId?: string } }; body?: { storage?: { value?: string } }; children?: { comment?: { results?: Array<{ version?: { by?: { accountId?: string } } }> } } }> };
    try {
      commentsResult = await client.content.getContentChildren({
        id: page.id,
        expand: ["body.storage", "version", "children.comment.version"],
        type: "comment",
      });
    } catch {
      continue;
    }

    const comments = commentsResult.results ?? [];
    summary.commentsChecked += comments.length;

    for (const comment of comments) {
      if (callsRemaining <= 0) break;

      const body = comment.body?.storage?.value ?? "";
      const authorId = comment.version?.by?.accountId ?? "";
      const childComments = (
        comment.children?.comment?.results ?? []
      ).map((c) => ({ authorId: c.version?.by?.accountId ?? "" }));

      const entry: RunLogEntry = {
        timestamp: new Date().toISOString(),
        pageId: page.id,
        pageTitle: page.title,
        commentId: comment.id,
        action: "skipped_no_mention",
      };

      // Skip if not a @mention
      if (!isMentioned(body)) {
        entry.action = "skipped_no_mention";
        summary.entries.push(entry);
        summary.skipped++;
        continue;
      }

      // Skip if bot already replied
      if (alreadyReplied(childComments)) {
        entry.action = "skipped_already_replied";
        summary.entries.push(entry);
        summary.skipped++;
        continue;
      }

      // Skip if comment is from the bot itself
      if (authorId === BOT_ACCOUNT_ID()) {
        entry.action = "skipped_already_replied";
        entry.reason = "comment authored by bot";
        summary.entries.push(entry);
        summary.skipped++;
        continue;
      }

      if (dryRun) {
        entry.action = "skipped_dry_run";
        entry.reason = "dry-run mode";
        summary.entries.push(entry);
        summary.skipped++;
        console.log(
          `[dry-run] Would reply to comment ${comment.id} on "${page.title}"`,
        );
        continue;
      }

      // Generate and post reply
      try {
        // Fetch page content for context
        const pageContent = await client.content.getContentById({
          id: page.id,
          expand: ["body.storage"],
        });
        const pageBody =
          pageContent.body?.storage?.value?.slice(0, 1000) ?? "";
        const cleanedComment = stripMentions(body);

        const { text, tokensUsed } = await generateCommentReply({
          pageTitle: page.title,
          pageExcerpt: pageBody,
          commentBody: cleanedComment || "(no text — only a mention)",
        });

        if (!text) {
          entry.action = "error";
          entry.reason = "empty response from Claude";
          summary.errors++;
          summary.entries.push(entry);
          continue;
        }

        await client.content.createContent({
          ancestors: [{ id: comment.id }],
          type: "comment",
          container: { id: page.id, type: "page" },
          space: { key: spaceKey },
          body: {
            storage: {
              value: `<p><strong>[AI draft — review before acting]</strong></p><p>${text.replace(/\n/g, "</p><p>")}</p>`,
              representation: "storage",
            },
          },
        });

        entry.action = "replied";
        entry.tokensUsed = tokensUsed;
        summary.replied++;
        callsRemaining--;
        console.log(`Replied to comment ${comment.id} on "${page.title}"`);
      } catch (err) {
        entry.action = "error";
        entry.reason = err instanceof Error ? err.message : String(err);
        summary.errors++;
        console.error(`Error on comment ${comment.id}: ${entry.reason}`);
      }

      summary.entries.push(entry);
    }
  }

  // Write log
  const logsDir = path.join(__dirname, "../logs");
  fs.mkdirSync(logsDir, { recursive: true });
  const logFile = path.join(
    logsDir,
    `confluence-responder-${new Date().toISOString().slice(0, 10)}.json`,
  );
  fs.writeFileSync(logFile, JSON.stringify(summary, null, 2));

  console.log(
    `\nDone. Pages: ${summary.pagesChecked} | Comments: ${summary.commentsChecked} | Replied: ${summary.replied} | Skipped: ${summary.skipped} | Errors: ${summary.errors}`,
  );
  console.log(`Log: ${logFile}`);

  if (summary.errors > 0) process.exit(1);
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
