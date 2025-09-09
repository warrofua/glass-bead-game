import type { GameState } from '@gbg/types';

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function jaccard(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter((x) => setB.has(x));
  const union = new Set([...a, ...b]);
  return union.size === 0 ? 0 : intersection.length / union.size;
}

/**
 * Resonance measures semantic cohesion between connected beads using a
 * lightweight embedding approximation via token overlap.
 */
export function score(state: GameState, playerId: string): number {
  const edges = Object.values(state.edges).filter(
    (e) => state.beads[e.from]?.ownerId === playerId || state.beads[e.to]?.ownerId === playerId
  );
  if (edges.length === 0) return 0;
  let total = 0;
  for (const e of edges) {
    const a = tokenize(state.beads[e.from]?.content || '');
    const b = tokenize(state.beads[e.to]?.content || '');
    total += jaccard(a, b);
  }
  return total / edges.length;
}
