import { test } from 'node:test';
import assert from 'node:assert';
import { startServer } from './server.helper.js';

test('metrics endpoint reports move counts and latency', async (t) => {
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

  const p1 = await join('Alice');
  await join('Bob');

  const bead = {
    id: `b_${Math.random().toString(36).slice(2,8)}`,
    ownerId: p1.id,
    modality: 'text',
    content: 'idea',
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
  await fetch(`${base}/match/${matchId}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(move)
  });

  const metricsRes = await fetch(`${base}/metrics`);
  const data = await metricsRes.json();

  assert.equal(data.totalMoves, 1);
  assert.equal(data.wsSendFailures, 0);
  assert.ok(typeof data.latency === 'number' && data.latency > 0);
});
