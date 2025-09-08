import type { Bead, Edge } from "./index.js";

export interface GraphState {
  beads: Record<string, Bead>;
  edges: Record<string, Edge>;
  outbound: Record<string, string[]>; // edge ids keyed by source bead
  inbound: Record<string, string[]>; // edge ids keyed by target bead
}

export function addBead(state: GraphState, bead: Bead): void {
  state.beads[bead.id] = bead;
  if (!state.outbound[bead.id]) state.outbound[bead.id] = [];
  if (!state.inbound[bead.id]) state.inbound[bead.id] = [];
}

export function addEdge(state: GraphState, edge: Edge): void {
  state.edges[edge.id] = edge;
  if (!state.outbound[edge.from]) state.outbound[edge.from] = [];
  state.outbound[edge.from].push(edge.id);
  if (!state.inbound[edge.to]) state.inbound[edge.to] = [];
  state.inbound[edge.to].push(edge.id);
}

export function removeEdge(state: GraphState, edgeId: string): void {
  const edge = state.edges[edgeId];
  if (!edge) return;
  state.outbound[edge.from] = (state.outbound[edge.from] || []).filter((id) => id !== edgeId);
  state.inbound[edge.to] = (state.inbound[edge.to] || []).filter((id) => id !== edgeId);
  delete state.edges[edgeId];
}

export function neighbors(state: GraphState, nodeId: string): string[] {
  const outs = (state.outbound[nodeId] || []).map((id) => state.edges[id]?.to);
  const ins = (state.inbound[nodeId] || []).map((id) => state.edges[id]?.from);
  return Array.from(new Set([...outs, ...ins].filter(Boolean)));
}

export function longestPathFrom(state: GraphState, start: string): string[] {
  const visited = new Set<string>();

  function dfs(node: string): string[] {
    visited.add(node);
    let best: string[] = [node];
    for (const edgeId of state.outbound[node] || []) {
      const edge = state.edges[edgeId];
      if (!edge || visited.has(edge.to)) continue;
      const path = dfs(edge.to);
      if (path.length + 1 > best.length) {
        best = [node, ...path];
      }
    }
    visited.delete(node);
    return best;
  }

  return dfs(start);
}

export function maxWeightedPathFrom(
  state: GraphState,
  start: string,
  weightFn: (edge: Edge) => number
): { path: string[]; weight: number } {
  const visited = new Set<string>();

  function dfs(node: string): { path: string[]; weight: number } {
    visited.add(node);
    let best: { path: string[]; weight: number } = { path: [node], weight: 0 };
    for (const edgeId of state.outbound[node] || []) {
      const edge = state.edges[edgeId];
      if (!edge || visited.has(edge.to)) continue;
      const child = dfs(edge.to);
      const total = child.weight + weightFn(edge);
      if (total > best.weight) {
        best = { path: [node, ...child.path], weight: total };
      }
    }
    visited.delete(node);
    return best;
  }

  return dfs(start);
}
