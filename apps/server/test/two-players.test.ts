import { test } from 'node:test';
import assert from 'node:assert';
import { startServer } from './server.helper.js';

const makeMove = (playerId: string) => {
  const bead = {
    id: `b_${Math.random().toString(36).slice(2,8)}`,
    ownerId: playerId,
    modality: 'text',
    content: 'x',
    complexity: 1,
    createdAt: Date.now()
  };
  return {
    id: `m_${Math.random().toString(36).slice(2,8)}`,
    playerId,
    type: 'cast',
    payload: { bead },
    timestamp: Date.now(),
    durationMs: 0,
    valid: true
  };
};

test('second move rejected until another player joins', async (t) => {
  const { server, port } = await startServer();
  t.after(() => server.kill());
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

  const p1 = await join('Alice');

  let res = await fetch(`${base}/match/${matchId}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(makeMove(p1.id))
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'Need two players to proceed');

  res = await fetch(`${base}/match/${matchId}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(makeMove(p1.id))
  });
  assert.equal(res.status, 400);

  await join('Bob');

  res = await fetch(`${base}/match/${matchId}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(makeMove(p1.id))
  });
  assert.equal(res.status, 200);
});

