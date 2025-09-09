import type { FastifyInstance } from "fastify";
import {
  Bead,
  GameState,
  Move,
  applyMoveWithResources,
  sanitizeMarkdown,
  validateMove,
} from "@gbg/types";

interface MoveDeps {
  matches: Map<string, GameState>;
  broadcast: (matchId: string, type: string, payload: any) => void;
  now: () => number;
  logMetrics: (matchId: string, move: Move, state: GameState) => void;
}

export default function registerMoveRoute(
  fastify: FastifyInstance,
  deps: MoveDeps
) {
  const { matches, broadcast, now, logMetrics } = deps;

  fastify.post<{ Params: { id: string } }>(
    "/match/:id/move",
    async (req, reply) => {
      const id = req.params.id;
      const state = matches.get(id);
      if (!state)
        return reply.code(404).send({ error: "No such match" });

      const move = (req.body as any) as Move;
      // sanitize text fields
      if (move.type === "cast" || move.type === "mirror") {
        const bead = move.payload?.bead as Bead;
        if (bead) {
          bead.content = sanitizeMarkdown(bead.content);
          if (typeof bead.title === "string") {
            bead.title = sanitizeMarkdown(bead.title);
          }
        }
      } else if (move.type === "bind" || move.type === "counterpoint") {
        if (typeof move.payload?.justification === "string") {
          move.payload.justification = sanitizeMarkdown(
            move.payload.justification
          );
        }
      }
      const validation = validateMove(move, state);
      if (!validation.ok) {
        return reply.code(400).send({ error: validation.error });
      }
      move.valid = true;
      applyMoveWithResources(state, move);
      state.updatedAt = now();
      const idx = state.players.findIndex((p) => p.id === move.playerId);
      if (idx >= 0 && state.players.length > 0) {
        const next = state.players[(idx + 1) % state.players.length];
        state.currentPlayerId = next.id;
      }
      broadcast(id, "move:accepted", move);
      broadcast(id, "state:update", state);
      logMetrics(id, move, state);
      return reply.send({ ok: true });
    }
  );
}
