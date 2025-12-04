# The Glass Bead Game — AI-Judged Competitive Prototype

A competitive, collaborative game of idea-weaving where two players cast **beads** (concepts) and connect them with labeled **strings** (relationships) on a living graph. An **AI Magister Ludi** evaluates compositions across five criteria: Resonance, Novelty, Integrity, Aesthetics, and Resilience.

## Features
- **Real-time Gameplay**: Live WebSocket synchronization between players
- **Advanced AI Judging**: Deterministic v0 judge + optional LLM-powered v1 judge
- **Interactive Visualization**: Force-directed graph view with D3.js
- **Rich Game Mechanics**:
  - AI-generated seeds from disjoint domains
  - Twist deck with global constraints
  - Counterpoint moves (mirror/subvert mechanics)
  - Concordance composer for final Cathedral synthesis
  - Reflective archive chronicles for post-match highlights (no public ranking board)
- **Developer Experience**:
  - Full TypeScript coverage with shared type system
  - Comprehensive test suite (56 tests: 55 passing, 1 skipped)
  - Fastify backend + React frontend with Tailwind CSS
  - JSON match log export and replay capabilities
  - AI suggestion system for move assistance

## Quickstart
**Requirements:** Node 20+ (or 18+ with `--experimental-fetch`), npm 9+

Verify npm version and install dependencies from the repo root (no `--workspaces` flag):

```bash
npm --version  # should be 9+
npm install
npm run dev
# web: http://localhost:5173  |  server: http://localhost:8787
```
Or run `./start-dev.sh` to install, build, and launch everything automatically.
Use `--pull` to fetch the latest main branch first.
files with relative `file:` links (e.g., `file:../../packages/types`).
Open two browser windows, choose distinct handles, and join/create the same match ID.
To export a match log for replay or analysis, use the **Export Log** button in the UI or `GET /match/{id}/log`.

## How to Play (MVP)
1. Run `npm run dev` and open the web client at `http://localhost:5173`.
2. In two browser windows, enter the same match ID to create or join a match.
3. Take turns casting beads (concepts) and binding them with strings (relationships).
4. Every move is validated by the server and synced live between players.
5. Export the log when finished for replay or analysis.

## LLM Configuration (Optional)
To enable LLM-powered features (Judge v1 and AI suggestions), set the `LLM_MODEL_PATH` environment variable:

```bash
export LLM_MODEL_PATH=/path/to/your/model.gguf
npm run dev
```

The project uses `node-llama-cpp` for local inference. Download a GGUF model file (e.g., Qwen, Llama, Mistral) and point `LLM_MODEL_PATH` to it. If not set, the system falls back to deterministic judging and disables AI suggestions.

## AI Judging System
- **Judge v0**: Deterministic scoring across all five axes with weighted contributions
- **Judge v1**: Optional LLM-powered judging via llama.cpp (with graceful fallback to v0)
- **Scoring Axes**:
  - **Resonance**: Path-based semantic connectivity
  - **Novelty**: Content uniqueness and creativity
  - **Integrity**: Logical consistency and justification quality
  - **Aesthetics**: Composition harmony and complexity
  - **Resilience**: Graph robustness and connectivity

Judgment Scroll includes per-axis scores, winner determination, and analysis of strongest paths.

## Game Mechanics
- **Seeds**: Three AI-generated concepts from disjoint domains to inspire gameplay
- **Cast**: Create text beads (concepts) linked to seeds with complexity ratings (1-5)
- **Bind**: Connect beads with labeled relationships and 2-sentence justifications
- **Twists**: Global constraints that affect available moves (e.g., "analogy only", "inversion required")
- **Counterpoint**: Mirror or subvert opponent beads in different modalities
- **Concordance**: Final collaborative synthesis into a "Cathedral" node
- **Judgment**: AI evaluation of the complete graph across all five scoring axes

## Scripts
- `npm run dev` — runs server + web concurrently
- `npm run build` — builds both
- `npm run typecheck` — type checks both

## Testing
Run all tests from the repo root:

```bash
npm test
```

Or target a workspace directly:

```bash
npm test --workspace apps/web
npm test --workspace packages/types
```

## Notes
- Data is in-memory (ephemeral). Suitable for local development and testing.
- Both deterministic (v0) and LLM-powered (v1) judging are available.
- See `/packages/types/src/index.ts` for complete type definitions and move schemas.
- Test suite: 56 tests total (27 server, 10 web, 20 types) with 55 passing and 1 skipped.

## Architecture
![Architecture Diagram](docs/architecture.svg)

## Additional Documentation
See [docs/](docs/README.md) for the project vision, product requirements, and development plan.
