import sanitizeHtml from "sanitize-html";

export type Modality = "text" | "image" | "audio" | "math" | "code" | "data";
export type RelationLabel =
  | "analogy" | "isomorphism" | "duality" | "causality" | "symmetry" | "inverse"
  | "proof" | "anti-proof" | "motif-echo" | "refutation" | "generalization" | "specialization";

export interface Player {
  id: string; handle: string;
  resources: { insight: number; restraint: number; wildAvailable: boolean };
}

export interface Seed { id: string; text: string; domain: string; }
export interface Bead {
  id: string; ownerId: string; modality: Modality; title?: string;
  content: string; complexity: number; createdAt: number; seedId?: string;
}
export interface Edge {
  id: string; from: string; to: string; label: RelationLabel; justification: string;
}
export type MoveType = "cast" | "bind" | "transmute" | "lift" | "refute" | "canonize" | "prune" | "mirror" | "joker";
export interface Move {
  id: string; playerId: string; type: MoveType; payload: any;
  timestamp: number; durationMs: number; valid: boolean; notes?: string;
}

export interface ConstraintCard {
  id: string; name: string; description: string;
  effect?: { modalityLock?: Modality[]; requiredRelation?: RelationLabel; justificationLimit?: number };
}
export interface Cathedral { id: string; content: string; references: string[]; }

export interface GameState {
  id: string; round: 1|2|3|4; phase: string; players: Player[];
  currentPlayerId?: string;
  seeds: Seed[]; beads: Record<string,Bead>; edges: Record<string,Edge>; moves: Move[];
  twist?: ConstraintCard; cathedral?: Cathedral; createdAt: number; updatedAt: number;
}

export interface JudgedScores {
  resonance: number; aesthetics: number; novelty: number; integrity: number; resilience: number;
  total: number;
}

export interface JudgmentScroll {
  winner?: string;
  scores: Record<string, JudgedScores>;
  strongPaths: Array<{ nodes: string[]; why: string }>;
  weakSpots: string[];
  missedFuse?: string;
}

