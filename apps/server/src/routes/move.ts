import { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { GameState, Move, Bead, Edge, validateMove, sanitizeMarkdown } from "@gbg/types";

export function registerMoveRoute(
  fastify: FastifyInstance,
  matches: Map<string, GameState>,
  emit: (matchId: string, state: GameState, move: Move) => void,
  now: () => number
){
  fastify.post<{ Params: { id: string } }>("/match/:id/move", async (req, reply) => {
    const id = req.params.id;
    const state = matches.get(id);
    if(!state) return reply.code(404).send({ error: "No such match" });

    const move = (req.body as any) as Move;
    // sanitize text fields
    if(move.type === "cast"){
      const bead = move.payload?.bead as Bead;
      if(bead){
        bead.content = sanitizeMarkdown(bead.content);
        if(typeof bead.title === "string"){
          bead.title = sanitizeMarkdown(bead.title);
        }
      }
    } else if(move.type === "bind"){
      if(typeof move.payload?.justification === "string"){
        move.payload.justification = sanitizeMarkdown(move.payload.justification);
      }
    }
    if(!validateMove(move, state)){
      return reply.code(400).send({ error: "Invalid move" });
    }
    move.valid = true;
    state.moves.push(move);
    // naive apply: allow cast and bind minimal
    if(move.type === "cast"){
      const bead = move.payload?.bead as Bead;
      if(bead && bead.id){
        state.beads[bead.id] = bead;
      }
    } else if (move.type === "bind"){
      const edge = {
        id: move.payload?.id || randomUUID().slice(0,6),
        from: move.payload?.from,
        to: move.payload?.to,
        label: move.payload?.label,
        justification: move.payload?.justification
      } as Edge;
      state.edges[edge.id] = edge;
    }
    state.updatedAt = now();
    emit(id, state, move);
    return reply.send({ ok: true });
  });
}
