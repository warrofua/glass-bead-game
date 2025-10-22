import {
  GameState,
  JudgedScores,
  JudgmentScroll,
  GraphState,
  addBead,
  addEdge,
  findStrongestPaths,
  JUDGMENT_AXES,
  type JudgmentAxis,
  type AxisInsightTurn,
  type PathStoryTurn,
  type ClosingTurn,
} from '@gbg/types';
import { score as resonance } from './resonance.js';
import { score as novelty } from './novelty.js';
import { score as integrity } from './integrity.js';
import { score as aesthetics } from './aesthetics.js';
import { score as resilience } from './resilience.js';

const WEIGHTS = {
  resonance: 0.30,
  novelty: 0.20,
  integrity: 0.20,
  aesthetics: 0.20,
  resilience: 0.10,
} as const;

const MAGISTER = "Magister Ludi";

const AXIS_META: Record<JudgmentAxis, { label: string; emphasis: string; prompt: string }> = {
  resonance: {
    label: "Resonance",
    emphasis: "Harmonic echoes ripple cleanly across the weave.",
    prompt: "Where might a supporting echo deepen this tone?",
  },
  novelty: {
    label: "Novelty",
    emphasis: "Fresh patterns enliven the canon without breaking it.",
    prompt: "What surprising bead could extend this new motif?",
  },
  integrity: {
    label: "Integrity",
    emphasis: "Contradictions stay quiet; arguments hold steady.",
    prompt: "Which principle deserves further shoring against fracture?",
  },
  aesthetics: {
    label: "Aesthetics",
    emphasis: "The arrangement lands with poised beauty.",
    prompt: "What embellishment could brighten this composition?",
  },
  resilience: {
    label: "Resilience",
    emphasis: "Structure and redundancy protect the flow of insight.",
    prompt: "Where could you lattice another safeguard?",
  },
};

const formatScore = (value: number) => (value * 100).toFixed(1);

const playerName = (state: GameState, playerId: string) => {
  const found = state.players.find((p) => p.id === playerId);
  return found?.handle || playerId;
};

const beadLabel = (state: GameState, beadId: string) => {
  const bead = state.beads[beadId];
  if (!bead) return beadId;
  const title = bead.title?.trim();
  return title ? `${title} (${beadId})` : beadId;
};

export function judge(state: GameState): JudgmentScroll {
  const scores: Record<string, JudgedScores> = {};

  for (const p of state.players) {
    const beadCount = Object.values(state.beads).filter(b => b.ownerId === p.id).length;
    const edgeCount = Object.values(state.edges).filter(e => {
      const owns = state.beads[e.from]?.ownerId === p.id || state.beads[e.to]?.ownerId === p.id;
      return owns;
    }).length;
    const slice = { beadCount, edgeCount };
    const r = resonance(state, p.id);
    const n = novelty(state, p.id);
    const i = integrity(state, p.id);
    const a = aesthetics(slice);
    const rs = resilience(slice);
    const contributions = {
      resonance: WEIGHTS.resonance * r,
      novelty: WEIGHTS.novelty * n,
      integrity: WEIGHTS.integrity * i,
      aesthetics: WEIGHTS.aesthetics * a,
      resilience: WEIGHTS.resilience * rs,
    } as const;
    const total =
      contributions.resonance +
      contributions.novelty +
      contributions.integrity +
      contributions.aesthetics +
      contributions.resilience;
    scores[p.id] = {
      resonance: r,
      novelty: n,
      integrity: i,
      aesthetics: a,
      resilience: rs,
      contributions,
      total,
    };
  }

  const graph: GraphState = { beads: {}, edges: {}, outbound: {}, inbound: {} };
  for (const bead of Object.values(state.beads)) addBead(graph, bead);
  for (const edge of Object.values(state.edges)) addEdge(graph, edge);
  const rawStrongPaths = findStrongestPaths(graph, 3, { maxDepth: 8, maxVisits: 1_000 });
  const strongPaths = rawStrongPaths.map((p) => ({
    nodes: p.nodes,
    why: `weight ${p.weight.toFixed(2)}`,
  }));
  const weakSpots = Object.values(state.beads)
    .filter(b => (graph.outbound[b.id]?.length || 0) + (graph.inbound[b.id]?.length || 0) === 0)
    .map(b => b.id);

  const winner = Object.entries(scores).sort((a, b) => b[1].total - a[1].total)[0]?.[0];
  const axisTurns: AxisInsightTurn[] = [];
  for (const axis of JUDGMENT_AXES) {
    const ranking = state.players
      .map((p) => {
        const s = scores[p.id];
        if (!s) return undefined;
        return {
          playerId: p.id,
          value: s[axis],
          contribution: s.contributions[axis],
        };
      })
      .filter((entry): entry is { playerId: string; value: number; contribution: number } => !!entry)
      .sort((a, b) => b.value - a.value);
    const lead = ranking[0];
    if (!lead) continue;
    const runner = ranking[1];
    const meta = AXIS_META[axis];
    const margin = runner ? lead.value - runner.value : lead.value;
    const insightParts = [
      `${meta.label} favors ${playerName(state, lead.playerId)} (${formatScore(lead.value)})`,
    ];
    if (runner) {
      insightParts.push(
        `holding a margin of ${formatScore(margin)} over ${playerName(state, runner.playerId)}`,
      );
    }
    insightParts.push(meta.emphasis);
    axisTurns.push({
      kind: "axis-insight",
      axis,
      title: `${meta.label} Insight`,
      insight: insightParts.join(" — "),
      ranking,
      prompt: meta.prompt,
    });
  }

  const pathTurns: PathStoryTurn[] = rawStrongPaths.map((path, index) => {
    const readableNodes = path.nodes.map((id) => beadLabel(state, id));
    const story = `Thread ${readableNodes.join(" → ")} carries weight ${path.weight.toFixed(2)}, inviting attention to its closing bead.`;
    return {
      kind: "path-story",
      title: `Path ${index + 1}`,
      nodes: path.nodes,
      pathIndex: index,
      weight: Number(path.weight.toFixed(2)),
      story,
      prompt: `How might you reinforce ${readableNodes[readableNodes.length - 1]}?`,
    };
  });

  const quietHighlights = weakSpots.slice(0, 3).map((id) => beadLabel(state, id));
  const closing: ClosingTurn = {
    kind: "closing",
    title: "Closing Contemplation",
    reflection: winner
      ? `${MAGISTER} recognizes ${playerName(state, winner)} as steward of the weave for now.`
      : `${MAGISTER} withholds a laurel; the weave remains open-ended.`,
    prompt: quietHighlights.length
      ? `Which connections could awaken ${quietHighlights.join(", ")}${weakSpots.length > quietHighlights.length ? ", …" : ""}?`
      : "Where will the next resonance take root?",
  };

  const summary = {
    leadingPlayer: winner,
    axisLeads: axisTurns.map((turn) => {
      const lead = turn.ranking[0];
      const runner = turn.ranking[1];
      const margin = runner ? lead.value - runner.value : lead.value;
      return {
        axis: turn.axis,
        leader: lead.playerId,
        value: Number(lead.value.toFixed(4)),
        margin: Number(margin.toFixed(4)),
      };
    }),
    strongPathCount: strongPaths.length,
    weakSpotCount: weakSpots.length,
  };

  const dialogue = {
    magister: MAGISTER,
    turns: [...axisTurns, ...pathTurns, closing],
  };

  return {
    winner,
    scores,
    strongPaths,
    weakSpots,
    missedFuse: undefined,
    summary,
    dialogue,
  };
}

export default judge;
