import type { Meta, StoryObj } from "@storybook/react";
import GraphView from "../GraphView";
import type { GameState } from "@gbg/types";

const sampleState: GameState = {
  id: "demo",
  round: 1,
  phase: "play",
  players: [],
  prelude: { motifs: [], overture: '' },
  beads: {
    a: { id: "a", ownerId: "p1", modality: "text", content: "A", complexity: 1, createdAt: 0 },
    b: { id: "b", ownerId: "p1", modality: "text", content: "B", complexity: 1, createdAt: 0 },
    c: { id: "c", ownerId: "p1", modality: "text", content: "C", complexity: 1, createdAt: 0 },
  },
  edges: {
    e1: { id: "e1", from: "a", to: "b", label: "analogy", justification: "" },
    e2: { id: "e2", from: "b", to: "c", label: "analogy", justification: "" },
  },
  moves: [],
  createdAt: 0,
  updatedAt: 0,
};

const strongPaths = [{ nodes: ["a", "b", "c"], why: "demo" }];

const meta: Meta<typeof GraphView> = {
  title: "GraphView",
  component: GraphView,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof GraphView>;

export const Default: Story = {
  render: () => (
    <GraphView initialState={sampleState} strongPaths={strongPaths} selectedPathIndex={0} />
  ),
};
