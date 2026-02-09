import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';
import type { ScenarioResult } from '@langwatch/scenario';
import type { RagInteraction } from './agent-adapter';
import { CACHE_DIR } from './constants';

export function saveSimulationResult(
  name: string,
  result: ScenarioResult,
  description: string,
  ragInteractions: RagInteraction[],
): string {
  mkdirSync(CACHE_DIR, { recursive: true });

  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/[-:T.Z]/g, '')
    .slice(0, 14);
  const safeName = name.toLowerCase().replace(/\s+/g, '_');
  const filepath = join(CACHE_DIR, `${timestamp}_${safeName}.yaml`);

  const messages = result.messages.map((msg) => ({
    role: msg.role ?? 'unknown',
    content:
      typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
  }));

  const output = {
    name,
    description,
    timestamp,
    success: result.success,
    reasoning: result.reasoning ?? '',
    passed_criteria: result.metCriteria,
    failed_criteria: result.unmetCriteria,
    total_time: result.totalTime,
    agent_time: result.agentTime,
    conversation: messages,
    rag_interactions: ragInteractions,
  };

  writeFileSync(
    filepath,
    yaml.dump(output, {
      flowLevel: -1,
      sortKeys: false,
      lineWidth: 120,
    }),
  );

  return filepath;
}
