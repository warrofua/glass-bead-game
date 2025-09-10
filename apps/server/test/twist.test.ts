import { test } from 'node:test';
import assert from 'node:assert';
import { startServer } from './server.helper.js';

test('twist rejects bind with wrong relation', async (t) => {
  const { server, port } = await startServer();
  t.after(() => server.kill());
  const base = `http://localhost:${port}`;

  const match = await (await fetch(`${base}/match`, { method: 'POST' })).json();
  const matchId = match.id;

  const join = (handle: string) =>
    fetch(`${base}/match/${matchId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle })
    }).then(r => r.json());

  const p1 = await join('A');

  const castBead = async (id:string) => {
    const bead = { id, ownerId: p1.id, modality: 'text', content: 'x', complexity:1, createdAt: Date.now() };
    const move = { id:`m_${Math.random().toString(36).slice(2,8)}`, playerId:p1.id, type:'cast', payload:{ bead }, timestamp:Date.now(), durationMs:0, valid:true };
    await fetch(`${base}/match/${matchId}/move`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(move) });
  };

  const b1 = `b_${Math.random().toString(36).slice(2,8)}`;
  const b2 = `b_${Math.random().toString(36).slice(2,8)}`;
  await castBead(b1);
  await castBead(b2);

  // draw twists twice to reach requiredRelation twist
  await fetch(`${base}/match/${matchId}/twist`, { method:'POST' });
  await fetch(`${base}/match/${matchId}/twist`, { method:'POST' });

  const move = {
    id: `m_${Math.random().toString(36).slice(2,8)}`,
    playerId: p1.id,
    type: 'bind',
    payload: { from: b1, to: b2, label: 'analogy', justification: 'Alpha. Beta.' },
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
  const body = await res.json();
  assert.equal(body.error, 'Twist requires relation motif-echo');
});

