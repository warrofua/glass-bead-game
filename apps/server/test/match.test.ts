import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('players can join a match and be listed in state', async (t) => {
  const cwd = path.join(__dirname, '..');
  const server = spawn('node', ['dist/index.js'], {
    cwd,
    env: { ...process.env, PORT: '9998' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  await new Promise(res => setTimeout(res, 500));
  t.after(() => {
    server.kill();
  });

  const base = 'http://localhost:9998';

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
