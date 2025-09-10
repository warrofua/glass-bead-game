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
    const start = output.indexOf('[');
    const end = output.lastIndexOf(']');
    if (start !== -1 && end !== -1 && end > start) {
      const json = output.slice(start, end + 1);
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        const seeds = parsed
          .slice(0, 3)
          .map((s: any) => ({
            text: sanitizeMarkdown(s.text ?? ''),
            domain: sanitizeMarkdown(s.domain ?? '')
          }))
          .filter((s) => s.text && s.domain);
        if (seeds.length > 0) {
          const fallback = sampleSeeds();
          const baseLen = seeds.length;
          for (let i = 0; i < 3 - baseLen; i++) {
            const f = fallback[i];
            seeds.push({
              text: sanitizeMarkdown(f.text),
              domain: sanitizeMarkdown(f.domain)
            });
          }
          return seeds.map((s, i) => ({ id: `s${i + 1}`, ...s }));
        }
      }
    }
  } catch (err) {
    console.warn('LLM seed generation failed', err);
  }
  return sampleSeeds();
}

export default generateSeeds;
