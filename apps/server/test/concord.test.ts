import { test } from 'node:test';
import assert from 'node:assert';
import { startServer } from './server.helper.js';

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2,8)}`;
}

test('concord builds cathedral from highest path', async (t) => {
  const { server, port } = await startServer();
  t.after(() => server.kill());
  const base = `http://localhost:${port}`;

  const match = await (await fetch(`${base}/match`, { method: 'POST' })).json();
  const matchId = match.id as string;

  const join = (handle: string) =>
    fetch(`${base}/match/${matchId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle }),
    }).then((r) => r.json());

  const p1 = await join('Alice');

  const castBead = async (id: string, title: string) => {
    const bead = {
      id,
      ownerId: p1.id,
      modality: 'text',
      content: title,
      title,
      complexity: 1,
      createdAt: Date.now(),
    };
    const move = {
      id: randomId('m'),
      playerId: p1.id,
      type: 'cast' as const,
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
  };

  const b1 = randomId('b');
  const b2 = randomId('b');
  await castBead(b1, 'First');
  await castBead(b2, 'Second');

  const bindMove = {
    id: randomId('m'),
    playerId: p1.id,
    type: 'bind' as const,
    payload: { from: b1, to: b2, label: 'analogy', justification: 'First. Second.' },
    timestamp: Date.now(),
    durationMs: 0,
    valid: true,
  };
  await fetch(`${base}/match/${matchId}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bindMove),
  });

  const res = await fetch(`${base}/match/${matchId}/concord`, { method: 'POST' });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.cathedral.references, [b1, b2]);

  const state = await (await fetch(`${base}/match/${matchId}`)).json();
  assert.deepEqual(state.cathedral.references, [b1, b2]);
});
