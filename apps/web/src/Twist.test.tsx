import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
jest.mock('./api', () => ({
  __esModule: true,
  default: (path: string, opts?: RequestInit) => fetch(`http://localhost:8787${path}`, opts),
  api: (path: string, opts?: RequestInit) => fetch(`http://localhost:8787${path}`, opts),
  WS_BASE: 'ws://localhost:8787',
}));
import App from './App';

class MockWebSocket {
  onmessage: ((event: MessageEvent) => void) | null = null;
  static instances: MockWebSocket[] = [];
  constructor(url: string) {
    MockWebSocket.instances.push(this);
  }
  close() {}
}
(global as any).WebSocket = MockWebSocket as any;

const mockState = {
  id: 'match1',
  round: 1,
  phase: 'play',
  players: [{ id: 'player1', handle: 'Alice', resources: { insight: 0, restraint: 0, wildAvailable: true } }],
  currentPlayerId: 'player1',
  prelude: {
    motifs: [{ id: 's1', text: 'Seed 1', domain: 'd1' }],
    overture: 'Prelude text.',
  },
  beads: {
    b1: { id: 'b1', ownerId: 'player1', modality: 'text', title: 'Idea 1', content: 'One', complexity: 1, createdAt: 0, seedId: 's1' },
    b2: { id: 'b2', ownerId: 'player1', modality: 'text', title: 'Idea 2', content: 'Two', complexity: 1, createdAt: 0, seedId: 's1' },
  },
  edges: {},
  moves: [],
  createdAt: 0,
  updatedAt: 0,
};

async function completePrelude() {
  const startButton = await screen.findByRole('button', { name: 'Contemplate first motif' });
  fireEvent.click(startButton);
  const enterButton = await screen.findByRole('button', { name: 'Enter the weave' });
  fireEvent.click(enterButton);
  await screen.findByText(/Prelude complete/i);
}

describe('Twist UI', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    (global.fetch as any) = jest.fn((url: RequestInfo, opts?: RequestInit) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.endsWith('/match') && opts?.method === 'POST') {
        return Promise.resolve({ ok: true, json: async () => mockState, text: async () => '' });
      }
      if (u.endsWith(`/match/${mockState.id}/join`)) {
        return Promise.resolve({ ok: true, json: async () => ({ id: 'player1' }), text: async () => '' });
      }
      if (u.endsWith(`/match/${mockState.id}/twist`)) {
        return Promise.resolve({ ok: true, json: async () => ({ id: 't2' }), text: async () => '' });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  const ensureSeedListed = async () => {
    const seedsHeading = await screen.findByRole('heading', { name: /Seeds/i });
    const container = seedsHeading.closest('div');
    expect(container).not.toBeNull();
    const seedItem = await within(container as HTMLElement).findByText(/Seed 1/);
    expect(seedItem).toBeInTheDocument();
  };

  it('disables bind when twist requires motif-echo', async () => {
    render(<App />);

    fireEvent.change(screen.getByPlaceholderText('e.g., MagisterRex'), { target: { value: 'Alice' } });
    fireEvent.click(screen.getByText('Create'));
    await screen.findByText(/Seed 1/);
    await completePrelude();
    fireEvent.click(screen.getByText('Join'));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/match/${mockState.id}/join`),
        expect.any(Object)
      );
    });

    const bead1 = await screen.findByTestId('bead-b1');
    const bead2 = await screen.findByTestId('bead-b2');
    fireEvent.click(bead1);
    fireEvent.click(bead2);
    const bindButton = screen.getByRole('button', { name: 'Bind Selected (-1 Restraint)' });
    expect(bindButton).not.toBeDisabled();

    fireEvent.click(screen.getByText('Draw Twist'));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/match/${mockState.id}/twist`),
        expect.objectContaining({ method: 'POST' })
      );
    });

    const ws = MockWebSocket.instances[0];
    const twistState = {
      ...mockState,
      twist: {
        id: 't2',
        name: 'Motif Echo',
        description: 'Relations must be motif-echo',
        effect: { requiredRelation: 'motif-echo' },
      },
    };
    ws.onmessage?.({ data: JSON.stringify({ type: 'state:update', payload: twistState }) } as MessageEvent);

    await waitFor(() => expect(bindButton).toBeDisabled());
  });
});

