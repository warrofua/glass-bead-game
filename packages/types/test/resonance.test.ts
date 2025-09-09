import { test } from "node:test";
import assert from "node:assert/strict";
import { GraphState, addBead, addEdge, findStrongestPaths } from "../src/graph.ts";
import { score as resonanceScore } from "../../../apps/server/src/judge/resonance.ts";

test("findStrongestPaths returns heaviest paths", () => {
  const graph: GraphState = { beads: {}, edges: {}, outbound: {}, inbound: {} };
  const a = { id: "a", ownerId: "p", modality: "text", content: "", complexity: 1, createdAt: 0 };
  const b = { id: "b", ownerId: "p", modality: "text", content: "", complexity: 2, createdAt: 0 };
  const c = { id: "c", ownerId: "p", modality: "text", content: "", complexity: 3, createdAt: 0 };
  addBead(graph, a);
  addBead(graph, b);
  addBead(graph, c);
  addEdge(graph, { id: "e1", from: "a", to: "b", label: "analogy", justification: "" });
  addEdge(graph, { id: "e2", from: "b", to: "c", label: "analogy", justification: "" });
  const paths = findStrongestPaths(graph, 2);
  assert.equal(paths[0].nodes.join(""), "abc");
  assert.ok(paths[0].weight > (paths[1]?.weight ?? -Infinity));
});

test("resonance score favors edge density", () => {
  const low = resonanceScore({ beadCount: 2, edgeCount: 1 });
  const high = resonanceScore({ beadCount: 2, edgeCount: 2 });
  assert.ok(high > low);
});
