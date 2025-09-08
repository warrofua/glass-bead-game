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
export function validateMove(move: Move, state: GameState): boolean {
  if (!move || !state) return false;

  if (move.type === "cast") {
    const bead = move.payload?.bead as Bead | undefined;
    if (!bead) return false;
    if (bead.modality !== "text") return false;
    if (typeof bead.content !== "string") return false;
    if (bead.content.trim().length === 0) return false;
    bead.content = sanitizeMarkdown(bead.content);
    if (bead.content.length > 10_000) return false;
    if (typeof bead.complexity !== "number" || bead.complexity < 1 || bead.complexity > 5)
      return false;
    if (typeof bead.title === "string") {
      bead.title = sanitizeMarkdown(bead.title);
      if (bead.title.length > 80) return false;
    }
    if (bead.seedId && !state.seeds.find((s) => s.id === bead.seedId)) return false;
    return true;
  }

  if (move.type === "bind") {
    const { from, to, label, justification } = move.payload ?? {};
    if (!from || !to || from === to) return false;
    if (!state.beads[from] || !state.beads[to]) return false;
    if (label !== "analogy") return false;
    if (typeof justification !== "string" || justification.trim().length === 0)
      return false;
    const cleanJust = sanitizeMarkdown(justification);
    move.payload.justification = cleanJust;
    const sentences = cleanJust
      .split(/[.!?]/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
    if (sentences.length < 2) return false;
    return true;
  }

  return true; // other move types are treated as valid for now
}
