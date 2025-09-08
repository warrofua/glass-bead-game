import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState, Move, validateMove } from '../src/index.ts';

const baseState: GameState = {
  id: 'g',
  round: 1,
  phase: 'play',
  players: [
    { id: 'p1', handle: 'p1', resources: { insight: 0, restraint: 0, wildAvailable: false } },
    { id: 'p2', handle: 'p2', resources: { insight: 0, restraint: 0, wildAvailable: false } }
  ],
  seeds: [],
  beads: {},
  edges: {},
  moves: [],
  createdAt: 0,
  updatedAt: 0,
};

test('cast respects twist modality lock', () => {
  const state: GameState = {
    ...baseState,
    twist: { id: 't', name: 'only image', description: '', effect: { modalityLock: ['image'] } }
  };
  const move: Move = {
    id: 'm1',
    playerId: 'p1',
    type: 'cast',
    payload: {
      bead: { id: 'b1', ownerId: 'p1', modality: 'text', content: 'hi', complexity: 1, createdAt: 0 }
    },
    timestamp: 1,
    durationMs: 0,
    valid: true,
  };
  assert.equal(validateMove(move, state), false);
});

test('bind respects required relation from twist', () => {
  const state: GameState = {
    ...baseState,
    beads: {
      a: { id: 'a', ownerId: 'p1', modality: 'text', content: 'A', complexity: 1, createdAt: 0 },
      b: { id: 'b', ownerId: 'p2', modality: 'text', content: 'B', complexity: 1, createdAt: 0 },
    },
    twist: { id: 't', name: 'causality only', description: '', effect: { requiredRelation: 'causality' } },
  };
  const move: Move = {
    id: 'm2',
    playerId: 'p1',
    type: 'bind',
    payload: { from: 'a', to: 'b', label: 'analogy', justification: 'First. Second.' },
    timestamp: 1,
    durationMs: 0,
    valid: true,
  };
  assert.equal(validateMove(move, state), false);
});

test('counterpoint references opponent bead', () => {
  const state: GameState = {
    ...baseState,
    beads: {
      x: { id: 'x', ownerId: 'p2', modality: 'text', content: 'X', complexity: 1, createdAt: 0 },
    },
  };
  const move: Move = {
    id: 'm3',
    playerId: 'p1',
    type: 'counterpoint',
    payload: { targetId: 'x' },
    timestamp: 1,
    durationMs: 0,
    valid: true,
  };
  assert.equal(validateMove(move, state), true);
  const badMove: Move = { ...move, payload: { targetId: 'missing' } };
  assert.equal(validateMove(badMove, state), false);
});
