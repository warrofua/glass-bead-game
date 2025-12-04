import { Prelude, Seed, sanitizeMarkdown } from '@gbg/types';
import { LlamaCppClient } from './judge/llm.js';

interface LLMClient {
  prompt(text: string): Promise<string>;
}

function formatList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  const head = items.slice(0, -1).join(', ');
  const tail = items[items.length - 1];
  return `${head}, and ${tail}`;
}

function craftOvertureFromMotifs(motifs: Array<Pick<Seed, 'text' | 'domain'>>): string {
  const phrases = motifs
    .map((m) => {
      const text = (m.text ?? '').trim();
      const domain = (m.domain ?? '').trim();
      if (!text || !domain) return '';
      return `${text} (${domain})`;
    })
    .filter(Boolean);
  if (phrases.length === 0)
    return sanitizeMarkdown('The Magister awaits your inspirations. Illuminate the board.');
  const list = formatList(phrases);
  return sanitizeMarkdown(`The Magister whispers of ${list}—can you braid them into concord?`);
}

export function samplePrelude(): Prelude {
  const motifs: Seed[] = [
    { id: 's1', text: "Kepler's 3rd law", domain: 'astronomy' },
    { id: 's2', text: 'West African kente patterns', domain: 'textiles' },
    { id: 's3', text: 'Amnesty', domain: 'civics' }
  ];
  return {
    motifs,
    overture: craftOvertureFromMotifs(motifs)
  };
}

function normalizeMotifs(raw: any[]): Array<Pick<Seed, 'text' | 'domain'>> {
  return raw
    .map((entry) => ({
      text: sanitizeMarkdown(entry?.text ?? ''),
      domain: sanitizeMarkdown(entry?.domain ?? '')
    }))
    .filter((entry) => entry.text && entry.domain);
}

export async function generatePrelude(
  client?: LLMClient
): Promise<Prelude> {
  const modelPath = process.env.LLM_MODEL_PATH;
  const fallback = samplePrelude();
  if (!modelPath) return fallback;

  try {
    const llmClient = client || new LlamaCppClient();

    const promptText = [
      'You are Magister Ludi. Respond with pure JSON matching',
      '{"motifs":[{"text":"","domain":""},...],"overture":""}.',
      'Return three motifs from distinct knowledge domains and a single-paragraph',
      'overture (<240 characters) inviting players to weave them together.'
    ].join(' ');

    const output = await llmClient.prompt(promptText);

    const start = output.indexOf('{');
    const end = output.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      const json = output.slice(start, end + 1);
      const parsed = JSON.parse(json);
      const sourceMotifs = Array.isArray(parsed?.motifs)
        ? parsed.motifs
        : Array.isArray(parsed?.seeds)
        ? parsed.seeds
        : [];
      const motifs = normalizeMotifs(sourceMotifs).slice(0, 3);
      const fallbackMotifs = fallback.motifs.map((m) => ({ text: m.text, domain: m.domain }));
      for (let i = motifs.length; i < 3 && i < fallbackMotifs.length; i++) {
        motifs.push({
          text: sanitizeMarkdown(fallbackMotifs[i].text),
          domain: sanitizeMarkdown(fallbackMotifs[i].domain)
        });
      }
      if (motifs.length) {
        const overtureCandidate = sanitizeMarkdown((parsed?.overture ?? '').toString());
        const overture = overtureCandidate.trim().length
          ? overtureCandidate.trim().slice(0, 240)
          : craftOvertureFromMotifs(motifs);
        return {
          motifs: motifs.map((motif, idx) => ({
            id: `s${idx + 1}`,
            text: motif.text,
            domain: motif.domain
          })),
          overture
        };
      }
    }
  } catch (err) {
    console.warn('LLM prelude generation failed', err);
  }

  return fallback;
}

export default generatePrelude;
