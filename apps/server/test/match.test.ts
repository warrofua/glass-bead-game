import { test } from 'node:test';
import assert from 'node:assert';
import { startServer } from './server.helper.js';

test('players can join a match and be listed in state', async (t) => {
  const { server, port } = await startServer();
  t.after(() => {
    server.kill();
  });

  const base = `http://127.0.0.1:${port}`;

  const matchRes = await fetch(`${base}/match`, { method: 'POST' });
  const match = await matchRes.json();
  const matchId = match.id as string;

  const join = (handle: string) =>
    fetch(`${base}/match/${matchId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle })
    }).then(r => r.json());

  await join('Alice');
  await join('Bob');

  const stateRes = await fetch(`${base}/match/${matchId}`);
  const state = await stateRes.json();

  assert.equal(state.players.length, 2);
  assert.equal(state.players[0].handle, 'Alice');
  assert.equal(state.players[1].handle, 'Bob');
});
