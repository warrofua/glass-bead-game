import Fastify from "fastify";
import cors from "@fastify/cors";
import type { IncomingMessage } from "http";
import type { Socket } from "net";
import WebSocket, { WebSocketServer } from "ws";
import { GameState, Move, JudgmentScroll, JudgedScores } from "@gbg/types";
import { registerMatchRoutes } from "./routes/match.js";
import { registerJoinRoute } from "./routes/join.js";
import { registerMoveRoute } from "./routes/move.js";
import { registerJudgeRoute } from "./routes/judge.js";

const fastify = Fastify({ logger: false });
await fastify.register(cors, { origin: true });

// In-memory store
const matches = new Map<string, GameState>();
const sockets = new Map<string, Set<WebSocket>>();
const metrics = { wsSendFailures: 0, totalMoves: 0 };

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
      metrics.wsSendFailures++;
      console.warn('WS send failed', err, { wsSendFailures: metrics.wsSendFailures });
    }
  }
}

function scheduleUpdate(matchId: string, state: GameState, move?: Move){
  const start = now();
  let sent = false;
  const send = () => {
    if(sent) return;
    sent = true;
    if(move) broadcast(matchId, "move:accepted", move);
    broadcast(matchId, "state:update", state);
    const latency = now() - start;
    console.log("[latency]", { matchId, latency });
  };
  setImmediate(send);
  setTimeout(send, 150);
}

function logMetrics(matchId: string, move: Move, state: GameState){
  const latency = Date.now() - move.timestamp;
  metrics.totalMoves++;
  console.log("[metrics]", {
    matchId,
    latency,
    moves: state.moves.length,
    beads: Object.keys(state.beads).length,
    edges: Object.keys(state.edges).length,
    totalMoves: metrics.totalMoves
  });
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
registerMatchRoutes(fastify, matches, sampleSeeds, now);
registerJoinRoute(fastify, matches, (id, state) => scheduleUpdate(id, state), now);
registerMoveRoute(
  fastify,
  matches,
  (id, state, move) => {
    scheduleUpdate(id, state, move);
    logMetrics(id, move, state);
  },
  now
);
registerJudgeRoute(fastify, matches, judge, broadcast);

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
    ws.on("message", (data: WebSocket.RawData) => {
      try{
        const msg = JSON.parse(data.toString());
        if(msg.type === "hello"){
          ws.send(JSON.stringify({ type: "state:update", payload: matches.get(matchId) }));
        }
      }catch{}
    });
    ws.send(JSON.stringify({ type: "state:update", payload: matches.get(matchId) }));
  });
});

const PORT = Number(process.env.PORT || 8787);
fastify.listen({ port: PORT, host: "0.0.0.0" })
  .then(()=> console.log(`[server] http://localhost:${PORT}`))
  .catch(err => { console.error(err); process.exit(1); });
