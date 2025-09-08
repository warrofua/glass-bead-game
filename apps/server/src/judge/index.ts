import { GameState, JudgedScores, JudgmentScroll } from '@gbg/types';
import { score as resonance } from './resonance.js';
import { score as novelty } from './novelty.js';
import { score as integrity } from './integrity.js';
import { score as aesthetics } from './aesthetics.js';
import { evaluateResilience, mulberry32 } from './resilience.js';

const WEIGHTS = {
  resonance: 0.30,
  novelty: 0.20,
  integrity: 0.20,
  aesthetics: 0.20,
  resilience: 0.10,
} as const;

export function judge(state: GameState): JudgmentScroll {
  const scores: Record<string, JudgedScores> = {};
  const res = evaluateResilience(state, 5, mulberry32(42));

  for (const p of state.players) {
    const beadCount = Object.values(state.beads).filter(b => b.ownerId === p.id).length;
    const edgeCount = Object.values(state.edges).filter(e => {
      const owns = state.beads[e.from]?.ownerId === p.id || state.beads[e.to]?.ownerId === p.id;
      return owns;
    }).length;
    const slice = { beadCount, edgeCount };
    const r = resonance(slice);
    const n = novelty(slice);
    const i = integrity(slice);
    const a = aesthetics(slice);
    const rs = res.scores[p.id] ?? 1;
    const total = WEIGHTS.resonance * r + WEIGHTS.novelty * n +
      WEIGHTS.integrity * i + WEIGHTS.aesthetics * a + WEIGHTS.resilience * rs;
    scores[p.id] = { resonance: r, novelty: n, integrity: i, aesthetics: a, resilience: rs, total };
  }

  const winner = Object.entries(scores).sort((a, b) => b[1].total - a[1].total)[0]?.[0];
  return { winner, scores, strongPaths: [], weakSpots: res.weakSpots, missedFuse: undefined };
}

export default judge;
