import { GameState, JudgmentScroll, JudgedScores } from "@gbg/types";
import { evaluateAesthetics } from "./aesthetics";
import { checkIntegrity } from "./integrity";

export { evaluateAesthetics } from "./aesthetics";
export { checkIntegrity } from "./integrity";

/**
 * Central judge pipeline combining all heuristic modules.
 */
export function judge(state: GameState): JudgmentScroll {
  const scores: Record<string, JudgedScores> = {};
  const integrity = checkIntegrity(state);

  for (const p of state.players) {
    const playerBeads = Object.values(state.beads).filter(
      (b) => b.ownerId === p.id
    );
    const playerEdges = Object.values(state.edges).filter((e) => {
      const fromOwner = state.beads[e.from]?.ownerId;
      const toOwner = state.beads[e.to]?.ownerId;
      return fromOwner === p.id || toOwner === p.id;
    });

    const beadCount = playerBeads.length;
    const edgeCount = playerEdges.length;

    const resonance = Math.min(
      1,
      (edgeCount / Math.max(1, beadCount)) * 0.6 + 0.2
    );
    const aesthetics = evaluateAesthetics(playerBeads);
    const novelty = 0.4 + 0.1 * Math.tanh(beadCount / 4);
    const flaggedEdges = playerEdges.filter((e) => integrity.flagged.includes(e.id))
      .length;
    const integrityScore = Math.max(
      0,
      1 - flaggedEdges / Math.max(1, playerEdges.length)
    );
    const resilience = 0.5; // placeholder for now
    const total =
      0.3 * resonance +
      0.2 * novelty +
      0.2 * integrityScore +
      0.2 * aesthetics +
      0.1 * resilience;

    scores[p.id] = {
      resonance,
      aesthetics,
      novelty,
      integrity: integrityScore,
      resilience,
      total,
    };
  }

  const winner = Object.entries(scores).sort((a, b) => b[1].total - a[1].total)[0]?.[0];

  return {
    winner,
    scores,
    strongPaths: [],
    weakSpots: integrity.flagged,
    missedFuse: undefined,
  };
}
