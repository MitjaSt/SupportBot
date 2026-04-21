/**
 * Inspect documents stored in the vector database.
 *
 * Prints each chunk's source, index, token count, and text.
 * Useful for verifying what was embedded and spotting chunking artefacts
 * (e.g. sentences that start mid-word, duplicate boilerplate, etc.)
 *
 * Usage:
 *   npm run inspect:vectors
 *   npm run inspect:vectors -- --filter "macular"
 *   npm run inspect:vectors -- --filter "AMD" --source "diagnosis-treatment"
 *   npm run inspect:vectors -- --source "macular-disease" --full
 *
 * Flags:
 *   --filter <text>    Case-insensitive substring match against chunk text
 *   --source <text>    Case-insensitive substring match against the source slug
 *   --full             Print the complete chunk text instead of a preview
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { Client } from 'pg';

config({ path: resolve(__dirname, '../../../.env') });

// ─── Argument parsing ────────────────────────────────────────────────────────

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  const val = process.argv[idx + 1];
  // Guard: next token must exist and not itself be a flag
  return val && !val.startsWith('--') ? val : undefined;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

const filterText  = getArg('--filter');
const filterSource = getArg('--source');
const showFull    = hasFlag('--full');
const PREVIEW_LEN = 200;

// ─── Formatting helpers ───────────────────────────────────────────────────────

const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';
const CYAN   = '\x1b[36m';
const YELLOW = '\x1b[33m';
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';

function highlight(text: string, term: string): string {
  if (!term) return text;
  // Case-insensitive highlight of matched term in the text
  const re = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(re, `${YELLOW}$1${RESET}`);
}

function truncate(text: string, len: number): string {
  if (text.length <= len) return text;
  return text.slice(0, len) + DIM + ' …' + RESET;
}

// ─── Main ────────────────────────────────────────────────────────────────────

interface VectorRow {
  id: string;
  source: string;
  chunk_index: number;
  chunk_length: number | null;
  created_at: Date;
  text: string;
}

async function main() {
  const client = new Client({
    host:     process.env.POSTGRES_HOST     ?? 'localhost',
    port:     parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
    database: process.env.POSTGRES_DATABASE ?? 'rag_project',
    user:     process.env.POSTGRES_USER     ?? 'rag_user',
    password: process.env.POSTGRES_PASSWORD ?? 'rag_user_password',
  });

  await client.connect();

  // Build parameterised query — never interpolate filter strings directly
  const conditions: string[] = [];
  const params: string[] = [];

  if (filterText) {
    params.push(`%${filterText}%`);
    conditions.push(`LOWER(text) LIKE LOWER($${params.length})`);
  }

  if (filterSource) {
    params.push(`%${filterSource}%`);
    conditions.push(`LOWER(source) LIKE LOWER($${params.length})`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await client.query<VectorRow>(
    `SELECT id, source, chunk_index, chunk_length, created_at, text
     FROM vectors
     ${where}
     ORDER BY source, chunk_index`,
    params,
  );

  await client.end();

  const rows = result.rows;

  if (rows.length === 0) {
    const parts: string[] = ['No chunks found'];
    if (filterText)   parts.push(`text containing "${filterText}"`);
    if (filterSource) parts.push(`source containing "${filterSource}"`);
    console.log(`${RED}${parts.join(' — ')}.${RESET}`);
    return;
  }

  // ── Summary header ────────────────────────────────────────────────────────
  const uniqueSources = new Set(rows.map((r) => r.source)).size;
  const filterDesc: string[] = [];
  if (filterText)   filterDesc.push(`text ~= "${filterText}"`);
  if (filterSource) filterDesc.push(`source ~= "${filterSource}"`);

  console.log(
    `\n${BOLD}${GREEN}${rows.length} chunk(s)${RESET} across ` +
    `${BOLD}${uniqueSources} source(s)${RESET}` +
    (filterDesc.length ? `  ${DIM}[${filterDesc.join(', ')}]${RESET}` : '') +
    '\n',
  );

  // ── Per-source grouping ────────────────────────────────────────────────────
  let currentSource = '';

  for (const row of rows) {
    // Print source header when it changes
    if (row.source !== currentSource) {
      currentSource = row.source;
      const sourceChunks = rows.filter((r) => r.source === currentSource).length;
      console.log(
        `${BOLD}${CYAN}┌─ ${filterSource ? highlight(currentSource, filterSource) : currentSource}${RESET}` +
        `  ${DIM}(${sourceChunks} chunk${sourceChunks !== 1 ? 's' : ''})${RESET}`,
      );
    }

    // Format the chunk text
    const rawText = row.text;
    const displayText = showFull
      ? rawText
      : truncate(rawText, PREVIEW_LEN);
    const displayWithHighlight = filterText
      ? highlight(displayText, filterText)
      : displayText;

    const meta =
      `${DIM}chunk ${row.chunk_index}` +
      (row.chunk_length != null ? `  ${row.chunk_length} chars` : '') +
      `  id=${row.id}${RESET}`;

    console.log(`│  ${meta}`);
    console.log(`│  ${displayWithHighlight}`);
    console.log(`│`);
  }

  console.log(`${DIM}└─ end${RESET}\n`);
}

main().catch((err) => {
  console.error(`${RED}Error:${RESET}`, err.message ?? err);
  process.exit(1);
});
