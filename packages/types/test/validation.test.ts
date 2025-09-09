import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateSeed,
  validateMove,
  applyMove,
  applyMoveWithResources,
  GameState,
  Move,
  Seed,
  Bead,
} from '../src/index.ts';

test('validateSeed accepts valid seeds', () => {
  const seed: Seed = {
    id: 's1',
    text: 'Hello <script>alert(1)</script>',
    domain: 'math<script>bad</script>',
  };
  assert.equal(validateSeed(seed), true);
  assert.ok(!seed.text.includes('<script>'));
  assert.ok(!seed.domain.includes('<script>'));
});

test('validateSeed rejects invalid seeds', () => {
  const seed: Seed = { id: 's2', text: '', domain: '' };
  assert.equal(validateSeed(seed), false);
});

test('validateMove cast success and failure', () => {
  const state: GameState = {
    id: 'g1',
    round: 1,
    phase: 'play',
    players: [
      { id: 'p1', handle: 'P1', resources: { insight: 1, restraint: 1, wildAvailable: false } },
    ],
    seeds: [],
    beads: {},
    edges: {},
    moves: [],
    createdAt: 0,
    updatedAt: 0,
  };

  const validCast: Move = {
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
      } satisfies Bead,
    },
    timestamp: 1,
    durationMs: 0,
    valid: true,
  };
  assert.equal(validateMove(validCast, state).ok, true);

  const invalidCast: Move = {
    id: 'm2',
    playerId: 'p1',
    type: 'cast',
    payload: {
      bead: {
        id: 'b2',
        ownerId: 'p1',
        modality: 'text',
        content: '',
        complexity: 1,
        createdAt: 0,
      } satisfies Bead,
    },
    timestamp: 2,
    durationMs: 0,
    valid: true,
  };
  assert.equal(validateMove(invalidCast, state).ok, false);
});

test('validateMove bind success and failure', () => {
  const bead1: Bead = {
    id: 'b1',
    ownerId: 'p1',
    modality: 'text',
    content: 'a',
    complexity: 1,
    createdAt: 0,
  };
  const bead2: Bead = {
    id: 'b2',
    ownerId: 'p1',
    modality: 'text',
    content: 'b',
    complexity: 1,
    createdAt: 0,
  };
  const state: GameState = {
    id: 'g1',
    round: 1,
    phase: 'play',
    players: [
      { id: 'p1', handle: 'P1', resources: { insight: 1, restraint: 1, wildAvailable: false } },
    ],
    seeds: [],
    beads: { b1: bead1, b2: bead2 },
    edges: {},
    moves: [],
    createdAt: 0,
    updatedAt: 0,
  };

  const validBind: Move = {
    id: 'm1',
    playerId: 'p1',
    type: 'bind',
    payload: {
      edgeId: 'e1',
      from: 'b1',
      to: 'b2',
      label: 'analogy',
      justification: 'First sentence. Second sentence.',
    },
    timestamp: 1,
    durationMs: 0,
    valid: true,
  };
  assert.equal(validateMove(validBind, state).ok, true);

  const invalidBind: Move = {
    id: 'm2',
    playerId: 'p1',
    type: 'bind',
    payload: {
      edgeId: 'e2',
      from: 'b1',
      to: 'b2',
      label: 'analogy',
      justification: 'Only one sentence.',
    },
    timestamp: 2,
    durationMs: 0,
    valid: true,
  };
  assert.equal(validateMove(invalidBind, state).ok, false);
});

test('validateMove prune success and failure', () => {
  const bead1: Bead = {
    id: 'b1',
    ownerId: 'p1',
    modality: 'text',
    content: 'a',
    complexity: 1,
    createdAt: 0,
  };
  const state: GameState = {
    id: 'g1',
    round: 1,
    phase: 'play',
    players: [
      { id: 'p1', handle: 'P1', resources: { insight: 1, restraint: 1, wildAvailable: false } },
    ],
    seeds: [],
    beads: { b1: bead1 },
    edges: {},
    moves: [],
    createdAt: 0,
    updatedAt: 0,
  };

  const valid: Move = {
    id: 'm1',
    playerId: 'p1',
    type: 'prune',
    payload: { beadId: 'b1' },
    timestamp: 1,
    durationMs: 0,
    valid: true,
  };
  assert.equal(validateMove(valid, state).ok, true);

  const invalid: Move = {
    id: 'm2',
    playerId: 'p1',
    type: 'prune',
    payload: {},
    timestamp: 1,
    durationMs: 0,
    valid: true,
  };
  assert.equal(validateMove(invalid, state).ok, false);
});

test('applyMove mutates state for cast and bind', () => {
  const bead2: Bead = {
    id: 'b2',
    ownerId: 'p1',
    modality: 'text',
    content: 'existing',
    complexity: 1,
    createdAt: 0,
  };
  const state: GameState = {
    id: 'g1',
    round: 1,
    phase: 'play',
    players: [],
    seeds: [],
    beads: { b2: bead2 },
    edges: {},
    moves: [],
    createdAt: 0,
    updatedAt: 0,
  };

  const cast: Move = {
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
      } satisfies Bead,
    },
    timestamp: 1,
    durationMs: 0,
    valid: true,
  };
  applyMove(state, cast);
  assert.ok(state.beads['b1']);
  assert.equal(state.moves.length, 1);
  assert.equal(state.updatedAt, 1);

  const bind: Move = {
    id: 'm2',
    playerId: 'p1',
    type: 'bind',
    payload: {
      edgeId: 'e1',
      from: 'b1',
      to: 'b2',
      label: 'analogy',
      justification: 'First. Second.',
    },
    timestamp: 2,
    durationMs: 0,
    valid: true,
  };
  applyMove(state, bind);
  assert.ok(state.edges['e1']);
  assert.equal(state.moves.length, 2);
  assert.equal(state.updatedAt, 2);
});

