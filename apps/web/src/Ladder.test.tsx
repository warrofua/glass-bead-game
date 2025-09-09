import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Ladder from './Ladder';

describe('Ladder', () => {
  beforeEach(() => {
    (global.fetch as any) = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => [
          { handle: 'Alice', wins: 2, losses: 1 },
          { handle: 'Bob', wins: 1, losses: 2 },
        ],
      })
    );
  });

  it('fetches and displays standings', async () => {
    render(<Ladder />);
    await waitFor(() => {
      expect(screen.getByText(/#1 Alice/)).toBeInTheDocument();
      expect(screen.getByText(/#2 Bob/)).toBeInTheDocument();
    });
  });

  it('shows empty message when no standings', async () => {
    (global.fetch as any) = jest.fn(() =>
      Promise.resolve({ ok: true, json: async () => [] })
    );
    render(<Ladder />);
    await waitFor(() => {
      expect(screen.getByText(/No standings yet/)).toBeInTheDocument();
    });
  });

  it('handles fetch failure gracefully', async () => {
    (global.fetch as any) = jest.fn(() => Promise.reject(new Error('fail')));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    render(<Ladder />);
    await waitFor(() => {
      expect(warn).toHaveBeenCalled();
      expect(screen.getByText(/No standings yet/)).toBeInTheDocument();
    });
    warn.mockRestore();
  });
});

