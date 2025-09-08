import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { replayMoves } from '../src/persistence.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function randId(prefix: string){
  return `${prefix}_${Math.random().toString(36).slice(2,8)}`;
}

test('exported log replays to equivalent state', async (t) => {
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

  const p1 = await join('Alice');
  const p2 = await join('Bob');

  const cast = async (player: any, beadId: string, seedId?: string) => {
    const bead = {
      id: beadId,
      ownerId: player.id,
      modality: 'text',
      content: 'content',
      complexity: 1,
      createdAt: Date.now(),
      seedId,
    };
    const move = {
      id: randId('m'),
      playerId: player.id,
      type: 'cast',
      payload: { bead },
      timestamp: Date.now(),
      durationMs: 0,
      valid: true,
    };
    await fetch(`${base}/match/${matchId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(move),
    });
    return bead.id;
  };

  const b1 = await cast(p1, randId('b1'), match.seeds[0]?.id);
  const b2 = await cast(p2, randId('b2'), match.seeds[1]?.id);

  const bindMove = {
    id: randId('m'),
    playerId: p1.id,
    type: 'bind',
    payload: {
      from: b1,
      to: b2,
      label: 'analogy',
      justification: 'First. Second.',
    },
    timestamp: Date.now(),
    durationMs: 0,
    valid: true,
  };
  await fetch(`${base}/match/${matchId}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bindMove),
  });

  const stateRes = await fetch(`${base}/match/${matchId}`);
  const state = await stateRes.json();

  const exportRes = await fetch(`${base}/match/${matchId}/export`);
  const exportText = await exportRes.text();
  const log = JSON.parse(exportText);

  assert.deepStrictEqual(log, state);
  assert.equal(typeof log.moves[0].timestamp, 'number');
  assert.ok('valid' in log.moves[0]);

  const replayed = replayMoves(log);
  assert.deepStrictEqual(replayed, state);
});
