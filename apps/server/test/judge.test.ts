import { test } from 'node:test';
import assert from 'node:assert/strict';
import judge from '../src/judge/index.ts';
import { GameState } from '@gbg/types';

test('judge produces deterministic scores and winner', () => {
  const state: GameState = {
    id: 'm1',
    round: 1,
    phase: 'play',
    players: [
      { id: 'p1', handle: 'A', resources: { insight: 0, restraint: 0, wildAvailable: false } },
      { id: 'p2', handle: 'B', resources: { insight: 0, restraint: 0, wildAvailable: false } }
    ],
    seeds: [],
    beads: {
      b1: { id: 'b1', ownerId: 'p1', modality: 'text', content: 'b1', complexity: 1, createdAt: 0 },
      b2: { id: 'b2', ownerId: 'p1', modality: 'text', content: 'b2', complexity: 1, createdAt: 0 },
      b3: { id: 'b3', ownerId: 'p2', modality: 'text', content: 'b3', complexity: 1, createdAt: 0 }
    },
    edges: {
      e1: { id: 'e1', from: 'b1', to: 'b3', label: 'analogy', justification: '' },
      e2: { id: 'e2', from: 'b2', to: 'b3', label: 'analogy', justification: '' },
      e3: { id: 'e3', from: 'b1', to: 'b2', label: 'analogy', justification: '' }
    },
    moves: [],
    createdAt: 0,
    updatedAt: 0
  };

  const scroll = judge(state);
  assert.equal(scroll.winner, 'p1');
  assert.ok(Math.abs(scroll.scores['p1'].total - 0.6774576540013667) < 1e-9);
  assert.ok(Math.abs(scroll.scores['p2'].total - 0.6612243230363666) < 1e-9);
});
