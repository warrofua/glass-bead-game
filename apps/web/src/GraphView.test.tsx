import React from 'react';
import { render } from '@testing-library/react';
import GraphView from './GraphView';
import type { GameState } from '@gbg/types';

const state: GameState = {
  id: 'match1',
  round: 1,
  phase: 'play',
  players: [],
  currentPlayerId: undefined,
  seeds: [],
  beads: {
    a: { id: 'a', ownerId: 'p1', modality: 'text', title: 'A', content: '', complexity: 1, createdAt: 0 },
    b: { id: 'b', ownerId: 'p1', modality: 'text', title: 'B', content: '', complexity: 1, createdAt: 0 },
  },
  edges: {
    e1: { id: 'e1', from: 'a', to: 'b', label: 'analogy', justification: 'why' },
  },
  moves: [],
  createdAt: 0,
  updatedAt: 0,
};

test('renders nodes/edges and highlights strong paths', () => {
  const strongPaths = [{ nodes: ['a', 'b'] }];
  const { container } = render(
    <GraphView initialState={state} strongPaths={strongPaths} selectedPathIndex={0} width={200} height={200} />
  );
  const nodes = container.querySelectorAll('circle');
  const edges = container.querySelectorAll('line');
  expect(nodes.length).toBe(2);
  expect(edges.length).toBe(1);
  nodes.forEach((n) => expect(n.getAttribute('fill')).toBe('#ef4444'));
  const edge = edges[0];
  expect(edge.getAttribute('stroke')).toBe('#ef4444');
  expect(edge.getAttribute('stroke-width')).toBe('3');
});

test('renders cathedral node when present', () => {
  const catState: GameState = {
    ...state,
    cathedral: { id: 'cat', content: 'summary', references: ['a', 'b'] },
  };
  const { container } = render(<GraphView initialState={catState} width={200} height={200} />);
  const cathedralNode = container.querySelector('#cat');
  expect(cathedralNode).not.toBeNull();
  expect(cathedralNode?.getAttribute('fill')).toBe('#fbbf24');
});
