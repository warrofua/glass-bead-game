import { test } from 'node:test';
import assert from 'node:assert';
import { startServer, createMatchWithMoves } from './server.helper.js';

// Ensure we can download match log with moves and beads

test('match log download contains moves and beads', async (t) => {
  const { server, port } = await startServer();
  t.after(() => server.kill());
  const base = `http://localhost:${port}`;

  const { matchId, bead } = await createMatchWithMoves(base);

  const res = await fetch(`${base}/match/${matchId}/log`);
  assert.equal(res.headers.get('content-disposition'), `attachment; filename=match-${matchId}.json`);
  const body = await res.json();
  assert.ok(Array.isArray(body.moves) && body.moves.length > 0);
  assert.ok(body.beads[bead.id]);
});
