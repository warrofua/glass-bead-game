import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState, Move, replayMoves } from '../src/index.ts';

test('replayMoves applies cast and bind moves', () => {
  const initial: GameState = {
    id: 'g1',
    round: 1,
    phase: 'play',
    players: [],
    seeds: [],
    beads: {},
    edges: {},
    moves: [],
    createdAt: 0,
    updatedAt: 0,
  };

  const cast1: Move = {
    id: 'm1',
    playerId: 'p1',
    type: 'cast',
    payload: {
      bead: {
        id: 'b1',
        ownerId: 'p1',
        modality: 'text',
        content: 'hello',
        complexity: 1,
        createdAt: 0,
      },
    },
    timestamp: 1,
    durationMs: 0,
    valid: true,
  };

  const cast2: Move = {
    id: 'm2',
    playerId: 'p2',
    type: 'cast',
    payload: {
      bead: {
        id: 'b2',
        ownerId: 'p2',
        modality: 'text',
        content: 'world',
        complexity: 1,
        createdAt: 0,
      },
    },
    timestamp: 2,
    durationMs: 0,
    valid: true,
  };

  const bind: Move = {
    id: 'm3',
    playerId: 'p1',
    type: 'bind',
    payload: {
      edgeId: 'e1',
      from: 'b1',
      to: 'b2',
      label: 'analogy',
      justification: 'First sentence. Second.',
    },
    timestamp: 3,
    durationMs: 0,
    valid: true,
  };

  const result = replayMoves(initial, [cast1, cast2, bind]);
  assert.equal(Object.keys(result.beads).length, 2);
  assert.ok(result.edges['e1']);
  assert.equal(result.moves.length, 3);
  assert.equal(initial.moves.length, 0);
});
