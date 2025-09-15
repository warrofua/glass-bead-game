import { test } from 'node:test';
import assert from 'node:assert';
import { startServer } from './server.helper.js';

// Helper to create a simple cast move for a player
async function cast(base: string, matchId: string, playerId: string) {
  const bead = {
    id: `b_${Math.random().toString(36).slice(2,8)}`,
    ownerId: playerId,
    modality: 'text',
    content: 'x',
    complexity: 1,
    createdAt: Date.now()
  };
  const move = {
    id: `m_${Math.random().toString(36).slice(2,8)}`,
    playerId,
    type: 'cast' as const,
    payload: { bead },
    timestamp: Date.now(),
    durationMs: 0,
    valid: true
  };
  return fetch(`${base}/match/${matchId}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(move)
  });
}

test('match flow alternates turns and rejects out-of-turn moves', async (t) => {
  const { server, port } = await startServer();
  t.after(() => server.kill());
  const base = `http://127.0.0.1:${port}`;

  const match = await (await fetch(`${base}/match`, { method: 'POST' })).json();
  const matchId = match.id as string;

  const join = (handle: string) =>
    fetch(`${base}/match/${matchId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle })
    }).then(r => r.json());

  const p1 = await join('Alice');
  const p2 = await join('Bob');

  let state = await (await fetch(`${base}/match/${matchId}`)).json();
  assert.equal(state.currentPlayerId, p1.id);

  // first move by p1
  let res = await cast(base, matchId, p1.id);
  assert.equal(res.status, 200);
  state = await (await fetch(`${base}/match/${matchId}`)).json();
  assert.equal(state.currentPlayerId, p2.id);
  assert.equal(state.moves.length, 1);

  // second move by p2
  res = await cast(base, matchId, p2.id);
  assert.equal(res.status, 200);
  state = await (await fetch(`${base}/match/${matchId}`)).json();
  assert.equal(state.currentPlayerId, p1.id);
  assert.equal(state.moves.length, 2);

  // out-of-turn move by p2 when it's p1's turn
  res = await cast(base, matchId, p2.id);
  assert.equal(res.status, 400);
  state = await (await fetch(`${base}/match/${matchId}`)).json();
  assert.equal(state.currentPlayerId, p1.id);
  assert.equal(state.moves.length, 2);

  // continue with valid moves
  res = await cast(base, matchId, p1.id);
  assert.equal(res.status, 200);
  state = await (await fetch(`${base}/match/${matchId}`)).json();
  assert.equal(state.currentPlayerId, p2.id);
  assert.equal(state.moves.length, 3);

  res = await cast(base, matchId, p2.id);
  assert.equal(res.status, 200);
  state = await (await fetch(`${base}/match/${matchId}`)).json();

  // final assertions
  assert.equal(state.currentPlayerId, p1.id);
  assert.equal(state.moves.length, 4);
});
