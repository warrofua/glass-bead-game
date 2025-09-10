import type { GameState } from '@gbg/types';

function shingles(text: string, size = 3): string[] {
  const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const result: string[] = [];
  for (let i = 0; i <= tokens.length - size; i++) {
    result.push(tokens.slice(i, i + size).join(' '));
  }
  return result;
}

// Minimal baseline corpus to dampen scores for common phrases. In a real
// system this would be a large dataset loaded from disk or a service.
const BASELINE_CORPUS = [
  'the quick brown fox jumps over the lazy dog',
  'lorem ipsum dolor sit amet',
  'to be or not to be that is the question',
];

const BASELINE_COUNTS: Map<string, number> = (() => {
  const counts = new Map<string, number>();
  for (const text of BASELINE_CORPUS) {
    for (const s of shingles(text)) {
      counts.set(s, (counts.get(s) || 0) + 1);
    }
  }
  return counts;
})();

/**
 * Novelty rewards beads whose shingles (n-grams) are rare across the board and
 * against a baseline corpus of common phrases.
 */
export function score(state: GameState, playerId: string): number {
  // Start with baseline counts then incorporate game beads.
  const counts = new Map(BASELINE_COUNTS);
  for (const bead of Object.values(state.beads)) {
    for (const s of shingles(bead.content)) {
      counts.set(s, (counts.get(s) || 0) + 1);
    }
  }
  const playerBeads = Object.values(state.beads).filter(b => b.ownerId === playerId);
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
