import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState, Move, Bead, validateMove, applyMove } from '../src/index.ts';

test('cathedral move validates and applies', () => {
  const bead: Bead = { id: 'b1', ownerId: 'p1', modality: 'text', content: 'a', complexity: 1, createdAt: 0 };
  const state: GameState = {
    id: 'g1',
    round: 1,
    phase: 'play',
    players: [ { id: 'p1', handle: 'P1', resources: { insight: 0, restraint: 0, wildAvailable: true } } ],
    seeds: [],
    beads: { b1: bead },
    edges: {},
    moves: [],
    createdAt: 0,
    updatedAt: 0,
  };

  const move: Move = {
    id: 'm1',
    playerId: 'p1',
    type: 'cathedral',
    payload: { content: 'Final <b>idea</b>', references: ['b1'] },
    timestamp: 1,
    durationMs: 0,
    valid: true,
  };
  assert.equal(validateMove(move, state).ok, true);
  applyMove(state, move);
  assert.equal(state.cathedral?.content, 'Final <b>idea</b>');
  assert.deepEqual(state.cathedral?.references, ['b1']);

  const badMove: Move = {
    id: 'm2',
    playerId: 'p1',
    type: 'cathedral',
    payload: { content: '', references: ['missing'] },
    timestamp: 2,
    durationMs: 0,
    valid: true,
  };
  assert.equal(validateMove(badMove, state).ok, false);
});
