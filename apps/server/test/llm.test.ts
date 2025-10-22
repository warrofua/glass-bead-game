import { test } from 'node:test';
import assert from 'node:assert/strict';
import judgeWithLLM from '../src/judge/llm.ts';
import { GameState } from '@gbg/types';

const state: GameState = {
  id: 'm1',
  round: 1,
  phase: 'play',
  players: [
    { id: 'p1', handle: 'A', resources: { insight: 0, restraint: 0, wildAvailable: false } },
    { id: 'p2', handle: 'B', resources: { insight: 0, restraint: 0, wildAvailable: false } }
  ],
  prelude: { motifs: [], overture: '' },
  beads: {
    b1: { id: 'b1', ownerId: 'p1', modality: 'text', content: 'b1', complexity: 1, createdAt: 0 },
    b2: { id: 'b2', ownerId: 'p1', modality: 'text', content: 'b2', complexity: 1, createdAt: 0 },
    b3: { id: 'b3', ownerId: 'p2', modality: 'text', content: 'b3', complexity: 1, createdAt: 0 }
  },
  edges: {
    e1: { id: 'e1', from: 'b1', to: 'b3', label: 'analogy', justification: '' },
    e2: { id: 'e2', from: 'b2', to: 'b3', label: 'analogy', justification: '' },
    e3: { id: 'e3', from: 'b1', to: 'b2', label: 'analogy', justification: '' }
  },
  moves: [],
  createdAt: 0,
  updatedAt: 0
};

test('LLM judge overrides baseline winner with model output', async () => {
  const client = {
    generate(_model: string, _prompt: string) {
      return (async function* () {
        yield '{"winner":"p2"}';
      })();
    }
  };

  const scroll = await judgeWithLLM(state, client);
  assert.equal(scroll.winner, 'p2');
});

test('LLM judge falls back to baseline winner on error', async () => {
  const client = {
    generate() {
      return (async function* () {
        throw new Error('fail');
      })();
    }
  };

  const scroll = await judgeWithLLM(state, client);
  assert.equal(scroll.winner, 'p1');
});
