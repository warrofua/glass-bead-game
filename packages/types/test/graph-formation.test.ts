import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateMove,
  applyMove,
  addBead,
  addEdge,
  neighbors,
  type GameState,
  type Move,
  type Bead,
  type Edge,
  GraphState,
} from '../src/index.ts';

function baseState(): GameState {
  return {
    id: 'g',
    round: 1,
    phase: 'play',
    players: [
      {
        id: 'p1',
        handle: 'P1',
        resources: { insight: 5, restraint: 5, wildAvailable: true },
      },
    ],
    prelude: { motifs: [{ id: 's1', text: 'seed', domain: 'd' }], overture: 'Prelude' },
    beads: {},
    edges: {},
    moves: [],
    createdAt: 0,
    updatedAt: 0,
  };
}

test('cast and bind moves produce a connected graph', () => {
  const state = baseState();

  const beadA: Bead = {
    id: 'a',
    ownerId: 'p1',
    modality: 'text',
    content: 'A',
    complexity: 1,
    createdAt: 0,
    seedId: 's1',
  };
  const castA: Move = {
    id: 'm1',
    playerId: 'p1',
    type: 'cast',
    timestamp: 1,
    durationMs: 0,
    valid: true,
    payload: { bead: beadA },
  };
  assert.ok(validateMove(castA, state).ok);
  applyMove(state, castA);

  const beadB: Bead = {
    id: 'b',
    ownerId: 'p1',
    modality: 'text',
    content: 'B',
    complexity: 2,
    createdAt: 0,
    seedId: 's1',
  };
  const castB: Move = {
    id: 'm2',
    playerId: 'p1',
    type: 'cast',
    timestamp: 2,
    durationMs: 0,
    valid: true,
    payload: { bead: beadB },
  };
  assert.ok(validateMove(castB, state).ok);
  applyMove(state, castB);

  const bind: Move = {
    id: 'm3',
    playerId: 'p1',
    type: 'bind',
    timestamp: 3,
    durationMs: 0,
    valid: true,
    payload: {
      from: 'a',
      to: 'b',
      label: 'analogy',
      justification: 'One. Two.',
    },
  };
  assert.ok(validateMove(bind, state).ok);
  applyMove(state, bind);

  const graph: GraphState = { beads: {}, edges: {}, outbound: {}, inbound: {} };
  Object.values(state.beads).forEach((b) => addBead(graph, b));
  Object.values(state.edges).forEach((e) => addEdge(graph, e as Edge));

  assert.deepEqual(neighbors(graph, 'a'), ['b']);
});

test('bind validation rejects self edges and short justifications', () => {
  const state = baseState();
  const bead: Bead = {
    id: 'a',
    ownerId: 'p1',
    modality: 'text',
    content: 'A',
    complexity: 1,
    createdAt: 0,
    seedId: 's1',
  };
  const cast: Move = {
    id: 'm1',
    playerId: 'p1',
    type: 'cast',
    timestamp: 1,
    durationMs: 0,
    valid: true,
    payload: { bead },
  };
  assert.ok(validateMove(cast, state).ok);
  applyMove(state, cast);

  const selfEdge: Move = {
    id: 'm2',
    playerId: 'p1',
    type: 'bind',
    timestamp: 2,
    durationMs: 0,
    valid: true,
    payload: {
      from: 'a',
      to: 'a',
      label: 'analogy',
      justification: 'First. Second.',
    },
  };
  assert.equal(validateMove(selfEdge, state).ok, false);

  const missing: Move = {
    id: 'm3',
    playerId: 'p1',
    type: 'bind',
    timestamp: 3,
    durationMs: 0,
    valid: true,
    payload: {
      from: 'a',
      to: 'x',
      label: 'analogy',
      justification: 'Only one sentence.',
    },
  };
  assert.equal(validateMove(missing, state).ok, false);
});

