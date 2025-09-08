# Development Plan

This plan derives from the MVP and Beta requirements in [`prd.md`](../prd.md). It organizes work into modular deliverables across the repo's packages.

## Phase 1 – MVP Core

### apps/server
- Implement REST endpoints for match lifecycle: `POST /match`, `POST /match/:id/join`, `GET /match/:id`, `POST /match/:id/move`, `POST /match/:id/judge`.
- Maintain in-memory `matches` store and broadcast state changes via WebSocket `state:update`.
- Validate Cast and Bind moves: enforce text bead constraints, reject invalid edges, ensure deterministic judge stub.
- Provide JSON match log export.

### apps/web
- Create React flows for creating/joining a match, listing seeds, and submitting Cast and Bind moves.
- Show real-time updates from WebSocket and render Judgment Scroll with per-axis scores.
- Allow players to export the match log from the UI.

### packages/types
- Define TypeScript types for `Player`, `Seed`, `Bead`, `Edge`, `Move`, `GameState`, and `JudgmentScroll`.
- Share validation utilities for move rules and seed constraints.

## Phase 2 – Beta Preview

### Constraints & Counterpoint
- Extend move validators to support global twists and counterpoint moves.

### Concordance & Graph
- Introduce Cathedral node composition and an optional force-directed graph view.

### Judge v1
- Replace stub judge with embedding-based resonance, NLI integrity checks, and novelty scoring.

## Cross-cutting Concerns
- Instrument console metrics for latency and move counts.
- Sanitize markdown inputs and enforce length caps for safety.
- Document every module with README snippets and update this plan as scope evolves.

