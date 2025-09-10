import { test } from 'node:test';
import assert from 'node:assert';
import WebSocket from 'ws';
import { startServer } from './server.helper.js';

function waitForMessage(ws: WebSocket, type: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const handler = (data: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === type) {
          ws.off('message', handler);
          resolve(msg.payload);
        }
      } catch (err) {
        reject(err);
      }
    };
    ws.on('message', handler);
    ws.on('close', () => reject(new Error('closed')));
  });
}

test('counterpoint move broadcasts and rejects invalid label', async (t) => {
  const { server, port } = await startServer();
  t.after(() => server.kill());
  const base = `http://127.0.0.1:${port}`;

  // --- valid counterpoint setup ---
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

  const cast = async (player: any, content: string) => {
    const bead = {
      id: `b_${Math.random().toString(36).slice(2,8)}`,
      ownerId: player.id,
      modality: 'text',
      content,
      complexity: 1,
      createdAt: Date.now()
    };
    const move = {
      id: `m_${Math.random().toString(36).slice(2,8)}`,
      playerId: player.id,
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
    return bead.id;
  };
  const b1 = await cast(p1, 'one');
  const b2 = await cast(p2, 'two');

  // draw twists until motif-echo requirement
  await fetch(`${base}/match/${matchId}/twist`, { method: 'POST' });
  await fetch(`${base}/match/${matchId}/twist`, { method: 'POST' });

  // open websockets
  const ws1 = new WebSocket(`ws://127.0.0.1:${port}/?matchId=${matchId}`);
  const ws2 = new WebSocket(`ws://127.0.0.1:${port}/?matchId=${matchId}`);
  const initial1 = waitForMessage(ws1, 'state:update');
  const initial2 = waitForMessage(ws2, 'state:update');
  await Promise.all([
    new Promise(res => ws1.once('open', res)),
    new Promise(res => ws2.once('open', res))
  ]);
  await Promise.all([initial1, initial2]);

  const edgeId = `m_${Math.random().toString(36).slice(2,8)}`;
  const move = {
    id: edgeId,
    playerId: p1.id,
    type: 'counterpoint',
    payload: { from: b1, to: b2, label: 'motif-echo', justification: 'First. Second.' },
    timestamp: Date.now(),
    durationMs: 0,
    valid: true
  };
  const next1 = waitForMessage(ws1, 'state:update');
  const next2 = waitForMessage(ws2, 'state:update');
  const res = await fetch(`${base}/match/${matchId}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(move)
  });
  assert.equal(res.status, 200);
  const [update1, update2] = await Promise.all([next1, next2]);
  assert.equal(update1.edges[edgeId].label, 'motif-echo');
  assert.equal(update2.edges[edgeId].label, 'motif-echo');

  const state = await (await fetch(`${base}/match/${matchId}`)).json();
  assert.equal(state.edges[edgeId].label, 'motif-echo');

  ws1.close();
  ws2.close();

  // --- failing case: wrong relation label ---
  const badMatch = await (await fetch(`${base}/match`, { method: 'POST' })).json();
  const badId = badMatch.id as string;
  const joinBad = (handle: string) =>
    fetch(`${base}/match/${badId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle })
    }).then(r => r.json());
  const pBad = await joinBad('A');
  const pBad2 = await joinBad('B');

  const castBad = async (player: any) => {
    const bead = {
      id: `b_${Math.random().toString(36).slice(2,8)}`,
      ownerId: player.id,
      modality: 'text',
      content: 'x',
      complexity: 1,
      createdAt: Date.now()
    };
    const move = {
      id: `m_${Math.random().toString(36).slice(2,8)}`,
      playerId: player.id,
      type: 'cast',
      payload: { bead },
      timestamp: Date.now(),
      durationMs: 0,
      valid: true
    };
    await fetch(`${base}/match/${badId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(move)
    });
    return bead.id;
  };
  const bb1 = await castBad(pBad);
  const bb2 = await castBad(pBad2);
  await fetch(`${base}/match/${badId}/twist`, { method: 'POST' });
  await fetch(`${base}/match/${badId}/twist`, { method: 'POST' });

  const badMove = {
    id: `m_${Math.random().toString(36).slice(2,8)}`,
    playerId: pBad.id,
    type: 'counterpoint',
    payload: { from: bb1, to: bb2, label: 'analogy', justification: 'First. Second.' },
    timestamp: Date.now(),
    durationMs: 0,
    valid: true
  };
  const badRes = await fetch(`${base}/match/${badId}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(badMove)
  });
  assert.equal(badRes.status, 400);
});

