import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

class MockWebSocket {
  onmessage: ((event: MessageEvent) => void) | null = null;
  constructor(url: string) {}
  close() {}
}
(global as any).WebSocket = MockWebSocket as any;

const mockState = {
  id: 'match1',
  round: 1,
  phase: 'play',
  players: [{ id: 'player1', handle: 'Alice', resources: { insight: 0, restraint: 0, wildAvailable: true } }],
  currentPlayerId: 'player1',
  seeds: [{ id: 's1', text: 'Seed 1', domain: 'd1' }],
  beads: {
    b1: { id: 'b1', ownerId: 'player1', modality: 'text', title: 'Idea 1', content: 'One', complexity: 1, createdAt: 0, seedId: 's1' },
    b2: { id: 'b2', ownerId: 'player1', modality: 'text', title: 'Idea 2', content: 'Two', complexity: 1, createdAt: 0, seedId: 's1' },
  },
  edges: {},
  moves: [],
  createdAt: 0,
  updatedAt: 0,
};

describe('App', () => {
  beforeEach(() => {
    (global.fetch as any) = jest.fn((url: RequestInfo, opts?: RequestInit) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.endsWith('/match') && opts?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => mockState,
          text: async () => '',
        });
      }
      if (u.endsWith(`/match/${mockState.id}/join`)) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: 'player1' }),
          text: async () => '',
        });
      }
      if (u.endsWith(`/match/${mockState.id}/move`)) {
        return Promise.resolve({ ok: true, text: async () => '' });
      }
      if (u.endsWith(`/match/${mockState.id}/ai`)) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ suggestion: 'AI idea' }),
          text: async () => '',
        });
      }
      if (u.endsWith(`/match/${mockState.id}/concord`)) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ cathedral: { id: 'cat', content: 'C', references: ['b1'] } }),
          text: async () => '',
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  it('renders seeds and submits moves', async () => {
    render(<App />);

    fireEvent.change(screen.getByPlaceholderText('e.g., MagisterRex'), {
      target: { value: 'Alice' },
    });

    fireEvent.click(screen.getByText('Create'));

    expect(await screen.findByText(/Seed 1/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Join'));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/match/${mockState.id}/join`),
        expect.any(Object)
      );
    });

    fireEvent.change(screen.getByPlaceholderText('Share an idea...'), {
      target: { value: 'My bead' },
    });
    const castButton = screen.getByRole('button', { name: 'Cast Bead (-1 Insight)' });
    fireEvent.click(castButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/match/${mockState.id}/move`),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('binds two selected beads and resets selection', async () => {
    render(<App />);

    fireEvent.change(screen.getByPlaceholderText('e.g., MagisterRex'), {
      target: { value: 'Alice' },
    });

    fireEvent.click(screen.getByText('Create'));
    await screen.findByText(/Seed 1/);

    fireEvent.click(screen.getByText('Join'));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/match/${mockState.id}/join`),
        expect.any(Object)
      );
    });

    // Wait for beads to be rendered
    await waitFor(() => {
      expect(screen.getByText('Idea 1')).toBeInTheDocument();
      expect(screen.getByText('Idea 2')).toBeInTheDocument();
    });

    const bead1 = await screen.findByTestId('bead-b1');
    const bead2 = await screen.findByTestId('bead-b2');

    fireEvent.click(bead1);
    fireEvent.click(bead2);

    const bindButton = screen.getByRole('button', { name: 'Bind Selected (-1 Restraint)' });
    fireEvent.click(bindButton);

    await waitFor(() => {
      const moveCall = (global.fetch as jest.Mock).mock.calls.find(c =>
        (c[0] as string).includes('/move')
      );
      expect(moveCall).toBeTruthy();
      const body = JSON.parse(moveCall![1].body as string);
      expect(body.payload.from).toBe('b1');
      expect(body.payload.to).toBe('b2');
    });

    await waitFor(() => expect(bindButton).toBeDisabled());
    expect(bead1).not.toHaveAttribute('aria-selected', 'true');
    expect(bead2).not.toHaveAttribute('aria-selected', 'true');
  });

  it('mirrors a selected bead and resets selection', async () => {
    render(<App />);

    fireEvent.change(screen.getByPlaceholderText('e.g., MagisterRex'), {
      target: { value: 'Alice' },
    });

    fireEvent.click(screen.getByText('Create'));
    await screen.findByText(/Seed 1/);

    fireEvent.click(screen.getByText('Join'));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/match/${mockState.id}/join`),
        expect.any(Object)
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Idea 1')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Modality'), {
      target: { value: 'image' },
    });
    fireEvent.change(screen.getByPlaceholderText('Share an idea...'), {
      target: { value: 'Mirror bead' },
    });

    const bead1 = await screen.findByTestId('bead-b1');
    fireEvent.click(bead1);

    const mirrorButton = screen.getByRole('button', { name: 'Mirror Selected (-1 Insight)' });
    fireEvent.click(mirrorButton);

    await waitFor(() => {
      const moveCall = (global.fetch as jest.Mock).mock.calls.find(c =>
        (c[0] as string).includes('/move')
      );
      expect(moveCall).toBeTruthy();
      const body = JSON.parse(moveCall![1].body as string);
      expect(body.type).toBe('mirror');
      expect(body.payload.targetId).toBe('b1');
      expect(body.payload.bead.modality).toBe('image');
    });

    await waitFor(() => expect(mirrorButton).toBeDisabled());
    expect(bead1).not.toHaveAttribute('aria-selected', 'true');
  });

  it('populates textarea with AI suggestion', async () => {
    render(<App />);

    fireEvent.change(screen.getByPlaceholderText('e.g., MagisterRex'), {
      target: { value: 'Alice' },
    });

    fireEvent.click(screen.getByText('Create'));
    await screen.findByText(/Seed 1/);

    fireEvent.click(screen.getByText('Join'));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/match/${mockState.id}/join`),
        expect.any(Object)
      );
    });

    const suggestButton = screen.getByRole('button', { name: 'Suggest with AI' });
    await waitFor(() => expect(suggestButton).not.toBeDisabled());
    fireEvent.click(suggestButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/match/${mockState.id}/ai`),
        expect.any(Object)
      );
    });

    await waitFor(() =>
      expect(screen.getByPlaceholderText('Share an idea...')).toHaveValue('AI idea')
    );
  });

  it('requests concord and updates graph', async () => {
    const { container } = render(<App />);

    fireEvent.change(screen.getByPlaceholderText('e.g., MagisterRex'), {
      target: { value: 'Alice' },
    });

    fireEvent.click(screen.getByText('Create'));
    await screen.findByText(/Seed 1/);

    fireEvent.click(screen.getByText('Join'));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/match/${mockState.id}/join`),
        expect.any(Object)
      );
    });

    const concordButton = screen.getByRole('button', { name: 'Concord' });
    await waitFor(() => expect(concordButton).not.toBeDisabled());
    fireEvent.click(concordButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/match/${mockState.id}/concord`),
        expect.objectContaining({ method: 'POST' })
      );
    });

    await waitFor(() => {
      const cathedralNode = container.querySelector('#cat');
      expect(cathedralNode).not.toBeNull();
    });
  });
});
