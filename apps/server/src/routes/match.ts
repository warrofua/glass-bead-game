import { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { GameState } from "@gbg/types";

export function registerMatchRoutes(
  fastify: FastifyInstance,
  matches: Map<string, GameState>,
  sampleSeeds: () => GameState["seeds"],
  now: () => number
){
  fastify.post("/match", async (req, reply) => {
    const id = randomUUID().slice(0,8);
    const state: GameState = {
      id,
      round: 1,
      phase: "SeedDraw",
      players: [],
      seeds: sampleSeeds(),
      beads: {},
      edges: {},
      moves: [],
      createdAt: now(),
      updatedAt: now()
    };
    matches.set(id, state);
    return reply.send(state);
  });

  fastify.get<{ Params: { id: string } }>("/match/:id", async (req, reply) => {
    const state = matches.get(req.params.id);
    if(!state) return reply.code(404).send({ error: "No such match" });
    return reply.send(state);
  });

  fastify.get<{ Params: { id: string } }>("/match/:id/log", async (req, reply) => {
    const state = matches.get(req.params.id);
    if(!state) return reply.code(404).send({ error: "No such match" });
    reply
      .header("Content-Type", "application/json")
      .header("Content-Disposition", `attachment; filename=match-${state.id}.json`);
    return reply.send(state);
  });
}
