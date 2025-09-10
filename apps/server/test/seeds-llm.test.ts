import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateSeeds, sampleSeeds } from '../src/seeds.ts';

test('generateSeeds returns sanitized LLM output', async (t) => {
  const prev = process.env.LLM_MODEL;
  process.env.LLM_MODEL = 'test';
  t.after(() => {
    if (prev === undefined) delete process.env.LLM_MODEL; else process.env.LLM_MODEL = prev;
  });
  const client = {
    generate() {
      return (async function* () {
        yield JSON.stringify([
          { text: '<script>alert(1)</script>Physics', domain: '<script>alert(1)</script>science' },
          { text: 'Jazz', domain: 'music' },
          { text: 'Daoism', domain: 'philosophy' }
        ]);
      })();
    }
  };
  const seeds = await generateSeeds(client);
  assert.equal(seeds.length, 3);
  assert.equal(seeds[0].text, 'Physics');
  assert.equal(seeds[0].domain, 'science');
});

test('generateSeeds falls back to sample seeds on error', async (t) => {
  const prev = process.env.LLM_MODEL;
  process.env.LLM_MODEL = 'test';
  t.after(() => {
    if (prev === undefined) delete process.env.LLM_MODEL; else process.env.LLM_MODEL = prev;
  });
  const client = {
    generate() {
      return (async function* () {
        throw new Error('fail');
      })();
    }
  };
  const seeds = await generateSeeds(client);
  assert.deepEqual(seeds, sampleSeeds());
});
