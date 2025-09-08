import type { GameState, Move } from "@gbg/types";

// simple in-memory metrics store
const metrics = { wsSendFailures: 0, totalMoves: 0 };

export function recordWsFailure(){
  metrics.wsSendFailures++;
}

export function recordMove(matchId: string, move: Move, state: GameState){
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

export function getMetrics(){
  return metrics;
}
