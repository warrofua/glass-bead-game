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
