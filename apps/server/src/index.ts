import Fastify from "fastify";
import cors from "@fastify/cors";
import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "http";
import type { Socket } from "net";
import WebSocket, { WebSocketServer } from "ws";
import {
  GameState,
  Player,
  Move,
  sanitizeMarkdown,
} from "@gbg/types";
import registerMoveRoute from "./routes/move.js";
import judge from "./judge/index.js";
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
      console.warn('WS send failed', err, getMetrics());
      try{
        ws.close();
      }catch{}
      set.delete(ws);
    }
  }
  if(set.size === 0){
    sockets.delete(matchId);
  }
}

function logMetrics(matchId: string, move: Move, state: GameState){
  const latency = Date.now() - move.timestamp;
  recordMove(matchId, latency, state);
}
// --- Judging pipeline imported from ./judge

// --- REST Endpoints
fastify.post("/match", async (req, reply) => {
  const id = randomUUID().slice(0,8);
  const state: GameState = {
    id, round: 1, phase:"SeedDraw", players: [], currentPlayerId: undefined, seeds: sampleSeeds(),
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
  if(!state.currentPlayerId){
    state.currentPlayerId = player.id;
  }
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

registerMoveRoute(fastify, { matches, broadcast, now, logMetrics });

fastify.post<{ Params: { id: string } }>("/match/:id/judge", async (req, reply) => {
  const id = req.params.id;
  const state = matches.get(id);
  if(!state) return reply.code(404).send({ error: "No such match" });
  const scroll = judge(state);
  broadcast(id, "end:judgment", scroll);
  return reply.send(scroll);
});

fastify.get("/metrics", async () => getMetrics());

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
