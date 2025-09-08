import { GameState, Bead, Edge } from "@gbg/types";

export interface ResilienceResult {
  scores: Record<string, number>;
  weakSpots: string[];
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function scoreTotals(state: GameState): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const p of state.players) {
    const beads = Object.values<Bead>(state.beads).filter(b => b.ownerId === p.id);
    const edges = Object.values<Edge>(state.edges).filter(e => {
      const owns = state.beads[e.from]?.ownerId === p.id || state.beads[e.to]?.ownerId === p.id;
      return owns;
    });
    const beadCount = beads.length;
    const edgeCount = edges.length;
    const resonance = Math.min(1, (edgeCount / Math.max(1, beadCount)) * 0.6 + 0.2);
    const aesthetics = Math.min(1, beadCount > 0 ? 0.3 + 0.05 * beadCount : 0.2);
    const novelty = 0.4 + 0.1 * Math.tanh(beadCount / 4);
    const integrity = 0.5 + 0.1 * Math.tanh(edgeCount / 5);
    const resilience = 0.5;
    const total =
      0.30 * resonance +
      0.20 * novelty +
      0.20 * integrity +
      0.20 * aesthetics +
      0.10 * resilience;
    totals[p.id] = total;
  }
  return totals;
}

export function evaluateResilience(
  state: GameState,
  trials = 5,
  rng: () => number = Math.random
): ResilienceResult {
  const players = state.players.map(p => p.id);
  const baseline = scoreTotals(state);
  const drops: Record<string, number> = Object.fromEntries(
    players.map((id) => [id, 0] as [string, number])
  );
  const weakImpact: Record<string, number> = {};
  const edges = Object.values<Edge>(state.edges);

  if (edges.length === 0) {
    return {
      scores: Object.fromEntries(players.map((id) => [id, 1] as [string, number])),
      weakSpots: [],
    };
  }

  for (let i = 0; i < trials; i++) {
    const edge = edges[Math.floor(rng() * edges.length)];
    const modifiedEdges = { ...state.edges };
    if (rng() < 0.5) {
      delete modifiedEdges[edge.id];
    } else {
      modifiedEdges[edge.id] = { ...edge, from: edge.to, to: edge.from };
    }
    const modifiedState: GameState = { ...state, edges: modifiedEdges };
    const perturbed = scoreTotals(modifiedState);
    for (const pid of players) {
      const drop = Math.max(0, (baseline[pid] || 0) - (perturbed[pid] || 0));
      drops[pid] += drop;
      weakImpact[edge.id] = (weakImpact[edge.id] || 0) + drop;
    }
  }

  const scores: Record<string, number> = {};
  for (const pid of players) {
    const avgDrop = drops[pid] / trials;
    const res = Math.max(0, Math.min(1, 1 - avgDrop));
    scores[pid] = res;
  }

  const weakSpots = Object.entries(weakImpact)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);

  return { scores, weakSpots };
}

export { mulberry32 };
