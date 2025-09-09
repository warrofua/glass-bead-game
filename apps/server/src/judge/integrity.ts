import type { GameState } from '@gbg/types';

const CONTRADICTION_RE = /\b(?:not|no|never|n't)\b/i;

/**
 * Integrity penalizes edges whose justifications contain explicit
 * contradictions or negations, approximating an NLI check.
 */
export function score(state: GameState, playerId: string): number {
  const edges = Object.values(state.edges).filter(
    (e) => state.beads[e.from]?.ownerId === playerId || state.beads[e.to]?.ownerId === playerId
  );
  if (edges.length === 0) return 1;
  let contradictions = 0;
  for (const e of edges) {
    if (CONTRADICTION_RE.test(e.justification)) contradictions++;
  }
  return 1 - contradictions / edges.length;
}
