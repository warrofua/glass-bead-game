import { GameState, GraphState, addBead, addEdge, findStrongestPaths } from "@gbg/types";

/**
 * Compute the highest "lift" path within the current game state.
 * For now this simply proxies to findStrongestPaths and returns the
 * nodes of the top weighted path.
 */
export function computeLift(state: GameState): string[] {
  const graph: GraphState = { beads: {}, edges: {}, outbound: {}, inbound: {} };
  for (const bead of Object.values(state.beads)) addBead(graph, bead);
  for (const edge of Object.values(state.edges)) addEdge(graph, edge);
  const [best] = findStrongestPaths(graph, 1);
  return best?.nodes ?? [];
}
