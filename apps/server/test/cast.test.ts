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

test('cast move broadcasts new bead to all players', async (t) => {
  const { server, port } = await startServer();
  t.after(() => {
    server.kill();
  });

  const base = `http://127.0.0.1:${port}`;

  // create match
  const matchRes = await fetch(`${base}/match`, { method: 'POST' });
  const match = await matchRes.json();
  const matchId = match.id as string;

  // join two players
  const join = (handle: string) =>
    fetch(`${base}/match/${matchId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle })
    }).then(r => r.json());

  const p1 = await join('A');
  await join('B');

  // open websockets for both players
  const ws1 = new WebSocket(`ws://127.0.0.1:${port}/?matchId=${matchId}`);
  const ws2 = new WebSocket(`ws://127.0.0.1:${port}/?matchId=${matchId}`);
  const initial1 = waitForMessage(ws1, 'state:update');
  const initial2 = waitForMessage(ws2, 'state:update');
  await Promise.all([
    new Promise(res => ws1.once('open', res)),
    new Promise(res => ws2.once('open', res))
  ]);

  // consume initial state updates
  await Promise.all([initial1, initial2]);

  // cast bead from player 1
  const bead = {
    id: `b_${Math.random().toString(36).slice(2, 8)}`,
    ownerId: p1.id,
    modality: 'text',
    title: 'Idea',
    content: 'A small bead of meaning.',
    complexity: 1,
    createdAt: Date.now(),
    seedId: match.seeds[0]?.id
  };
  const move = {
    id: `m_${Math.random().toString(36).slice(2, 8)}`,
    playerId: p1.id,
    type: 'cast',
    payload: { bead },
    timestamp: Date.now(),
    durationMs: 1000,
    valid: true
  };
  const next1 = waitForMessage(ws1, 'state:update');
  const next2 = waitForMessage(ws2, 'state:update');
  await fetch(`${base}/match/${matchId}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(move)
  });

  const [update1, update2] = await Promise.all([next1, next2]);

  assert.ok(update1.beads[bead.id]);
  assert.ok(update2.beads[bead.id]);

  ws1.close();
  ws2.close();
});