test('applyMoveWithResources deducts resources and uses wild', () => {
  const state: GameState = {
    id: 'g1',
    round: 1,
    phase: 'play',
    players: [
      { id: 'p1', handle: 'P1', resources: { insight: 2, restraint: 0, wildAvailable: true } },
      { id: 'p2', handle: 'P2', resources: { insight: 0, restraint: 1, wildAvailable: true } },
    ],
    seeds: [],
    beads: {},
    edges: {},
    moves: [],
    createdAt: 0,
    updatedAt: 0,
  };

  const cast1: Move = {
    id: 'c1',
    playerId: 'p1',
    type: 'cast',
    payload: {
      bead: {
        id: 'b1',
        ownerId: 'p1',
        modality: 'text',
        content: 'one',
        complexity: 1,
        createdAt: 0,
      } satisfies Bead,
    },
    timestamp: 1,
    durationMs: 0,
    valid: true,
  };
  applyMoveWithResources(state, cast1);
  assert.equal(state.players[0].resources.insight, 1);
  assert.equal(state.players[0].resources.wildAvailable, true);

  const cast2: Move = {
    id: 'c2',
    playerId: 'p1',
    type: 'cast',
    payload: {
      bead: {
        id: 'b2',
        ownerId: 'p1',
        modality: 'text',
        content: 'two',
        complexity: 1,
        createdAt: 0,
      } satisfies Bead,
    },
    timestamp: 2,
    durationMs: 0,
    valid: true,
  };
  applyMoveWithResources(state, cast2);
  assert.equal(state.players[0].resources.insight, 0);
  assert.equal(state.players[0].resources.wildAvailable, true);

  const cast3: Move = {
    id: 'c3',
    playerId: 'p1',
    type: 'cast',
    payload: {
      bead: {
        id: 'b3',
        ownerId: 'p1',
        modality: 'text',
        content: 'three',
        complexity: 1,
        createdAt: 0,
      } satisfies Bead,
    },
    timestamp: 3,
    durationMs: 0,
    valid: true,
  };
  applyMoveWithResources(state, cast3);
  assert.equal(state.players[0].resources.insight, 0);
  assert.equal(state.players[0].resources.wildAvailable, false);

  const bind1: Move = {
    id: 'b1',
    playerId: 'p2',
    type: 'bind',
    payload: {
      edgeId: 'e1',
      from: 'b1',
      to: 'b2',
      label: 'analogy',
      justification: 'First. Second.',
    },
    timestamp: 4,
    durationMs: 0,
    valid: true,
  };
  applyMoveWithResources(state, bind1);
  assert.equal(state.players[1].resources.restraint, 0);
  assert.equal(state.players[1].resources.wildAvailable, true);

  const bind2: Move = {
    id: 'b2',
    playerId: 'p2',
    type: 'bind',
    payload: {
      edgeId: 'e2',
      from: 'b2',
      to: 'b3',
      label: 'analogy',
      justification: 'Another. Again.',
    },
    timestamp: 5,
    durationMs: 0,
    valid: true,
  };
  applyMoveWithResources(state, bind2);
  assert.equal(state.players[1].resources.restraint, 0);
  assert.equal(state.players[1].resources.wildAvailable, false);
});

test('applyMoveWithResources prunes beads and edges', () => {
  const bead1: Bead = {
    id: 'b1', ownerId: 'p1', modality: 'text', content: 'one', complexity: 1, createdAt: 0,
  };
  const bead2: Bead = {
    id: 'b2', ownerId: 'p2', modality: 'text', content: 'two', complexity: 1, createdAt: 0,
  };
  const state: GameState = {
    id: 'g1', round: 1, phase: 'play',
    players: [
      { id: 'p1', handle: 'P1', resources: { insight: 0, restraint: 0, wildAvailable: true } },
      { id: 'p2', handle: 'P2', resources: { insight: 0, restraint: 1, wildAvailable: true } },
    ],
    seeds: [],
    beads: { b1: bead1, b2: bead2 },
    edges: {
      e1: { id: 'e1', from: 'b1', to: 'b2', label: 'analogy', justification: 'First. Second.' },
    },
    moves: [],
    createdAt: 0,
    updatedAt: 0,
  };

  const prune: Move = {
    id: 'p1',
    playerId: 'p2',
    type: 'prune',
    payload: { beadId: 'b1' },
    timestamp: 1,
    durationMs: 0,
    valid: true,
  };
  applyMoveWithResources(state, prune);
  assert.equal(state.beads['b1'], undefined);
  assert.equal(state.edges['e1'], undefined);
  assert.equal(state.players[1].resources.restraint, 0);
});

