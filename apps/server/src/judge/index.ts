import { GameState, JudgedScores, JudgmentScroll, GraphState, addBead, addEdge, findStrongestPaths } from '@gbg/types';
import { score as resonance } from './resonance.js';
import { score as novelty } from './novelty.js';
import { score as integrity } from './integrity.js';
import { score as aesthetics } from './aesthetics.js';
import { score as resilience } from './resilience.js';

const WEIGHTS = {
  resonance: 0.30,
  novelty: 0.20,
  integrity: 0.20,
  aesthetics: 0.20,
  resilience: 0.10,
} as const;

export function judge(state: GameState): JudgmentScroll {
  const scores: Record<string, JudgedScores> = {};

  for (const p of state.players) {
    const beadCount = Object.values(state.beads).filter(b => b.ownerId === p.id).length;
    const edgeCount = Object.values(state.edges).filter(e => {
      const owns = state.beads[e.from]?.ownerId === p.id || state.beads[e.to]?.ownerId === p.id;
      return owns;
    }).length;
    const slice = { beadCount, edgeCount };
    const r = resonance(state, p.id);
    const n = novelty(state, p.id);
    const i = integrity(state, p.id);
    const a = aesthetics(slice);
    const rs = resilience(slice);
    const contributions = {
      resonance: WEIGHTS.resonance * r,
      novelty: WEIGHTS.novelty * n,
      integrity: WEIGHTS.integrity * i,
      aesthetics: WEIGHTS.aesthetics * a,
      resilience: WEIGHTS.resilience * rs,
    } as const;
    const total =
      contributions.resonance +
      contributions.novelty +
      contributions.integrity +
      contributions.aesthetics +
      contributions.resilience;
    scores[p.id] = {
      resonance: r,
      novelty: n,
      integrity: i,
      aesthetics: a,
      resilience: rs,
      contributions,
      total,
    };
  }

  const graph: GraphState = { beads: {}, edges: {}, outbound: {}, inbound: {} };
  for (const bead of Object.values(state.beads)) addBead(graph, bead);
  for (const edge of Object.values(state.edges)) addEdge(graph, edge);
  const strongPaths = findStrongestPaths(graph, 3, { maxDepth: 8, maxVisits: 1_000 }).map(p => ({
    nodes: p.nodes,
    why: `weight ${p.weight.toFixed(2)}`
  }));
  const weakSpots = Object.values(state.beads)
    .filter(b => (graph.outbound[b.id]?.length || 0) + (graph.inbound[b.id]?.length || 0) === 0)
    .map(b => b.id);

  const winner = Object.entries(scores).sort((a, b) => b[1].total - a[1].total)[0]?.[0];
  return { winner, scores, strongPaths, weakSpots, missedFuse: undefined };
}

export default judge;
