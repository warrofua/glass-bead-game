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

test('generateSeeds extracts JSON array from prose or code fences', async (t) => {
  const prev = process.env.LLM_MODEL;
  process.env.LLM_MODEL = 'test';
  t.after(() => {
    if (prev === undefined) delete process.env.LLM_MODEL;
    else process.env.LLM_MODEL = prev;
  });
  const client = {
    generate() {
      return (async function* () {
        yield [
          'Here are some seeds:',
          '```json',
          JSON.stringify([
            { text: 'Astrophysics', domain: 'science' },
            { text: 'Cubism', domain: 'art' }
          ]),
          '```',
          'Enjoy!'
        ].join('\n');
      })();
    }
  };
  const seeds = await generateSeeds(client);
  const sample = sampleSeeds();
  assert.equal(seeds.length, 3);
  assert.equal(seeds[0].text, 'Astrophysics');
  assert.equal(seeds[1].domain, 'art');
  assert.equal(seeds[2].text, sample[0].text);
  assert.equal(seeds[2].domain, sample[0].domain);
});
