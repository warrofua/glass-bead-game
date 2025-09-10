import type { GameState } from '@gbg/types';

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

// Simple bag-of-words embedding with cosine similarity. This avoids network
// calls while still providing a semantic signal stronger than set overlap.
function embed(text: string): Map<string, number> {
  const vec = new Map<string, number>();
  for (const tok of tokenize(text)) vec.set(tok, (vec.get(tok) || 0) + 1);
  // normalise for cosine similarity
  const norm = Math.sqrt([...vec.values()].reduce((s, v) => s + v * v, 0)) || 1;
  for (const [k, v] of vec) vec.set(k, v / norm);
  return vec;
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  for (const [k, v] of a) {
    const bv = b.get(k);
    if (bv) dot += v * bv;
  }
  return dot;
}

/**
 * Resonance measures semantic cohesion between connected beads using a
 * lightweight embedding based on cosine similarity of bag-of-words vectors.
 */
export function score(state: GameState, playerId: string): number {
  const edges = Object.values(state.edges).filter(
    e => state.beads[e.from]?.ownerId === playerId || state.beads[e.to]?.ownerId === playerId
  );
  if (edges.length === 0) return 0;
  let total = 0;
  for (const e of edges) {
    const a = embed(state.beads[e.from]?.content || '');
    const b = embed(state.beads[e.to]?.content || '');
    total += cosine(a, b);
  }
  return total / edges.length;
}
