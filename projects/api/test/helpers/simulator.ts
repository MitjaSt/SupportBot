import { FOLLOW_UP_INSTRUCTION } from './criteria';

/**
 * Wraps a core simulator prompt with the shared follow-up instruction and
 * the standard output formatting directive. Centralises the prompt structure
 * so future changes apply everywhere without touching individual test files.
 *
 * @param corePrompt - The scenario-specific instructions for the simulated caller.
 */
export function makeSimulatorPrompt(corePrompt: string): string {
  return `${corePrompt} ${FOLLOW_UP_INSTRUCTION} At each turn output only the caller next message.`;
}
