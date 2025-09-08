import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateResilience, mulberry32 } from '../src/judge/resilience.ts';
import { GameState } from '@gbg/types';

test('resilience evaluation is deterministic with seeded RNG', () => {
  const state: GameState = {
    id: 'g1',
    round: 1,
    phase: 'play',
    players: [
      { id: 'p1', handle: 'A', resources: { insight: 0, restraint: 0, wildAvailable: false } },
      { id: 'p2', handle: 'B', resources: { insight: 0, restraint: 0, wildAvailable: false } }
    ],
    seeds: [],
    beads: {
      b1: { id: 'b1', ownerId: 'p1', modality: 'text', content: 'b1', complexity: 1, createdAt: 0 },
      b2: { id: 'b2', ownerId: 'p2', modality: 'text', content: 'b2', complexity: 1, createdAt: 0 }
    },
    edges: {
      e1: { id: 'e1', from: 'b1', to: 'b2', label: 'analogy', justification: 'J1' },
      e2: { id: 'e2', from: 'b2', to: 'b1', label: 'analogy', justification: 'J2' }
    },
    moves: [],
    createdAt: 0,
    updatedAt: 0
  };

  const rng1 = mulberry32(42);
  const rng2 = mulberry32(42);
  const r1 = evaluateResilience(state, 5, rng1);
  const r2 = evaluateResilience(state, 5, rng2);
  assert.deepEqual(r1, r2);
  assert.ok(r1.weakSpots.length > 0);
});
