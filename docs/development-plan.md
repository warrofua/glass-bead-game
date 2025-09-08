# Development Plan

This plan derives from the MVP and Beta requirements in [`prd.md`](../prd.md). It organizes work into modular deliverables across the repo's packages.

## Phase 1 – MVP Core

### apps/server
- Implement REST endpoints for match lifecycle: `POST /match`, `POST /match/:id/join`, `GET /match/:id`, `POST /match/:id/move`, `POST /match/:id/judge`. *(completed)*
- Maintain in-memory `matches` store and broadcast state changes via WebSocket `state:update`. *(completed)*
- Validate Cast and Bind moves: enforce text bead constraints, reject invalid edges, ensure deterministic judge stub. *(completed)*
- Provide JSON match log export. *(completed)*

### apps/web
- Create React flows for creating/joining a match, listing seeds, and submitting Cast and Bind moves. *(completed)*
- Show real-time updates from WebSocket and render Judgment Scroll with per-axis scores. *(completed)*
- Allow players to export the match log from the UI. *(completed)*

### packages/types
- Define TypeScript types for `Player`, `Seed`, `Bead`, `Edge`, `Move`, `GameState`, and `JudgmentScroll`. *(completed)*
- Share validation utilities for move rules and seed constraints. *(completed)*

## Phase 2 – Beta Preview

### Constraints & Counterpoint
- Extend move validators to support global twists and counterpoint moves.
- Update server APIs and UI to enforce active twists and allow mirror/subvert counterpoint moves.

### Concordance & Graph
- Introduce Cathedral node composition and an optional force-directed graph view.
- Persist Cathedral nodes in state and render force-directed graph with basic drag/zoom.

### Judge v1
- Replace stub judge with embedding-based resonance, NLI integrity checks, and novelty scoring.
- Integrate embeddings and NLI checks, and expose axis contributions in the Judgment Scroll UI.

## Cross-cutting Concerns
- Instrument console metrics for latency and move counts. *(completed)*
- Sanitize markdown inputs and enforce length caps for safety. *(completed)*
- Harden local setup and connection handling: add dev startup script, guard WebSocket connections, and handle API errors gracefully. *(completed)*
- Document every module with README snippets and update this plan as scope evolves.

