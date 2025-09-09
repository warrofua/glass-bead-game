import { test } from 'node:test';
import assert from 'node:assert/strict';
import { score as resonance } from '../src/judge/resonance.ts';
import { score as novelty } from '../src/judge/novelty.ts';
import { score as integrity } from '../src/judge/integrity.ts';
import { score as aesthetics } from '../src/judge/aesthetics.ts';
import { score as resilience } from '../src/judge/resilience.ts';

test('resonance handles edge ratios', () => {
  assert.equal(resonance({ beadCount: 0, edgeCount: 0 }), 0.2);
  assert.equal(resonance({ beadCount: 2, edgeCount: 10 }), 1);
  const mid = resonance({ beadCount: 5, edgeCount: 3 });
  assert.ok(mid > 0.2 && mid < 1);
});

test('resilience constant baseline', () => {
  assert.equal(resilience({ beadCount: 0, edgeCount: 0 }), 0.5);
  assert.equal(resilience({ beadCount: 10, edgeCount: 20 }), 0.5);
});

test('novelty grows with bead count', () => {
  assert.equal(novelty({ beadCount: 0 }), 0.4);
  const many = novelty({ beadCount: 20 });
  assert.ok(many > 0.49 && many <= 0.5);
});

test('aesthetics rewards more beads', () => {
  assert.equal(aesthetics({ beadCount: 0 }), 0.2);
  assert.equal(aesthetics({ beadCount: 5 }), 0.55);
  assert.equal(aesthetics({ beadCount: 20 }), 1);
});

test('integrity increases with edges', () => {
  assert.equal(integrity({ edgeCount: 0 }), 0.5);
  const many = integrity({ edgeCount: 10 });
  assert.ok(many > 0.59 && many < 0.6);
});
