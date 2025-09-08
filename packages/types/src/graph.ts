export interface GraphNode {
  id: string;
  /** weight contribution for this node */
  weight: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  /** weight contribution for traversing this edge */
  weight: number;
}

export interface GraphState {
  nodes: Record<string, GraphNode>;
  edges: GraphEdge[];
}

export interface PathWeight {
  nodes: string[];
  weight: number;
  /** breakdown of weights for debugging */
  steps: Array<{ from: string; to: string; weight: number }>;
}

/**
 * Explore all simple paths in the graph and return the top N by total weight.
 * Cycles are ignored by tracking visited nodes.
 */
export function findStrongestPaths(state: GraphState, topN = 3): PathWeight[] {
  const adj: Record<string, GraphEdge[]> = {};
  for (const e of state.edges) {
    (adj[e.from] ||= []).push(e);
  }
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
    const nodeWeight = state.nodes[nodeId]?.weight ?? 0;
    weight += nodeWeight;
    const edges = adj[nodeId] || [];
    if (edges.length === 0) {
      results.push({ nodes: [...path], weight, steps: [...steps] });
    } else {
      for (const edge of edges) {
        if (visited.has(edge.to)) continue; // avoid cycles
        steps.push(edge);
        visit(edge.to, visited, path, weight + edge.weight, steps);
        steps.pop();
      }
      results.push({ nodes: [...path], weight, steps: [...steps] });
    }
    path.pop();
    visited.delete(nodeId);
  };
  for (const id of Object.keys(state.nodes)) {
    visit(id, new Set(), [], 0, []);
  }
  results.sort((a, b) => b.weight - a.weight);
  return results.slice(0, topN);
}
