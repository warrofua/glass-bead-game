import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GraphState,
  addBead,
  addEdge,
  removeEdge,
  neighbors,
  longestPathFrom,
  maxWeightedPathFrom,
  computeLift,
} from '../src/graph.ts';
import type { Bead, Edge } from '../src/index.ts';

test('add and remove edges update adjacency lists', () => {
  const state: GraphState = { beads: {}, edges: {}, outbound: {}, inbound: {} };
  const a: Bead = { id: 'a', ownerId: 'p', modality: 'text', content: '', complexity: 1, createdAt: 0 };
  const b: Bead = { id: 'b', ownerId: 'p', modality: 'text', content: '', complexity: 1, createdAt: 0 };
  const c: Bead = { id: 'c', ownerId: 'p', modality: 'text', content: '', complexity: 1, createdAt: 0 };
  addBead(state, a);
  addBead(state, b);
  addBead(state, c);

  const e1: Edge = { id: 'e1', from: 'a', to: 'b', label: 'analogy', justification: '' };
  const e2: Edge = { id: 'e2', from: 'b', to: 'c', label: 'analogy', justification: '' };
  const e3: Edge = { id: 'e3', from: 'a', to: 'c', label: 'analogy', justification: '' };
  addEdge(state, e1);
  addEdge(state, e2);
  addEdge(state, e3);

  assert.deepEqual(new Set(neighbors(state, 'a')), new Set(['b', 'c']));
  removeEdge(state, 'e3');
  assert.deepEqual(new Set(neighbors(state, 'a')), new Set(['b']));
  assert.ok(!state.edges['e3']);
});

test('longest and weighted path search', () => {
  const state: GraphState = { beads: {}, edges: {}, outbound: {}, inbound: {} };
  const beads: Bead[] = ['a', 'b', 'c'].map((id) => ({
    id,
    ownerId: 'p',
    modality: 'text',
    content: '',
    complexity: 1,
    createdAt: 0,
  }));
  beads.forEach((b) => addBead(state, b));

  const edges: Edge[] = [
    { id: 'e1', from: 'a', to: 'b', label: 'analogy', justification: '' },
    { id: 'e2', from: 'b', to: 'c', label: 'analogy', justification: '' },
    { id: 'e3', from: 'a', to: 'c', label: 'analogy', justification: '' },
  ];
  edges.forEach((e) => addEdge(state, e));

  const longest = longestPathFrom(state, 'a');
  assert.deepEqual(longest, ['a', 'b', 'c']);

  const weightFn = (edge: Edge) => ({ e1: 2, e2: 5, e3: 1 }[edge.id] ?? 0);
  const weighted = maxWeightedPathFrom(state, 'a', weightFn);
  assert.deepEqual(weighted.path, ['a', 'b', 'c']);
  assert.equal(weighted.weight, 7);
});

test('computeLift aggregates path weights and normalizes', () => {
  const state: GraphState = { beads: {}, edges: {}, outbound: {}, inbound: {} };
  const beads: Bead[] = ['a', 'b', 'c'].map((id) => ({
    id,
    ownerId: 'p',
    modality: 'text',
    content: '',
    complexity: 1,
    createdAt: 0,
  }));
  beads.forEach((b) => addBead(state, b));

  addEdge(state, { id: 'e1', from: 'a', to: 'b', label: 'analogy', justification: '' });
  addEdge(state, { id: 'e2', from: 'b', to: 'c', label: 'analogy', justification: '' });

  const lift = computeLift(state);
  assert.deepEqual(lift, { a: 0.75, b: 1, c: 0.75 });
});
