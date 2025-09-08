import { GameState } from "@gbg/types";

// List of keyword opposition pairs
const oppositions: Array<[string, string]> = [
  ["war", "peace"],
  ["love", "hate"],
  ["light", "dark"],
  ["good", "evil"],
  ["hot", "cold"],
  ["day", "night"],
];

// Words that imply similarity; using these with opposite titles signals contradiction
const similarityWords = ["similar", "same", "alike", "equivalent", "analogous", "akin"];

export interface IntegrityResult {
  flagged: string[]; // edge ids that appear contradictory
}

/**
 * Examine binds in the game state and flag those whose justification claims
 * similarity between beads with obviously opposing titles.  Uses a small list
 * of keyword opposition pairs for the detection.
 */
export function checkIntegrity(state: GameState): IntegrityResult {
  const flagged: string[] = [];
  for (const edge of Object.values(state.edges)) {
    const fromTitle = state.beads[edge.from]?.title?.toLowerCase() ?? "";
    const toTitle = state.beads[edge.to]?.title?.toLowerCase() ?? "";
    const just = edge.justification.toLowerCase();

    if (!similarityWords.some((w) => just.includes(w))) continue;

    for (const [a, b] of oppositions) {
      const cond1 = fromTitle.includes(a) && toTitle.includes(b);
      const cond2 = fromTitle.includes(b) && toTitle.includes(a);
      if (cond1 || cond2) {
        flagged.push(edge.id);
        break;
      }
    }
  }
  return { flagged };
}
