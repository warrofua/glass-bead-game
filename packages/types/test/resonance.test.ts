import { test } from "node:test";
import assert from "node:assert/strict";
import { GraphState, addBead, addEdge, findStrongestPaths } from "../src/index.ts";
import type { GameState } from "../src/index.ts";
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

test("resonance score favors semantic similarity", () => {
  const makeState = (a: string, b: string): GameState => ({
    id: "m",
    round: 1,
    phase: "",
    players: [{ id: "p", handle: "h", resources: { insight: 0, restraint: 0, wildAvailable: false } }],
    currentPlayerId: "p",
    seeds: [],
    beads: {
      a: { id: "a", ownerId: "p", modality: "text", content: a, complexity: 1, createdAt: 0 },
      b: { id: "b", ownerId: "p", modality: "text", content: b, complexity: 1, createdAt: 0 },
    },
    edges: { e: { id: "e", from: "a", to: "b", label: "analogy", justification: "" } },
    moves: [],
    createdAt: 0,
    updatedAt: 0,
  });
  const similar = makeState("hello world", "hello there");
  const dissimilar = makeState("foo", "bar");
  const high = resonanceScore(similar, "p");
  const low = resonanceScore(dissimilar, "p");
  assert.ok(high > low);
});
