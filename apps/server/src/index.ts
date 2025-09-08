import Fastify from "fastify";
import cors from "@fastify/cors";
import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "http";
import type { Socket } from "net";
import WebSocket, { WebSocketServer } from "ws";
import {
  GameState,
  Player,
  Bead,
  Edge,
  Move,
  JudgmentScroll,
  JudgedScores,
  validateMove,
  sanitizeMarkdown,
} from "@gbg/types";
import { recordMove, recordWsFailure, getMetrics } from "./metrics.js";

const fastify = Fastify({ logger: false });
await fastify.register(cors, { origin: true });

// In-memory store
const matches = new Map<string, GameState>();
const sockets = new Map<string, Set<WebSocket>>();

// --- Utility
function now(){ return Date.now(); }
function sampleSeeds(): GameState["seeds"]{
  const seeds = [
    {id:"s1", text:"Kepler's 3rd law", domain:"astronomy"},
    {id:"s2", text:"West African kente patterns", domain:"textiles"},
    {id:"s3", text:"Amnesty", domain:"civics"}
  ];
  return seeds;
}
function broadcast(matchId: string, type: string, payload: any){
  const set = sockets.get(matchId); if(!set) return;
  const msg = JSON.stringify({ type, payload });
  for(const ws of set){
    try{
      ws.send(msg);
    }catch(err){
      recordWsFailure();
      console.warn('WS send failed', err);
    }
  }
}

// --- Judging Stub (deterministic-ish placeholder)
function judge(state: GameState): JudgmentScroll {
  const scores: Record<string, JudgedScores> = {};
  for(const p of state.players){
    const beadCount = Object.values(state.beads).filter(b=>b.ownerId===p.id).length;
    const edgeCount = Object.values(state.edges).filter(e=> {
      const owns = state.beads[e.from]?.ownerId === p.id || state.beads[e.to]?.ownerId === p.id;
      return owns;
    }).length;
    const resonance = Math.min(1, (edgeCount / Math.max(1, beadCount)) * 0.6 + 0.2);
    const aesthetics = Math.min(1, beadCount>0 ? 0.3 + 0.05*beadCount : 0.2);
    const novelty = 0.4 + 0.1*Math.tanh(beadCount/4);
    const integrity = 0.5 + 0.1*Math.tanh(edgeCount/5);
    const resilience = 0.5; // constant for stub
    const total = 0.30*resonance + 0.20*novelty + 0.20*integrity + 0.20*aesthetics + 0.10*resilience;
    scores[p.id] = { resonance, aesthetics, novelty, integrity, resilience, total };
  }
  const winner = Object.entries(scores).sort((a,b)=>b[1].total - a[1].total)[0]?.[0];
  return {
    winner,
    scores,
    strongPaths: [],
    weakSpots: [],
    missedFuse: undefined
  };
}

// --- REST Endpoints
fastify.get("/metrics", async (_req, reply) => {
  return reply.send(getMetrics());
});

fastify.post("/match", async (req, reply) => {
  const id = randomUUID().slice(0,8);
  const state: GameState = {
    id, round: 1, phase:"SeedDraw", players: [], seeds: sampleSeeds(),
    beads: {}, edges: {}, moves: [], createdAt: now(), updatedAt: now()
  };
  matches.set(id, state);
  return reply.send(state);
});

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
  broadcast(id, "state:update", state);
  return reply.send(player);
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
  broadcast(id, "move:accepted", move);
  broadcast(id, "state:update", state);
  const latency = Date.now() - move.timestamp;
  recordMove(latency);
  console.log(JSON.stringify({ event: "move.accepted", matchId: id, moveId: move.id, playerId: move.playerId, latency }));
  return reply.send({ ok: true });
});

fastify.post<{ Params: { id: string } }>("/match/:id/judge", async (req, reply) => {
  const id = req.params.id;
  const state = matches.get(id);
  if(!state) return reply.code(404).send({ error: "No such match" });
  const scroll = judge(state);
  broadcast(id, "end:judgment", scroll);
  console.log(JSON.stringify({ event: "judge.completed", matchId: id, winner: scroll.winner }));
  return reply.send(scroll);
});

// --- WebSocket (per match)
const server = fastify.server;
const wss = new WebSocketServer({ noServer: true });
server.on("upgrade", (req: IncomingMessage, socket: Socket, head: Buffer) => {
  const url = new URL(req.url ?? "", "http://localhost");
  const matchId = url.searchParams.get("matchId") ?? "";
  if(!matchId || !matches.has(matchId)){
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
    let set = sockets.get(matchId);
    if(!set){ set = new Set(); sockets.set(matchId, set); }
    set.add(ws);
    ws.on("close", () => { set?.delete(ws); });
    ws.send(JSON.stringify({ type: "state:update", payload: matches.get(matchId) }));
  });
});

const PORT = Number(process.env.PORT || 8787);
fastify.listen({ port: PORT, host: "0.0.0.0" })
  .then(()=> console.log(`[server] http://localhost:${PORT}`))
  .catch(err => { console.error(err); process.exit(1); });
