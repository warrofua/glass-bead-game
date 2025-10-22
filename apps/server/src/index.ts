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
  sanitizeMarkdown
} from "@gbg/types";
import registerMoveRoute from "./routes/move.js";
import judge from "./judge/index.js";
import judgeWithLLM from "./judge/llm.js";
import generateSeeds from "./seeds.js";
import { Ollama } from "ollama";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const fastify = Fastify({ logger: false });
await fastify.register(cors, { origin: true });

// In-memory store
const matches = new Map<string, GameState>();
const sockets = new Map<string, Set<WebSocket>>();
const metrics = { wsSendFailures: 0, totalMoves: 0, latency: 0 };
const ratings = new Map<string, { wins: number; losses: number }>();
let pendingRatingWrite: Promise<void> = Promise.resolve();

const RATINGS_FILE = process.env.RATINGS_FILE
  ? path.resolve(process.env.RATINGS_FILE)
  : fileURLToPath(new URL("../ratings.json", import.meta.url));

async function loadRatings() {
  try {
    const data = await readFile(RATINGS_FILE, "utf-8");
    const arr = JSON.parse(data) as { handle: string; wins: number; losses: number }[];
    for (const { handle, wins, losses } of arr) {
      ratings.set(handle, { wins, losses });
    }
  } catch (err: any) {
    if (err.code !== "ENOENT") {
      console.warn("Failed to load ratings", err);
    }
  }
}

async function flushRatings() {
  const arr = Array.from(ratings.entries()).map(([handle, rec]) => ({ handle, ...rec }));
  pendingRatingWrite = pendingRatingWrite
    .catch(() => {})
    .then(() => writeFile(RATINGS_FILE, JSON.stringify(arr, null, 2)));
  return pendingRatingWrite;
}

await loadRatings();

// --- Utility
function now(){ return Date.now(); }

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
  const seeds = await generateSeeds();
  const state: GameState = {
    id, round: 1, phase:"SeedDraw", players: [], currentPlayerId: undefined, seeds,
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
  const winnerId = scroll.winner;
  if (winnerId) {
    for (const p of state.players) {
      const rec = ratings.get(p.handle) || { wins: 0, losses: 0 };
      if (p.id === winnerId) rec.wins++; else rec.losses++;
      ratings.set(p.handle, rec);
    }
    await flushRatings().catch(err => console.warn("Failed to save ratings", err));
  }
  return reply.send(scroll);
});

fastify.get("/metrics", async () => metrics);

fastify.get("/ratings", async () => {
  return Array.from(ratings.entries()).map(([handle, rec]) => ({ handle, ...rec }));
});

fastify.post<{ Body: { handle: string; result: "win" | "loss" } }>("/ratings", async (req, reply) => {
  const { handle, result } = req.body;
  if (!handle || (result !== "win" && result !== "loss")) {
    return reply.code(400).send({ error: "Invalid rating update" });
  }
  const rec = ratings.get(handle) || { wins: 0, losses: 0 };
  if (result === "win") rec.wins++; else rec.losses++;
  ratings.set(handle, rec);
  await flushRatings().catch(err => console.warn("Failed to save ratings", err));
  return reply.send({ handle, ...rec });
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
