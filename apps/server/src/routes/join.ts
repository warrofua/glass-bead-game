import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { sanitizeMarkdown, Player, GameState } from "@gbg/types";

type BroadcastFn = (id: string, type: string, payload: any) => void;

/**
 * Register the join route which allows players to join a match.
 * Ensures the first player joined becomes the current player and
 * notifies connected clients of the updated state.
 */
export default function registerJoinRoute(
  fastify: FastifyInstance,
  matches: Map<string, GameState>,
  broadcast: BroadcastFn
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
    if(state.currentPlayerId === undefined){
      state.currentPlayerId = player.id;
    }
    state.updatedAt = Date.now();
    broadcast(id, "state:update", state);
    return reply.send(player);
  });
}

