import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

function parseEnvKeys(filePath: string): Set<string> {
  const content = readFileSync(filePath, 'utf-8');
  const keys = new Set<string>();
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      keys.add(trimmed.slice(0, eqIndex).trim());
    }
  }
  return keys;
}

export function checkEnv(): void {
  // dist/check-env.js → dist/ → api/ → projects/ → repo root
  const root = resolve(__dirname, '../../../');
  const envPath = resolve(root, '.env');
  const examplePath = resolve(root, '.env.example');

  if (!existsSync(examplePath)) {
    console.warn('[env] ℹ️. .env.example not found, skipping config check');
    return;
  }

  const exampleKeys = parseEnvKeys(examplePath);

  if (!existsSync(envPath)) {
    console.error(
      `[env] 🛑  .env file not found. Missing variables:\n  ${[...exampleKeys].join('\n  ')}`,
    );
    process.exit(1);
  }

  const envKeys = parseEnvKeys(envPath);

  const missing = [...exampleKeys].filter((k) => !envKeys.has(k));
  const extra = [...envKeys].filter((k) => !exampleKeys.has(k));

  if (missing.length > 0) {
    console.error(
      `[env] 🛑  Missing variables (in .env.example but not in .env):\n  ${missing.join('\n  ')}`,
    );
    process.exit(1);
  }

  if (extra.length > 0) {
    console.warn(
      `[env] ℹ️  Unknown variables (in .env but not in .env.example):\n  ${extra.join('\n  ')}`,
    );
  }
}
