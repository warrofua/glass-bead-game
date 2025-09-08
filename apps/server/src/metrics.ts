import type { GameState } from "@gbg/types";

export const metrics = {
  wsSendFailures: 0,
  totalMoves: 0,
};

export function recordMove(matchId: string, latency: number, state: GameState){
  metrics.totalMoves++;
  console.log("[metrics]", {
    matchId,
    latency,
    moves: state.moves.length,
    beads: Object.keys(state.beads).length,
    edges: Object.keys(state.edges).length,
    totalMoves: metrics.totalMoves,
  });
}

export function recordWsFailure(){
  metrics.wsSendFailures++;
}

export function getMetrics(){
  return metrics;
}
