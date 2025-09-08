import { test } from "node:test";
import assert from "node:assert/strict";
import { GraphState, findStrongestPaths, GameState } from "../src/index.ts";
import { judgeResonance } from "../../../judge/resonance.ts";

test("findStrongestPaths returns heaviest paths", () => {
  const graph: GraphState = {
    nodes: {
      a: { id: "a", weight: 1 },
      b: { id: "b", weight: 2 },
      c: { id: "c", weight: 3 },
    },
    edges: [
      { from: "a", to: "b", weight: 1 },
      { from: "b", to: "c", weight: 1 },
    ],
  };
  const paths = findStrongestPaths(graph, 2);
  assert.equal(paths[0].nodes.join(""), "abc");
  assert.ok(paths[0].weight > paths[1].weight);
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
