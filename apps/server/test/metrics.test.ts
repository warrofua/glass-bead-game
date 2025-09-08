import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function makeMove(playerId: string, seedId: string){
  const bead = {
    id: `b_${Math.random().toString(36).slice(2,8)}`,
    ownerId: playerId,
    modality: 'text',
    title: 'Idea',
    content: 'A bead',
    complexity: 1,
    createdAt: Date.now(),
    seedId
  };
  return {
    id: `m_${Math.random().toString(36).slice(2,8)}`,
    playerId,
    type: 'cast',
    payload: { bead },
    timestamp: Date.now(),
    durationMs: 1000,
    valid: true
  };
}

test('metrics counters increment', async (t) => {
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

  const base = 'http://localhost:9997';

  const matchRes = await fetch(`${base}/match`, { method: 'POST' });
  const match = await matchRes.json();
  const matchId = match.id as string;

  const join = (handle: string) =>
    fetch(`${base}/match/${matchId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle })
    }).then(r => r.json());

  const p1 = await join('A');
  await join('B');

  await fetch(`${base}/match/${matchId}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(makeMove(p1.id, match.seeds[0]?.id))
  });

  const metricsRes = await fetch(`${base}/metrics`);
  const m = await metricsRes.json();

  assert.equal(m.moveCount, 1);
  assert.ok(m.totalLatencyMs > 0);
  assert.equal(m.wsFailures, 0);
});
