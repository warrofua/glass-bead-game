import { test } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { GameState, sanitizeMarkdown } from '@gbg/types';

test('AI suggestion endpoint returns sanitized text', async () => {
  const fastify = Fastify();
  const matches = new Map<string, GameState>();
  const matchId = 'm1';
  matches.set(matchId, {
    id: matchId,
    round: 1,
    phase: 'play',
    players: [],
    currentPlayerId: undefined,
    prelude: { motifs: [{ id: 's1', text: 'Seed', domain: 'd1' }], overture: 'Intro' },
    beads: {},
    edges: {},
    moves: [],
    createdAt: 0,
    updatedAt: 0,
  });

  const ollama = {
    generate() {
      return (async function* () {
        yield '<script>alert(1)</script>Hi';
      })();
    },
  };

  fastify.post<{ Params: { id: string } }>("/match/:id/ai", async (req, reply) => {
    const id = req.params.id;
    const { playerId } = (req.body as any) ?? {};
    const state = matches.get(id);
    if (!state) return reply.code(404).send({ error: 'No such match' });
    const seed = state.prelude?.motifs[0]?.text ?? '';
    const last = [...state.moves].reverse().find((m) => m.playerId !== playerId && m.type === 'cast');
    const opponent = last?.payload?.bead?.content ?? '';
    let suggestion = '';
    for await (const part of ollama.generate('model', `Seed: ${seed}\nOpponent: ${opponent}\nRespond with a short bead idea:`)) {
      suggestion += part;
    }
    return reply.send({ suggestion: sanitizeMarkdown(suggestion.trim()) });
  });

  const res = await fastify.inject({
    method: 'POST',
    url: `/match/${matchId}/ai`,
    payload: { playerId: 'p1' },
  });

  assert.equal(res.statusCode, 200);
  const data = res.json();
  assert.equal(data.suggestion, 'Hi');
});
