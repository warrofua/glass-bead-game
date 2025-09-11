import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
jest.mock('../api', () => ({ WS_BASE: 'ws://localhost:8787' }));
import useMatchState from './useMatchState';
import type { GameState } from '@gbg/types';

const baseState: Omit<GameState, 'id'> = {
  round: 1,
  phase: 'play',
  players: [],
  currentPlayerId: undefined,
  seeds: [],
  beads: {},
  edges: {},
  moves: [],
  createdAt: 0,
  updatedAt: 0,
};

function Wrapper({ initial }: { initial: GameState }) {
  const { state } = useMatchState(undefined, { autoConnect: false, initialState: initial });
  return <div>{state?.id}</div>;
}

test('updates state when initialState changes', async () => {
  const stateA: GameState = { ...baseState, id: 'A' };
  const stateB: GameState = { ...baseState, id: 'B' };
  const { rerender } = render(<Wrapper initial={stateA} />);
  expect(screen.getByText('A')).toBeInTheDocument();
  rerender(<Wrapper initial={stateB} />);
  await waitFor(() => expect(screen.getByText('B')).toBeInTheDocument());
});
