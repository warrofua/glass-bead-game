import { test } from 'node:test';
import assert from 'node:assert';
import { startServer } from './server.helper.js';

// Ensure server ratings endpoint aggregates standings correctly

// Using unique port to avoid collisions
const PORT = 9998;

test('ratings endpoint aggregates standings', async (t) => {
  const server = await startServer(PORT);
  t.after(() => {
    server.kill();
  });
  const base = `http://127.0.0.1:${PORT}`;

  const post = (handle: string, result: 'win' | 'loss') =>
    fetch(`${base}/ratings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle, result }),
    });

  // Record some results
  await post('Alice', 'win');
  await post('Bob', 'loss');
  await post('Alice', 'loss');

  const standingsRes = await fetch(`${base}/ratings`);
  const standings = (await standingsRes.json()) as any[];

  const alice = standings.find((r) => r.handle === 'Alice');
  const bob = standings.find((r) => r.handle === 'Bob');

  assert.deepEqual(alice, { handle: 'Alice', wins: 1, losses: 1 });
  assert.deepEqual(bob, { handle: 'Bob', wins: 0, losses: 1 });
});

