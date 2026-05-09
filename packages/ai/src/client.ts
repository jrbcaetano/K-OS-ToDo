import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

/** Models per ADR 0018. */
export const MODELS = {
  // Cheap parsing — capture NL → fields
  haiku: 'claude-haiku-4-5',
  // Reasoning — agent suggestions, summaries
  sonnet: 'claude-sonnet-4-6',
} as const;
