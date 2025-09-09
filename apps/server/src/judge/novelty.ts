import type { GameState } from '@gbg/types';

function shingles(text: string, size = 3): string[] {
  const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const result: string[] = [];
  for (let i = 0; i <= tokens.length - size; i++) {
    result.push(tokens.slice(i, i + size).join(' '));
  }
  return result;
}

/**
 * Novelty rewards beads whose shingles (n-grams) are rare across the board.
 */
export function score(state: GameState, playerId: string): number {
  const counts = new Map<string, number>();
  for (const bead of Object.values(state.beads)) {
    for (const s of shingles(bead.content)) {
      counts.set(s, (counts.get(s) || 0) + 1);
    }
  }
  const playerBeads = Object.values(state.beads).filter((b) => b.ownerId === playerId);
  if (playerBeads.length === 0) return 0;
  let unique = 0;
  let total = 0;
  for (const bead of playerBeads) {
    const sh = shingles(bead.content);
    total += sh.length;
    for (const s of sh) {
      if ((counts.get(s) || 0) === 1) unique++;
    }
  }
  return total === 0 ? 0 : unique / total;
}
