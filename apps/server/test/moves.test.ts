import { test } from 'node:test';
import assert from 'node:assert';
import { startServer } from './server.helper.js';

test('cast rejects when insight and wild exhausted', async (t) => {
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

  const cast = async () => {
    const bead = {
      id: `b_${Math.random().toString(36).slice(2,8)}`,
      ownerId: p1.id,
      modality: 'text',
      content: 'x',
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
    return fetch(`${base}/match/${matchId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(move)
    });
  };

  // spend 5 insight and 1 wild
  for(let i=0;i<6;i++){
    const res = await cast();
    assert.equal(res.status, 200);
  }

  // verify resources exhausted
  const state = await (await fetch(`${base}/match/${matchId}`)).json();
  const player = state.players.find((p:any)=>p.id===p1.id);
  assert.equal(player.resources.insight, 0);
  assert.equal(player.resources.wildAvailable, false);

  // seventh cast should be rejected
  const res = await cast();
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'Not enough insight');
});

test('bind uses restraint then wild then rejects', async (t) => {
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

  // cast two beads to bind
  const castBead = async (id:string) => {
    const bead = { id, ownerId: p1.id, modality: 'text', content: 'y', complexity:1, createdAt:Date.now() };
    const move = { id:`m_${Math.random().toString(36).slice(2,8)}`, playerId:p1.id, type:'cast', payload:{ bead }, timestamp:Date.now(), durationMs:0, valid:true };
    await fetch(`${base}/match/${matchId}/move`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(move)});
  };
  const b1 = `b_${Math.random().toString(36).slice(2,8)}`;
  const b2 = `b_${Math.random().toString(36).slice(2,8)}`;
  await castBead(b1); await castBead(b2);

  const bind = async () => {
    const move = {
      id: `m_${Math.random().toString(36).slice(2,8)}`,
      playerId: p1.id,
      type: 'bind',
      payload: { from: b1, to: b2, label: 'analogy', justification: 'First. Second.' },
      timestamp: Date.now(),
      durationMs: 0,
      valid: true
    };
    return fetch(`${base}/match/${matchId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(move)
    });
  };

  // spend 2 restraint and 1 wild
  for(let i=0;i<3;i++){
    const res = await bind();
    assert.equal(res.status, 200);
  }

  // fourth bind should be rejected
  const res = await bind();
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'Not enough restraint');
});
