import { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { GameState, Player, sanitizeMarkdown } from "@gbg/types";

export function registerJoinRoute(
  fastify: FastifyInstance,
  matches: Map<string, GameState>,
  emit: (matchId: string, state: GameState) => void,
  now: () => number
){
  fastify.post<{ Params: { id: string } }>("/match/:id/join", async (req, reply) => {
    const id = req.params.id;
    const { handle } = (req.body as any) ?? {};
    const state = matches.get(id);
    if(!state) return reply.code(404).send({ error: "No such match" });
    if(state.players.length >= 2) return reply.code(400).send({ error: "Match full" });
    const player: Player = {
      id: randomUUID().slice(0,6),
      handle: sanitizeMarkdown(handle || "Player"+(state.players.length+1)),
      resources: { insight: 5, restraint: 2, wildAvailable: true }
    };
    state.players.push(player);
    state.updatedAt = now();
    emit(id, state);
    return reply.send(player);
  });
}
