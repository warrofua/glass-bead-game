import type { Bead, Edge } from "./index.js";

export interface GraphState {
  beads: Record<string, Bead>;
  edges: Record<string, Edge>;
  outbound: Record<string, string[]>; // edge ids keyed by source bead
  inbound: Record<string, string[]>; // edge ids keyed by target bead
}

export interface PathWeight {
  nodes: string[];
  weight: number;
  /** breakdown of weights for debugging */
  steps: Array<{ from: string; to: string; weight: number }>;
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

/**
 * Explore all simple paths in the graph and return the top N by total weight.
 * Cycles are ignored by tracking visited nodes.
 *
 * Node weight is derived from bead complexity and edge weight defaults to 0.
 */
export function findStrongestPaths(state: GraphState, topN = 3): PathWeight[] {
  const results: PathWeight[] = [];

  const visit = (
    nodeId: string,
    visited: Set<string>,
    path: string[],
    weight: number,
    steps: Array<{ from: string; to: string; weight: number }>
  ) => {
    visited.add(nodeId);
    path.push(nodeId);
    const nodeWeight = state.beads[nodeId]?.complexity ?? 0;
    weight += nodeWeight;
    const edgeIds = state.outbound[nodeId] || [];
    if (edgeIds.length === 0) {
      results.push({ nodes: [...path], weight, steps: [...steps] });
    } else {
      for (const edgeId of edgeIds) {
        const edge = state.edges[edgeId];
        if (!edge || visited.has(edge.to)) continue;
        const stepWeight = 0; // no intrinsic edge weight
        steps.push({ from: edge.from, to: edge.to, weight: stepWeight });
        visit(edge.to, visited, path, weight + stepWeight, steps);
        steps.pop();
      }
      results.push({ nodes: [...path], weight, steps: [...steps] });
    }
    path.pop();
    visited.delete(nodeId);
  };

  for (const id of Object.keys(state.beads)) {
    visit(id, new Set(), [], 0, []);
  }

  results.sort((a, b) => b.weight - a.weight);
  return results.slice(0, topN);
}

/**
 * Compute a lift score for each bead based on the cumulative weights of all
 * simple paths it participates in. Scores are normalized to the range [0,1].
 */
export function computeLift(state: GraphState): Record<string, number> {
  const scores: Record<string, number> = {};

  // initialize all bead scores to 0 so isolated beads are represented
  for (const id of Object.keys(state.beads)) scores[id] = 0;

  const paths = findStrongestPaths(state, Infinity);
  for (const path of paths) {
    for (const nodeId of path.nodes) {
      scores[nodeId] = (scores[nodeId] ?? 0) + path.weight;
    }
  }

  const max = Math.max(0, ...Object.values(scores));
  if (max > 0) {
    for (const id of Object.keys(scores)) {
      scores[id] = scores[id] / max;
    }
  }
  return scores;
}

