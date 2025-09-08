import { test } from 'node:test';
import assert from 'node:assert';
import type { GameState } from '@gbg/types';
import { scoreNovelty } from '../../../judge/novelty.ts';

function baseState(): GameState {
  return {
    id: 'm1',
    round: 1,
    phase: 'Play',
    players: [
      { id: 'p1', handle: 'A', resources: { insight: 0, restraint: 0, wildAvailable: false } },
      { id: 'p2', handle: 'B', resources: { insight: 0, restraint: 0, wildAvailable: false } }
    ],
    seeds: [],
    beads: {},
    edges: {},
    moves: [],
    createdAt: 0,
    updatedAt: 0
  };
}

test('duplicate bead content penalizes novelty', () => {
  const state = baseState();
  state.beads['b1'] = {
    id: 'b1', ownerId: 'p1', modality: 'text',
    content: 'alpha beta gamma delta', complexity: 1, createdAt: 0
  };
  state.beads['b2'] = {
    id: 'b2', ownerId: 'p2', modality: 'text',
    content: 'alpha beta gamma delta', complexity: 1, createdAt: 0
  };
  const scores = scoreNovelty(state);
  assert.strictEqual(scores['p1'], 0);
  assert.strictEqual(scores['p2'], 0);
  assert.ok(state.noveltyHashes && state.noveltyHashes['b1']);
});

test('unique bead content yields full novelty', () => {
  const state = baseState();
  state.beads['b1'] = {
    id: 'b1', ownerId: 'p1', modality: 'text',
    content: 'alpha beta gamma delta', complexity: 1, createdAt: 0
  };
  state.beads['b2'] = {
    id: 'b2', ownerId: 'p2', modality: 'text',
    content: 'omega phi chi psi', complexity: 1, createdAt: 0
  };
  const scores = scoreNovelty(state);
  assert.strictEqual(scores['p1'], 1);
  assert.strictEqual(scores['p2'], 1);
});