// --- Sanitization helper ---
const MD_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "b",
    "i",
    "em",
    "strong",
    "a",
    "p",
    "ul",
    "ol",
    "li",
    "code",
    "pre",
    "blockquote",
    "img",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "br",
  ],
  allowedAttributes: {
    a: ["href", "title"],
    img: ["src", "alt", "title"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: {
    img: ["http", "https", "data"],
  },
};

export function sanitizeMarkdown(md: string): string {
  const clean = sanitizeHtml(md, MD_SANITIZE_OPTIONS);
  return clean.slice(0, 10_000);
}

// --- Validation helpers ---

/** Validate that a seed has non-empty text and domain and sanitize text fields. */
export function validateSeed(seed: Seed): boolean {
  if (!seed || !seed.id) return false;
  seed.text = sanitizeMarkdown(seed.text ?? "");
  seed.domain = sanitizeMarkdown(seed.domain ?? "");
  return seed.text.trim().length > 0 && seed.domain.trim().length > 0;
}

/**
 * Validate a move against a given game state. Currently supports basic rules for
 * `cast` and `bind` moves.
 */
export interface ValidationResult { ok: boolean; error?: string }

const MOVE_COSTS: Record<MoveType, { insight?: number; restraint?: number }> = {
  cast: { insight: 1 },
  bind: { restraint: 1 },
  transmute: { insight: 1 },
  lift: { insight: 1 },
  refute: { restraint: 1 },
  canonize: { insight: 1, restraint: 1 },
  prune: { restraint: 1 },
  mirror: { insight: 1 },
  joker: {}
};

export function validateMove(move: Move, state: GameState): ValidationResult {
  if (!move || !state) return { ok: false, error: "Missing move or state" };
  const player = state.players.find((p) => p.id === move.playerId);
  if (!player) return { ok: false, error: "Unknown player" };

  const cost = MOVE_COSTS[move.type] ?? {};
  const insightShort = Math.max(0, (cost.insight ?? 0) - player.resources.insight);
  const restraintShort = Math.max(0, (cost.restraint ?? 0) - player.resources.restraint);
  const wild = player.resources.wildAvailable ? 1 : 0;
  if (insightShort + restraintShort > wild) {
    if (insightShort && restraintShort)
      return { ok: false, error: "Not enough insight and restraint" };
    if (insightShort) return { ok: false, error: "Not enough insight" };
    if (restraintShort) return { ok: false, error: "Not enough restraint" };
  }

  if (move.type === "cast") {
    const bead = move.payload?.bead as Bead | undefined;
    if (!bead) return { ok: false, error: "Missing bead" };
    if (bead.modality !== "text") return { ok: false, error: "Only text beads allowed" };
    if (typeof bead.content !== "string") return { ok: false, error: "Invalid content" };
    if (bead.content.trim().length === 0) return { ok: false, error: "Empty content" };
    bead.content = sanitizeMarkdown(bead.content);
    if (bead.content.length > 10_000) return { ok: false, error: "Content too long" };
    if (typeof bead.complexity !== "number" || bead.complexity < 1 || bead.complexity > 5)
      return { ok: false, error: "Invalid complexity" };
    if (typeof bead.title === "string") {
      bead.title = sanitizeMarkdown(bead.title);
      if (bead.title.length > 80) return { ok: false, error: "Title too long" };
    }
    if (bead.seedId && !state.seeds.find((s) => s.id === bead.seedId))
      return { ok: false, error: "Unknown seed" };
    return { ok: true };
  }

  if (move.type === "bind") {
    const { from, to, label, justification } = move.payload ?? {};
    if (!from || !to || from === to) return { ok: false, error: "Invalid endpoints" };
    if (!state.beads[from] || !state.beads[to]) return { ok: false, error: "Bead not found" };
    if (label !== "analogy") return { ok: false, error: "Unsupported relation" };
    if (typeof justification !== "string" || justification.trim().length === 0)
      return { ok: false, error: "Missing justification" };
    const cleanJust = sanitizeMarkdown(justification);
    move.payload.justification = cleanJust;
    const sentences = cleanJust
      .split(/[.!?]/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
    if (sentences.length < 2) return { ok: false, error: "Need two sentences" };
    return { ok: true };
  }

  if (move.type === "prune") {
    const { beadId, edgeId } = move.payload ?? {};
    // Must specify exactly one target
    if ((beadId ? 1 : 0) + (edgeId ? 1 : 0) !== 1)
      return { ok: false, error: "Specify beadId or edgeId" };
    if (beadId) {
      if (!state.beads[beadId]) return { ok: false, error: "Bead not found" };
    } else if (edgeId) {
      if (!state.edges[edgeId]) return { ok: false, error: "Edge not found" };
    }
    return { ok: true };
  }

  return { ok: true }; // other move types are treated as valid for now
}
/**
 * Apply a move to mutate the given game state. Supports basic `cast` and `bind` moves.
 * Assumes the move has already been validated.
 */
export function applyMove(state: GameState, move: Move): void {
  state.moves.push(move);
  if (move.type === "cast") {
    const bead = move.payload?.bead as Bead | undefined;
    if (bead) {
      state.beads[bead.id] = bead;
    }
  } else if (move.type === "bind") {
    const { edgeId, from, to, label, justification } = move.payload ?? {};
    const id = edgeId ?? move.id;
    const edge: Edge = { id, from, to, label, justification };
    state.edges[id] = edge;
  }
  state.updatedAt = move.timestamp;
}

/** Apply a move and deduct resource costs from the acting player. */
export function applyMoveWithResources(state: GameState, move: Move): void {
  applyMove(state, move);
  if (move.type === "prune") {
    const { beadId, edgeId } = move.payload ?? {};
    if (edgeId && state.edges[edgeId]) {
      delete state.edges[edgeId];
    }
    if (beadId && state.beads[beadId]) {
      delete state.beads[beadId];
      // Remove edges connected to this bead
      for (const id of Object.keys(state.edges)) {
        const e = state.edges[id];
        if (e.from === beadId || e.to === beadId) {
          delete state.edges[id];
        }
      }
    }
  }
  const player = state.players.find((p) => p.id === move.playerId);
  if (!player) return;
  const cost = MOVE_COSTS[move.type] ?? {};
  if (cost.insight) {
    if (player.resources.insight >= cost.insight) {
      player.resources.insight -= cost.insight;
    } else if (player.resources.wildAvailable) {
      player.resources.wildAvailable = false;
      player.resources.insight = 0;
    }
  }
  if (cost.restraint) {
    if (player.resources.restraint >= cost.restraint) {
      player.resources.restraint -= cost.restraint;
    } else if (player.resources.wildAvailable) {
      player.resources.wildAvailable = false;
      player.resources.restraint = 0;
    }
  }
}

/**
 * Replay a sequence of moves from an initial state and return the resulting state.
 * The initial state is not mutated.
 */
export function replayMoves(initial: GameState, moves: Move[]): GameState {
  const state: GameState = JSON.parse(JSON.stringify(initial));
  for (const m of moves) {
    applyMove(state, m);
  }
  return state;
}

export * from './graph.js';
