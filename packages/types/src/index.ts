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
export const MOVE_TYPES = [
  "cast",
  "bind",
  "transmute",
  "lift",
  "refute",
  "canonize",
  "prune",
  "mirror",
  "counterpoint",
  "joker",
] as const;

export type MoveType = (typeof MOVE_TYPES)[number];
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
  /** Active twist affecting move validation */
  twist?: ConstraintCard;
  /** Remaining twists to draw from */
  twistDeck?: ConstraintCard[];
  cathedral?: Cathedral; createdAt: number; updatedAt: number;
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
 * `cast`, `bind`, `mirror`, and `counterpoint` moves.
 */
export interface ValidationResult { ok: boolean; error?: string }

export const MOVE_COSTS: Record<MoveType, { insight?: number; restraint?: number }> = {
  cast: { insight: 1 },
  bind: { restraint: 1 },
  transmute: { insight: 1 },
  lift: { insight: 1 },
  refute: { restraint: 1 },
  canonize: { insight: 1, restraint: 1 },
  prune: { restraint: 1 },
  mirror: { insight: 1 },
  counterpoint: { insight: 1 },
  joker: {}
};

export function validateMove(move: Move, state: GameState): ValidationResult {
  if (!move || !state) return { ok: false, error: "Missing move or state" };
  const player = state.players.find((p) => p.id === move.playerId);
  if (!player) return { ok: false, error: "Unknown player" };
  if (state.currentPlayerId && state.currentPlayerId !== player.id)
    return { ok: false, error: "Not your turn" };

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

  const twist = state.twist?.effect;

  if (move.type === "cast" || move.type === "mirror") {
    const bead = move.payload?.bead as Bead | undefined;
    if (!bead) return { ok: false, error: "Missing bead" };
    if (typeof bead.content !== "string" || bead.content.trim().length === 0)
      return { ok: false, error: "Empty content" };
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
    // Mirror-specific: ensure target exists and modality differs
    if (move.type === "mirror") {
      const targetId = move.payload?.targetId as string | undefined;
      if (!targetId || !state.beads[targetId])
        return { ok: false, error: "Target bead not found" };
      const target = state.beads[targetId];
      if (target.modality === bead.modality)
        return { ok: false, error: "Must change modality" };
    } else {
      // cast move restrictions
      if (bead.modality !== "text")
        return { ok: false, error: "Only text beads allowed" };
    }
    if (twist?.modalityLock && !twist.modalityLock.includes(bead.modality))
      return { ok: false, error: "Twist restricts modality" };
    return { ok: true };
  }

  if (move.type === "bind" || move.type === "counterpoint") {
    const { from, to, label, justification } = move.payload ?? {};
    if (!from || !to || from === to) return { ok: false, error: "Invalid endpoints" };
    if (!state.beads[from] || !state.beads[to]) return { ok: false, error: "Bead not found" };
    if (move.type === "bind" && label !== "analogy")
      return { ok: false, error: "Unsupported relation" };
    if (typeof label !== "string") return { ok: false, error: "Missing relation" };
    if (twist?.requiredRelation && label !== twist.requiredRelation)
      return { ok: false, error: `Twist requires relation ${twist.requiredRelation}` };
    if (typeof justification !== "string" || justification.trim().length === 0)
      return { ok: false, error: "Missing justification" };
    const cleanJust = sanitizeMarkdown(justification);
    if (twist?.justificationLimit && cleanJust.length > twist.justificationLimit)
      return { ok: false, error: "Justification too long" };
    move.payload.justification = cleanJust;
    const sentences = cleanJust
      .split(/[.!?]/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
    if (sentences.length < 2) return { ok: false, error: "Need two sentences" };
    return { ok: true };
  }

  return { ok: true }; // other move types treated as valid
}
/**
 * Apply a move to mutate the given game state. Supports basic `cast`, `bind`, `mirror`,
 * and `counterpoint` moves.
 * Assumes the move has already been validated.
 */
export function applyMove(state: GameState, move: Move): void {
  state.moves.push(move);
  if (move.type === "cast" || move.type === "mirror") {
    const bead = move.payload?.bead as Bead | undefined;
    if (bead) {
      state.beads[bead.id] = bead;
    }
  } else if (move.type === "bind" || move.type === "counterpoint") {
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

// graph utilities
export * from './graph';
