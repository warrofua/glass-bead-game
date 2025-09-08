import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import WebSocket from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

test('clients receive updates and reconnection sends latest state', async (t) => {
  const cwd = path.join(__dirname, '..');
  const server = spawn('node', ['dist/index.js'], {
    cwd,
    env: { ...process.env, PORT: '9997' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  await new Promise(res => setTimeout(res, 500));
  t.after(() => {
    server.kill();
  });

  const base = 'http://localhost:9997';

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
  const ws1 = new WebSocket(`ws://localhost:9997/?matchId=${matchId}`);
  const ws2 = new WebSocket(`ws://localhost:9997/?matchId=${matchId}`);
  const initial1 = waitForMessage(ws1, 'state:update');
  const initial2 = waitForMessage(ws2, 'state:update');
  await Promise.all([
    new Promise(res => ws1.once('open', res)),
    new Promise(res => ws2.once('open', res))
  ]);
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
  const nextMove1 = waitForMessage(ws1, 'move:accepted');
  const nextState1 = waitForMessage(ws1, 'state:update');
  const nextMove2 = waitForMessage(ws2, 'move:accepted');
  const nextState2 = waitForMessage(ws2, 'state:update');
  await fetch(`${base}/match/${matchId}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(move)
  });
  await Promise.all([nextMove1, nextState1, nextMove2, nextState2]);

  // reconnect second client
  ws2.close();
  const ws3 = new WebSocket(`ws://localhost:9997/?matchId=${matchId}`);
  await new Promise(res => ws3.once('open', res));
  const state3 = await waitForMessage(ws3, 'state:update');
  assert.ok(state3.beads[bead.id]);

  ws1.close();
  ws3.close();
});
