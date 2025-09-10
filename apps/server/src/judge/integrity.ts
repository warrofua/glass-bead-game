import type { GameState } from '@gbg/types';

const CONTRADICTION_RE = /\b(?:not|no|never|n't|however|but|yet)\b/i;

// Tiny antonym list to approximate NLI style contradiction checks without
// heavy ML models. Only a few common oppositions are included.
const ANTONYMS: Record<string, string[]> = {
  good: ['bad', 'evil', 'poor'],
  bad: ['good', 'virtuous'],
  true: ['false'],
  false: ['true'],
  hot: ['cold'],
  cold: ['hot'],
  up: ['down'],
  down: ['up'],
  yes: ['no'],
  light: ['dark'],
  dark: ['light'],
};

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function hasAntonym(a: string[], b: string[]): boolean {
  const setB = new Set(b);
  for (const tok of a) {
    const ants = ANTONYMS[tok];
    if (ants && ants.some((x) => setB.has(x))) return true;
  }
  return false;
}

/**
 * Integrity penalizes edges whose justifications contain explicit
 * contradictions or whose connected beads express opposing concepts,
 * approximating an NLI check.
 */
export function score(state: GameState, playerId: string): number {
  const edges = Object.values(state.edges).filter(
    e => state.beads[e.from]?.ownerId === playerId || state.beads[e.to]?.ownerId === playerId
  );
  if (edges.length === 0) return 1;
  let contradictions = 0;
  for (const e of edges) {
    const from = state.beads[e.from]?.content || '';
    const to = state.beads[e.to]?.content || '';
    const tokensA = tokenize(from);
    const tokensB = tokenize(to);
    if (
      CONTRADICTION_RE.test(e.justification) ||
      hasAntonym(tokensA, tokensB) ||
      hasAntonym(tokensB, tokensA)
    ) {
      contradictions++;
    }
  }
  return 1 - contradictions / edges.length;
}
