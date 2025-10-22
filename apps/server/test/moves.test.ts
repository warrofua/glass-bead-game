import { test } from 'node:test';
import assert from 'node:assert';
import { startServer } from './server.helper.js';

async function createMatch(base: string) {
  const res = await fetch(`${base}/match`, { method: 'POST' });
  assert.equal(res.status, 200);
  return res.json();
}

async function join(base: string, matchId: string, handle: string) {
  const res = await fetch(`${base}/match/${matchId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ handle }),
  });
  assert.equal(res.status, 200);
  return res.json();
}

test('cast adds bead to state', async (t) => {
  const { server, port } = await startServer();
  t.after(() => server.kill());
  const base = `http://localhost:${port}`;

  const match = await createMatch(base);
  const matchId = match.id;
  const p1 = await join(base, matchId, 'Alpha');
  const p2 = await join(base, matchId, 'Beta');

  const beadId = `b_${Math.random().toString(36).slice(2, 8)}`;
  const move = {
    id: `m_${Math.random().toString(36).slice(2, 8)}`,
    playerId: p1.id,
    type: 'cast',
    payload: {
      bead: {
        id: beadId,
        ownerId: p1.id,
        modality: 'text',
        title: 'Test',
        content: 'Cast content',
        complexity: 1,
        createdAt: Date.now(),
      },
    },
    timestamp: Date.now(),
    durationMs: 0,
    valid: true,
  };
  const res = await fetch(`${base}/match/${matchId}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(move),
  });
  assert.equal(res.status, 200);

  const stateRes = await fetch(`${base}/match/${matchId}`);
  const state = await stateRes.json();
  assert.ok(state.beads[beadId]);
  assert.equal(state.moves.length, 1);
});

test('bind connects two beads with sanitized justification', async (t) => {
  const { server, port } = await startServer();
  t.after(() => server.kill());
  const base = `http://localhost:${port}`;

  const match = await createMatch(base);
  const matchId = match.id;
  const p1 = await join(base, matchId, 'Alpha');
  const p2 = await join(base, matchId, 'Beta');

  const cast = async (playerId: string, beadId: string, content: string) => {
    const move = {
      id: `m_${Math.random().toString(36).slice(2, 8)}`,
      playerId,
      type: 'cast',
      payload: {
        bead: {
          id: beadId,
          ownerId: playerId,
          modality: 'text',
          title: 'Idea',
          content,
          complexity: 1,
          createdAt: Date.now(),
        },
      },
      timestamp: Date.now(),
      durationMs: 0,
      valid: true,
    };
    const res = await fetch(`${base}/match/${matchId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(move),
    });
    assert.equal(res.status, 200);
  };

  const beadA = `b_${Math.random().toString(36).slice(2, 8)}`;
  const beadB = `b_${Math.random().toString(36).slice(2, 8)}`;
  await cast(p1.id, beadA, 'First idea');
  await cast(p2.id, beadB, 'Second idea');

  const bindMove = {
    id: `m_${Math.random().toString(36).slice(2, 8)}`,
    playerId: p1.id,
    type: 'bind',
    payload: {
      from: beadA,
      to: beadB,
      label: 'analogy',
      justification: 'First <script>alert(1)</script> sentence. Second sentence.',
    },
    timestamp: Date.now(),
    durationMs: 0,
    valid: true,
  };
  const bindRes = await fetch(`${base}/match/${matchId}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bindMove),
  });
  assert.equal(bindRes.status, 200);

  const stateRes = await fetch(`${base}/match/${matchId}`);
  const state = await stateRes.json();
  const edge = state.edges[bindMove.id];
  assert.ok(edge);
  assert.equal(edge.from, beadA);
  assert.equal(edge.to, beadB);
  assert.equal(edge.label, 'analogy');
  assert.equal(edge.justification.includes('<script>'), false);
});

test('rejects unsupported move types', async (t) => {
  const { server, port } = await startServer();
  t.after(() => server.kill());
  const base = `http://localhost:${port}`;

  const match = await createMatch(base);
  const matchId = match.id;
  const p1 = await join(base, matchId, 'Alpha');
  await join(base, matchId, 'Beta');

  const move = {
    id: `m_${Math.random().toString(36).slice(2, 8)}`,
    playerId: p1.id,
    type: 'mirror',
    payload: {},
    timestamp: Date.now(),
    durationMs: 0,
    valid: true,
  };
  const res = await fetch(`${base}/match/${matchId}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(move),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'Unsupported move type');
});
