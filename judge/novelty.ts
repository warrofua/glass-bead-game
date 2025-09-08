import type { GameState, Bead } from "@gbg/types";

/**
 * Compute per-player novelty scores based on 3-word shingles of bead content.
 * Returns a map of playerId to normalized novelty score in [0,1].
 * Mutates the provided state to store per-bead shingle hashes for reuse.
 */
export function scoreNovelty(state: GameState): Record<string, number> {
  const beadHashes: Record<string, Set<number>> = {};
  const hashToBeads = new Map<number, Set<string>>();

  for (const bead of Object.values(state.beads)) {
    const hashes = shingleHashes(bead.content);
    beadHashes[bead.id] = hashes;
    for (const h of hashes) {
      if (!hashToBeads.has(h)) hashToBeads.set(h, new Set());
      hashToBeads.get(h)!.add(bead.id);
    }
  }

  // store hashes on the state for later reuse
  state.noveltyHashes = {};
  for (const [id, set] of Object.entries(beadHashes)) {
    state.noveltyHashes[id] = Array.from(set);
  }

  const playerTotals: Record<string, { total: number; unique: number }> = {};

  for (const [id, set] of Object.entries(beadHashes)) {
    const bead = state.beads[id] as Bead;
    const owner = bead.ownerId;
    if (!playerTotals[owner]) playerTotals[owner] = { total: 0, unique: 0 };
    playerTotals[owner].total += set.size;
    for (const h of set) {
      if (hashToBeads.get(h)?.size === 1) {
        playerTotals[owner].unique++;
      }
    }
  }

  const scores: Record<string, number> = {};
  for (const [playerId, { total, unique }] of Object.entries(playerTotals)) {
    scores[playerId] = total === 0 ? 1 : unique / total;
  }
  return scores;
}

function shingleHashes(text: string): Set<number> {
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);
  const set = new Set<number>();
  for (let i = 0; i <= words.length - 3; i++) {
    const shingle = words.slice(i, i + 3).join(" ");
    set.add(hash(shingle));
  }
  return set;
}

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return h >>> 0; // convert to unsigned
}
