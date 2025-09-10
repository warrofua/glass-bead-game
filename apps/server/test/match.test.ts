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

test('match handles all move types and returns AI judgment', async (t) => {
  process.env.LLM_MODEL = 'test';
  const { server, port } = await startServer();
  t.after(() => {
    server.kill();
    delete process.env.LLM_MODEL;
  });

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

  const postMove = async (move: any) => {
    const res = await fetch(`${base}/match/${matchId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(move)
    });
    assert.equal(res.status, 200);
  };

  const bead1 = { id: `b_${Math.random().toString(36).slice(2,8)}`, ownerId: p1.id, modality: 'text', content: 'a', complexity: 1, createdAt: Date.now() };
  await postMove({ id: `m_${Math.random().toString(36).slice(2,8)}`, playerId: p1.id, type: 'cast', payload: { bead: bead1 }, timestamp: Date.now(), durationMs: 0, valid: true });

  const bead2 = { id: `b_${Math.random().toString(36).slice(2,8)}`, ownerId: p2.id, modality: 'image', content: 'b', complexity: 1, createdAt: Date.now() };
  await postMove({ id: `m_${Math.random().toString(36).slice(2,8)}`, playerId: p2.id, type: 'mirror', payload: { bead: bead2, targetId: bead1.id }, timestamp: Date.now(), durationMs: 0, valid: true });

  await postMove({ id: `m_${Math.random().toString(36).slice(2,8)}`, playerId: p1.id, type: 'bind', payload: { from: bead1.id, to: bead2.id, label: 'analogy', justification: 'Alpha. Beta.' }, timestamp: Date.now(), durationMs: 0, valid: true });

  await postMove({ id: `m_${Math.random().toString(36).slice(2,8)}`, playerId: p2.id, type: 'counterpoint', payload: { from: bead2.id, to: bead1.id, label: 'motif-echo', justification: 'Gamma. Delta.' }, timestamp: Date.now(), durationMs: 0, valid: true });

  await postMove({ id: `m_${Math.random().toString(36).slice(2,8)}`, playerId: p1.id, type: 'transmute', payload: {}, timestamp: Date.now(), durationMs: 0, valid: true });

  await postMove({ id: `m_${Math.random().toString(36).slice(2,8)}`, playerId: p2.id, type: 'lift', payload: {}, timestamp: Date.now(), durationMs: 0, valid: true });

  await postMove({ id: `m_${Math.random().toString(36).slice(2,8)}`, playerId: p1.id, type: 'canonize', payload: {}, timestamp: Date.now(), durationMs: 0, valid: true });

  await postMove({ id: `m_${Math.random().toString(36).slice(2,8)}`, playerId: p2.id, type: 'refute', payload: {}, timestamp: Date.now(), durationMs: 0, valid: true });

  await postMove({ id: `m_${Math.random().toString(36).slice(2,8)}`, playerId: p2.id, type: 'prune', payload: {}, timestamp: Date.now(), durationMs: 0, valid: true });

  await postMove({ id: `m_${Math.random().toString(36).slice(2,8)}`, playerId: p1.id, type: 'joker', payload: {}, timestamp: Date.now(), durationMs: 0, valid: true });

  const state = await (await fetch(`${base}/match/${matchId}`)).json();
  assert.equal(Object.keys(state.beads).length, 2);
  assert.equal(Object.keys(state.edges).length, 2);
  assert.equal(state.moves.length, 10);

  const scrollRes = await fetch(`${base}/match/${matchId}/judge`, { method: 'POST' });
  assert.equal(scrollRes.status, 200);
  const scroll = await scrollRes.json();
  assert.ok(scroll.winner === p1.id || scroll.winner === p2.id);
  assert.ok(scroll.scores[p1.id]);
  assert.ok(scroll.scores[p2.id]);
});
