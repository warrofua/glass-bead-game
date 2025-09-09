import { test } from 'node:test';
import assert from 'node:assert';
import { startServer, createMatchWithMoves } from './server.helper.js';

// ensure cathedral route stores final node

test('cathedral route stores final node', async (t) => {
  const port = 9997;
  const server = await startServer(port);
  t.after(() => server.kill());
  const base = `http://127.0.0.1:${port}`;

  const { matchId, bead, p1 } = await createMatchWithMoves(base);

  const res = await fetch(`${base}/match/${matchId}/cathedral`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: p1.id, content: 'Final idea', references: [bead.id] })
  });
  assert.equal(res.ok, true);

  const state = await (await fetch(`${base}/match/${matchId}`)).json();
  assert.equal(state.cathedral.content, 'Final idea');
  assert.deepEqual(state.cathedral.references, [bead.id]);
});
