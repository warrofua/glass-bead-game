import {
  GameState,
  JudgmentScroll,
  JudgedScores,
  GraphState,
  findStrongestPaths,
  addBead,
  addEdge,
} from "../packages/types/src/index.ts";

function toGraph(state: GameState): GraphState {
  const graph: GraphState = { beads: {}, edges: {}, outbound: {}, inbound: {} };
  for (const bead of Object.values(state.beads)) {
    addBead(graph, bead);
  }
  for (const edge of Object.values(state.edges)) {
    addEdge(graph, edge);
  }
  return graph;
}

export function judgeResonance(state: GameState): JudgmentScroll {
  const graph = toGraph(state);
  const strong = findStrongestPaths(graph, 3);
  const topWeight = strong[0]?.weight ?? 0;
  const resonance = Math.min(1, topWeight / 10);
  const scores: Record<string, JudgedScores> = {};
  for (const p of state.players) {
    const total = resonance; // other axes omitted in this sample
    scores[p.id] = {
      resonance,
      aesthetics: 0,
      novelty: 0,
      integrity: 0,
      resilience: 0,
      total,
    };
  }
  const winner = Object.entries(scores).sort((a, b) => b[1].total - a[1].total)[0]?.[0];
  return {
    winner,
    scores,
    strongPaths: strong.map((p) => ({ nodes: p.nodes, why: `weight=${p.weight.toFixed(2)}` })),
    weakSpots: [],
    missedFuse: undefined,
  };
}
