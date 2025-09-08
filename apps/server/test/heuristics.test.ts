import { test } from 'node:test';
import assert from 'node:assert';
import { checkIntegrity } from '../src/judge/integrity';
import { evaluateAesthetics } from '../src/judge/aesthetics';
import { judge } from '../src/judge/index.js';
import { GameState, Bead, Edge } from '@gbg/types';

function sampleState(): GameState {
  return {
    id: 'm1',
    round: 1,
    phase: 'Play',
    players: [
      { id: 'p1', handle: 'A', resources: { insight: 0, restraint: 0, wildAvailable: false } },
      { id: 'p2', handle: 'B', resources: { insight: 0, restraint: 0, wildAvailable: false } },
    ],
    seeds: [],
    beads: {},
    edges: {},
    moves: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

test('checkIntegrity flags contradictory bind', () => {
  const state = sampleState();
  const bead1: Bead = { id: 'b1', ownerId: 'p1', modality: 'text', title: 'Love', content: 'love.', complexity: 1, createdAt: Date.now() };
  const bead2: Bead = { id: 'b2', ownerId: 'p2', modality: 'text', title: 'Hate', content: 'hate.', complexity: 1, createdAt: Date.now() };
  state.beads[bead1.id] = bead1;
  state.beads[bead2.id] = bead2;
  const edge: Edge = { id: 'e1', from: 'b1', to: 'b2', label: 'analogy', justification: 'These are similar ideas.' };
  state.edges[edge.id] = edge;

  const res = checkIntegrity(state);
  assert.deepStrictEqual(res.flagged, ['e1']);
});

test('evaluateAesthetics considers formatting and variance', () => {
  const rich: Bead = {
    id: 'b1',
    ownerId: 'p1',
    modality: 'text',
    content: 'Short. **This is a much longer sentence with bold text**.',
    complexity: 1,
    createdAt: Date.now(),
  };
  const plain: Bead = {
    id: 'b2',
    ownerId: 'p1',
    modality: 'text',
    content: 'One short sentence.',
    complexity: 1,
    createdAt: Date.now(),
  };
  const richScore = evaluateAesthetics([rich]);
  const plainScore = evaluateAesthetics([plain]);
  assert.ok(richScore > plainScore);
});

test('judge pipeline integrates heuristics', () => {
  const state = sampleState();
  const bead1: Bead = { id: 'b1', ownerId: 'p1', modality: 'text', title: 'Love', content: 'Love. **Bold** statement.', complexity: 1, createdAt: Date.now() };
  const bead2: Bead = { id: 'b2', ownerId: 'p2', modality: 'text', title: 'Hate', content: 'Hate.', complexity: 1, createdAt: Date.now() };
  state.beads[bead1.id] = bead1;
  state.beads[bead2.id] = bead2;
  const edge: Edge = { id: 'e1', from: 'b1', to: 'b2', label: 'analogy', justification: 'These are similar ideas.' };
  state.edges[edge.id] = edge;

  const scroll = judge(state);
  assert.ok(scroll.weakSpots.includes('e1'));
  const p1 = scroll.scores['p1'];
  const p2 = scroll.scores['p2'];
  assert.ok(p1.integrity < 1);
  assert.ok(p1.aesthetics > p2.aesthetics);
});
