import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('turn switches to next player after move', async (t) => {
  const cwd = path.join(__dirname, '..');
  const server = spawn('node', ['dist/index.js'], {
    cwd,
    env: { ...process.env, PORT: '9997' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  await new Promise(res => setTimeout(res, 1000));
  t.after(() => {
    server.kill();
  });

  const base = 'http://127.0.0.1:9997';

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
  const p2 = await join('Bob');

  let stateRes = await fetch(`${base}/match/${matchId}`);
  let state = await stateRes.json();
  assert.equal(state.currentPlayerId, p1.id);

  const bead = {
    id: `b_${Math.random().toString(36).slice(2, 8)}`,
    ownerId: p1.id,
    modality: 'text',
    title: 'Idea',
    content: 'simple',
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
  await fetch(`${base}/match/${matchId}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(move)
  });

  stateRes = await fetch(`${base}/match/${matchId}`);
  state = await stateRes.json();
  assert.equal(state.currentPlayerId, p2.id);
});
