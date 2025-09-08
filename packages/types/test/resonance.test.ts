import { test } from "node:test";
import assert from "node:assert/strict";
import { GraphState, addBead, addEdge, findStrongestPaths, GameState } from "../src/index.ts";
import { judgeResonance } from "../../../judge/resonance.ts";

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

test("judgeResonance populates strongPaths", () => {
  const state: GameState = {
    id: "m1",
    round: 1,
    phase: "Play",
    players: [{ id: "p1", handle: "A", resources: { insight: 5, restraint: 2, wildAvailable: true } }],
    seeds: [],
    beads: {
      a: { id: "a", ownerId: "p1", modality: "text", content: "A", complexity: 1, createdAt: 0 },
      b: { id: "b", ownerId: "p1", modality: "text", content: "B", complexity: 2, createdAt: 0 },
      c: { id: "c", ownerId: "p1", modality: "text", content: "C", complexity: 3, createdAt: 0 },
    },
    edges: {
      e1: { id: "e1", from: "a", to: "b", label: "analogy", justification: "" },
      e2: { id: "e2", from: "b", to: "c", label: "analogy", justification: "" },
    },
    moves: [],
    createdAt: 0,
    updatedAt: 0,
  };
  const scroll = judgeResonance(state);
  assert.equal(scroll.strongPaths[0].nodes.join(""), "abc");
  assert.ok(scroll.scores["p1"].resonance > 0);
});
