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
  const secretsPath = resolve(root, '.env.secrets');
  const examplePath = resolve(root, '.env.secrets.example');
  const configPath = resolve(root, '.env.config');

  if (!existsSync(configPath)) {
    console.warn('[env] ℹ️  .env.config not found — non-sensitive config may be missing');
  }

  if (!existsSync(examplePath)) {
    console.warn('[env] ℹ️  .env.secrets.example not found, skipping secrets check');
    return;
  }

  const exampleKeys = parseEnvKeys(examplePath);

  if (!existsSync(secretsPath)) {
    console.error(
      `[env] 🛑  .env.secrets file not found. Missing variables:\n  ${[...exampleKeys].join('\n  ')}`,
    );
    process.exit(1);
  }

  const secretsKeys = parseEnvKeys(secretsPath);

  const missing = [...exampleKeys].filter((k) => !secretsKeys.has(k));
  const extra = [...secretsKeys].filter((k) => !exampleKeys.has(k));

  if (missing.length > 0) {
    console.error(
      `[env] 🛑  Missing secrets (in .env.secrets.example but not in .env.secrets):\n  ${missing.join('\n  ')}`,
    );
    process.exit(1);
  }

  if (extra.length > 0) {
    console.warn(
      `[env] ℹ️  Unknown secrets (in .env.secrets but not in .env.secrets.example):\n  ${extra.join('\n  ')}`,
    );
  }
}
