import { FastifyInstance } from "fastify";
import { GameState, JudgmentScroll } from "@gbg/types";

export function registerJudgeRoute(
  fastify: FastifyInstance,
  matches: Map<string, GameState>,
  judge: (state: GameState) => JudgmentScroll,
  broadcast: (matchId: string, type: string, payload: any) => void
){
  fastify.post<{ Params: { id: string } }>("/match/:id/judge", async (req, reply) => {
    const id = req.params.id;
    const state = matches.get(id);
    if(!state) return reply.code(404).send({ error: "No such match" });
    const scroll = judge(state);
    broadcast(id, "end:judgment", scroll);
    return reply.send(scroll);
  });
}
