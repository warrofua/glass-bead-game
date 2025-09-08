import {
  GameState,
  JudgmentScroll,
  JudgedScores,
  GraphState,
  findStrongestPaths,
} from "../packages/types/src/index.ts";

function toGraph(state: GameState): GraphState {
  const nodes: GraphState["nodes"] = {};
  for (const b of Object.values(state.beads)) {
    nodes[b.id] = { id: b.id, weight: b.complexity ?? 1 };
  }
  const edges = Object.values(state.edges).map((e) => ({ from: e.from, to: e.to, weight: 1 }));
  return { nodes, edges };
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
