import { test } from 'node:test';
import assert from 'node:assert/strict';
import { score as resonance } from '../src/judge/resonance.ts';
import { score as novelty } from '../src/judge/novelty.ts';
import { score as integrity } from '../src/judge/integrity.ts';
import { score as aesthetics } from '../src/judge/aesthetics.ts';
import { score as resilience } from '../src/judge/resilience.ts';
import type { GameState } from '@gbg/types';

test('resonance higher for similar content', () => {
  const makeState = (a: string, b: string): GameState => ({
    id: 'm', round: 1, phase: '',
    players: [{ id: 'p', handle: 'h', resources: { insight: 0, restraint: 0, wildAvailable: false } }],
    currentPlayerId: 'p', seeds: [], moves: [], createdAt: 0, updatedAt: 0,
    beads: {
      a: { id: 'a', ownerId: 'p', modality: 'text', content: a, complexity: 1, createdAt: 0 },
      b: { id: 'b', ownerId: 'p', modality: 'text', content: b, complexity: 1, createdAt: 0 }
    },
    edges: { e: { id: 'e', from: 'a', to: 'b', label: 'analogy', justification: '' } }
  });
  const sim = makeState('hello world', 'hello there');
  const dis = makeState('foo', 'bar');
  assert.ok(resonance(sim, 'p') > resonance(dis, 'p'));
});

test('novelty rewards rare shingles', () => {
  const unique: GameState = {
    id: 'm', round: 1, phase: '',
    players: [{ id: 'p', handle: 'h', resources: { insight: 0, restraint: 0, wildAvailable: false } }],
    currentPlayerId: 'p', seeds: [], moves: [], createdAt: 0, updatedAt: 0,
    beads: { a: { id: 'a', ownerId: 'p', modality: 'text', content: 'alpha beta gamma', complexity: 1, createdAt: 0 } },
    edges: {}
  };
  const duplicate: GameState = {
    ...unique,
    beads: {
      a: { id: 'a', ownerId: 'p', modality: 'text', content: 'alpha beta gamma', complexity: 1, createdAt: 0 },
      b: { id: 'b', ownerId: 'q', modality: 'text', content: 'alpha beta gamma', complexity: 1, createdAt: 0 }
    }
  };
  assert.ok(novelty(unique, 'p') > novelty(duplicate, 'p'));
});

test('integrity penalizes negations', () => {
  const base: GameState = {
    id: 'm', round: 1, phase: '',
    players: [{ id: 'p', handle: 'h', resources: { insight: 0, restraint: 0, wildAvailable: false } }],
    currentPlayerId: 'p', seeds: [], moves: [], createdAt: 0, updatedAt: 0,
    beads: {
      a: { id: 'a', ownerId: 'p', modality: 'text', content: 'x', complexity: 1, createdAt: 0 },
      b: { id: 'b', ownerId: 'p', modality: 'text', content: 'y', complexity: 1, createdAt: 0 }
    },
    edges: { e: { id: 'e', from: 'a', to: 'b', label: 'analogy', justification: 'This is good.' } }
  };
  const neg: GameState = {
    ...base,
    edges: { e: { id: 'e', from: 'a', to: 'b', label: 'analogy', justification: 'This is not good.' } }
  };
  assert.ok(integrity(base, 'p') > integrity(neg, 'p'));
});

test('resilience constant baseline', () => {
  assert.equal(resilience({ beadCount: 0, edgeCount: 0 }), 0.5);
  assert.equal(resilience({ beadCount: 10, edgeCount: 20 }), 0.5);
});

test('aesthetics rewards more beads', () => {
  assert.equal(aesthetics({ beadCount: 0 }), 0.2);
  assert.equal(aesthetics({ beadCount: 5 }), 0.55);
  assert.equal(aesthetics({ beadCount: 20 }), 1);
});
