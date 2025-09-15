import { test } from 'node:test';
import assert from 'node:assert';
import { startServer } from './server.helper.js';

test('invalid move does not change current player', async (t) => {
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
  await join('Bob');

  let stateRes = await fetch(`${base}/match/${matchId}`);
  let state = await stateRes.json();
  const before = state.currentPlayerId;

  const bead = {
    id: `b_${Math.random().toString(36).slice(2,8)}`,
    ownerId: p1.id,
    modality: 'text',
    content: '',
    complexity: 1,
    createdAt: Date.now()
  };
  const move = {
    id: `m_${Math.random().toString(36).slice(2,8)}`,
    playerId: p1.id,
    type: 'cast',
    payload: { bead },
    timestamp: Date.now(),
    durationMs: 0,
    valid: true
  };

  const res = await fetch(`${base}/match/${matchId}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(move)
  });
  assert.equal(res.status, 400);

  stateRes = await fetch(`${base}/match/${matchId}`);
  state = await stateRes.json();
  assert.equal(state.currentPlayerId, before);
});

