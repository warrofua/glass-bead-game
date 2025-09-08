import { GameState, replayMoves as replayLib } from "@gbg/types";

/**
 * Serialize a match's state to a JSON string for download.
 */
export function exportMatch(state: GameState): string {
  return JSON.stringify(state, null, 2);
}

/**
 * Rebuild a game state from an exported log by replaying its moves from a clean base.
 */
export function replayMoves(log: GameState): GameState {
  const initial: GameState = {
    ...log,
    beads: {},
    edges: {},
    moves: [],
    updatedAt: log.createdAt,
  };
  return replayLib(initial, log.moves);
}
