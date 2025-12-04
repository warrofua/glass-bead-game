import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePrelude, samplePrelude } from '../src/seeds.ts';

test('generatePrelude returns sanitized LLM output', async (t) => {
  const prev = process.env.LLM_MODEL_PATH;
  process.env.LLM_MODEL_PATH = 'test';
  t.after(() => {
    if (prev === undefined) delete process.env.LLM_MODEL_PATH; else process.env.LLM_MODEL_PATH = prev;
  });
  const client = {
    async prompt(text: string) {
      return JSON.stringify({
        motifs: [
          { text: '<script>alert(1)</script>Physics', domain: '<script>alert(1)</script>science' },
          { text: 'Jazz', domain: 'music' },
          { text: 'Daoism', domain: 'philosophy' }
        ],
        overture: '<script>alert(1)</script>The Magister speaks.'
      });
    }
  };
  const prelude = await generatePrelude(client);
  assert.equal(prelude.motifs.length, 3);
  assert.equal(prelude.motifs[0].text, 'Physics');
  assert.equal(prelude.motifs[0].domain, 'science');
  assert.ok(prelude.overture.length > 0);
  assert.ok(!prelude.overture.includes('<script>'));
});

test('generatePrelude falls back to sample seeds on error', async (t) => {
  const prev = process.env.LLM_MODEL_PATH;
  process.env.LLM_MODEL_PATH = 'test';
  t.after(() => {
    if (prev === undefined) delete process.env.LLM_MODEL_PATH; else process.env.LLM_MODEL_PATH = prev;
  });
  const client = {
    async prompt(text: string) {
      throw new Error('fail');
    }
  };
  const prelude = await generatePrelude(client);
  assert.deepEqual(prelude, samplePrelude());
});

test('generatePrelude extracts JSON object from prose or code fences', async (t) => {
  const prev = process.env.LLM_MODEL_PATH;
  process.env.LLM_MODEL_PATH = 'test';
  t.after(() => {
    if (prev === undefined) delete process.env.LLM_MODEL_PATH;
    else process.env.LLM_MODEL_PATH = prev;
  });
  const client = {
    async prompt(text: string) {
      return [
        'Here is your prelude:',
        '```json',
        JSON.stringify({
          motifs: [
            { text: 'Astrophysics', domain: 'science' },
            { text: 'Cubism', domain: 'art' }
          ],
          overture: 'A crisp overture.'
        }),
        '```',
        'Enjoy!'
      ].join('\n');
    }
  };
  const prelude = await generatePrelude(client);
  const sample = samplePrelude();
  assert.equal(prelude.motifs.length, 3);
  assert.equal(prelude.motifs[0].text, 'Astrophysics');
  assert.equal(prelude.motifs[1].domain, 'art');
  assert.equal(prelude.motifs[2].text, sample.motifs[2].text);
  assert.equal(prelude.motifs[2].domain, sample.motifs[2].domain);
  assert.ok(prelude.overture.length > 0);
});
