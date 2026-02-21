/**
 * Upload summaries to VAPI knowledge base.
 *
 * Reads all files from .cache/summaries/ and uploads any that are
 * not already present in VAPI (matched by filename), skipping the rest.
 *
 * Usage:
 *   npm run vapi:upload
 *   # or directly:
 *   ts-node -r tsconfig-paths/register scripts/upload-to-vapi.ts
 */
import { config } from 'dotenv';
import { readFile, readdir } from 'fs/promises';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../../.env') });

const VAPI_API_URL = 'https://api.vapi.ai/file';
const SUMMARIES_DIR = resolve(__dirname, '../.cache/summaries');
const DELAY_MS = 2000;

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

interface VapiFile {
  id: string;
  name: string;
}

async function listFiles(privateKey: string): Promise<VapiFile[]> {
  const response = await fetch(VAPI_API_URL, {
    headers: { Authorization: `Bearer ${privateKey}` },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to list files: ${response.status} ${body}`);
  }
  return (await response.json()) as VapiFile[];
}


async function uploadFile(
  filename: string,
  content: string,
  privateKey: string,
): Promise<VapiFile> {
  const formData = new FormData();
  const blob = new Blob([content], { type: 'text/plain' });
  formData.append('file', blob, filename);

  const response = await fetch(VAPI_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${privateKey}` },
    body: formData,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to upload ${filename}: ${response.status} ${body}`);
  }

  return (await response.json()) as VapiFile;
}

async function main() {
  const privateKey = process.env.VAPI_PRIVATE_KEY;
  if (!privateKey) {
    console.error('VAPI_PRIVATE_KEY is not set in .env');
    process.exit(1);
  }

  const allFiles = await readdir(SUMMARIES_DIR);

  console.log('Fetching existing VAPI files...');
  const existing = await listFiles(privateKey);
  const existingNames = new Set(existing.map((f) => f.name));
  console.log(`Found ${existing.length} already uploaded file(s).\n`);

  // Upload
  console.log(`Uploading ${allFiles.length} files...`);

  const results: { filename: string; id: string }[] = [];
  const errors: { filename: string; error: string }[] = [];

  for (const filename of allFiles) {
    if (existingNames.has(filename)) {
      console.log(`  – ${filename} (already uploaded, skipping)`);
      continue;
    }

    const filePath = resolve(SUMMARIES_DIR, filename);
    const content = await readFile(filePath, 'utf-8');

    try {
      const result = await uploadFile(filename, content, privateKey);
      results.push({ filename, id: result.id });
      console.log(`  ✓ ${filename} → ${result.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ filename, error: message });
      console.error(`  ✗ ${message}`);
    }

    await sleep(DELAY_MS);
  }

  console.log(`\nDone. ${results.length} uploaded, ${errors.length} failed.`);

  if (results.length > 0) {
    console.log('\nFile IDs:');
    for (const { filename, id } of results) {
      console.log(`  ${id}  ${filename}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
