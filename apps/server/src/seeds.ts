import { GameState, sanitizeMarkdown } from '@gbg/types';
import { Ollama } from 'ollama';

interface LLMClient {
  generate(model: string, prompt: string): AsyncIterable<string>;
}

/** Return a fixed set of sample seeds used when no LLM is available. */
export function sampleSeeds(): GameState['seeds'] {
  return [
    { id: 's1', text: "Kepler's 3rd law", domain: 'astronomy' },
    { id: 's2', text: 'West African kente patterns', domain: 'textiles' },
    { id: 's3', text: 'Amnesty', domain: 'civics' }
  ];
}

/**
 * Generate three seeds using a local LLM. Falls back to {@link sampleSeeds} on error
 * or when no model is configured via the `LLM_MODEL` environment variable.
 */
export async function generateSeeds(
  client: LLMClient = new Ollama()
): Promise<GameState['seeds']> {
  const model = process.env.LLM_MODEL;
  if (!model) return sampleSeeds();
  try {
    const prompt =
      'Provide 3 concise game seeds from disjoint knowledge domains as a JSON array of {"text","domain"}.';
    let output = '';
    for await (const part of client.generate(model, prompt)) {
      output += part;
    }
    const parsed = JSON.parse(output);
    if (Array.isArray(parsed)) {
      const seeds = parsed.slice(0, 3).map((s: any, i: number) => ({
        id: `s${i + 1}`,
        text: sanitizeMarkdown(s.text ?? ''),
        domain: sanitizeMarkdown(s.domain ?? '')
      })).filter(s => s.text && s.domain);
      if (seeds.length === 3) return seeds;
    }
  } catch (err) {
    console.warn('LLM seed generation failed', err);
  }
  return sampleSeeds();
}

export default generateSeeds;
