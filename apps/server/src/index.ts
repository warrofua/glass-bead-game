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
  ConstraintCard,
} from "@gbg/types";
import registerMoveRoute from "./routes/move.js";
import judge from "./judge/index.js";
import judgeWithLLM from "./judge/llm.js";
import { Ollama } from "ollama";

const fastify = Fastify({ logger: false });
await fastify.register(cors, { origin: true });

// In-memory store
const matches = new Map<string, GameState>();
const sockets = new Map<string, Set<WebSocket>>();
const metrics = { wsSendFailures: 0, totalMoves: 0, latency: 0 };

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

function sampleTwists(): ConstraintCard[]{
  return [
    {
      id: 't1',
      name: 'Text Only',
      description: 'Only text beads allowed',
      effect: { modalityLock: ['text'] }
    },
    {
      id: 't2',
      name: 'Motif Echo',
      description: 'Relations must be motif-echo',
      effect: { requiredRelation: 'motif-echo' }
    },
    {
      id: 't3',
      name: 'Short Justification',
      description: 'Justifications capped at 40 chars',
      effect: { justificationLimit: 40 }
    }
  ];
}
function broadcast(matchId: string, type: string, payload: any){
  const set = sockets.get(matchId); if(!set) return;
  const msg = JSON.stringify({ type, payload });
  for(const ws of set){
    try{
      ws.send(msg);
    }catch(err){
      metrics.wsSendFailures++;
      console.warn('WS send failed', err, { wsSendFailures: metrics.wsSendFailures });
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
  metrics.totalMoves++;
  metrics.latency = latency;
  console.log("[metrics]", {
    matchId,
    latency,
    moves: state.moves.length,
    beads: Object.keys(state.beads).length,
    edges: Object.keys(state.edges).length,
    totalMoves: metrics.totalMoves
  });
}

// --- Judging pipeline imported from ./judge

// --- REST Endpoints
fastify.post("/match", async (req, reply) => {
  const id = randomUUID().slice(0,8);
  const state: GameState = {
    id, round: 1, phase:"SeedDraw", players: [], currentPlayerId: undefined, seeds: sampleSeeds(),
    beads: {},
    edges: {},
    moves: [],
    twistDeck: sampleTwists(),
    cathedral: undefined,
    createdAt: now(),
    updatedAt: now()
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

fastify.post<{ Params: { id: string } }>("/match/:id/twist", async (req, reply) => {
  const id = req.params.id;
  const state = matches.get(id);
  if(!state) return reply.code(404).send({ error: "No such match" });
  const next = state.twistDeck?.shift();
  if(!next) return reply.code(400).send({ error: "No twists remaining" });
  state.twist = next;
  state.updatedAt = now();
  broadcast(id, "state:update", state);
  return reply.send(next);
});

registerMoveRoute(fastify, { matches, broadcast, now, logMetrics });

fastify.post<{ Params: { id: string } }>("/match/:id/ai", async (req, reply) => {
  const id = req.params.id;
  const { playerId } = (req.body as any) ?? {};
  const state = matches.get(id);
  if (!state) return reply.code(404).send({ error: "No such match" });
  const seed = state.seeds[0]?.text ?? "";
  const last = [...state.moves].reverse().find((m) => m.playerId !== playerId && m.type === "cast");
  const opponent = last?.payload?.bead?.content ?? "";
  let suggestion = "";
  try {
    const model = process.env.LLM_MODEL || "qwen7b:latest";
    const client = new Ollama();
    const prompt = `Seed: ${seed}\nOpponent: ${opponent}\nRespond with a short bead idea:`;
    for await (const part of client.generate(model, prompt)) {
      suggestion += part;
    }
  } catch (err) {
    console.warn("LLM suggest failed", err);
  }
  return reply.send({ suggestion: sanitizeMarkdown(suggestion.trim()) });
});

fastify.post<{ Params: { id: string } }>("/match/:id/judge", async (req, reply) => {
  const id = req.params.id;
  const state = matches.get(id);
  if(!state) return reply.code(404).send({ error: "No such match" });
  const useLlm = !!process.env.LLM_MODEL;
  const scroll = useLlm ? await judgeWithLLM(state) : judge(state);
  broadcast(id, "end:judgment", scroll);
  return reply.send(scroll);
});

fastify.get("/metrics", async () => metrics);

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
