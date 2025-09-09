import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { Cathedral, GameState } from "@gbg/types";
import { computeLift } from "../judge/lift.js";

interface ConcordDeps {
  matches: Map<string, GameState>;
  broadcast: (matchId: string, type: string, payload: any) => void;
  now: () => number;
}

export default function registerConcordRoute(
  fastify: FastifyInstance,
  deps: ConcordDeps
) {
  const { matches, broadcast, now } = deps;

  fastify.post<{ Params: { id: string } }>(
    "/match/:id/concord",
    async (req, reply) => {
      const id = req.params.id;
      const state = matches.get(id);
      if (!state) return reply.code(404).send({ error: "No such match" });

      const path = computeLift(state);
      if (path.length === 0)
        return reply.code(400).send({ error: "No path available" });

      const summary = path
        .map(
          (bid) => state.beads[bid]?.title || state.beads[bid]?.content || bid
        )
        .join(" → ");
      const cathedral: Cathedral = {
        id: randomUUID().slice(0, 8),
        content: summary,
        references: path,
      };
      state.cathedral = cathedral;
      state.updatedAt = now();
      broadcast(id, "state:update", state);
      return reply.send({ cathedral });
    }
  );
}
