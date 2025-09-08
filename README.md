# The Glass Bead Game — Starter Repo (MVP Sprint 1)

Two‑player, online, AI‑judged prototype. This MVP includes:
- Realtime match state (in‑memory) via Fastify + WebSocket
- Shared TypeScript types and validation utilities
- Vite + React web client with Tailwind and a minimal graph‑like list
- JSON match log export (`GET /match/:id/log` or Export button in the UI)
- A stub **Magister Ludi** judge that scores basic Resonance/Aesthetics

## Quickstart
**Requirements:** Node 20+ (or 18+ with `--experimental-fetch`), npm 9+

Verify npm version and install dependencies from the repo root (no `--workspaces` flag):

```bash
npm --version  # should be 9+
npm install
npm run dev
# web: http://localhost:5173  |  server: http://localhost:8787
```
If `npm install` fails with `Unsupported URL Type "workspace:"`, replace any `workspace:*` entries in subpackage `package.json` files with relative `file:` links (e.g., `file:../../packages/types`).
Open two browser windows, choose distinct handles, and join/create the same match ID.
To export a match log for replay or analysis, use the **Export Log** button in the UI or `GET /match/{id}/log`.

## Scripts
- `npm run dev` — runs server + web concurrently
- `npm run build` — builds both
- `npm run typecheck` — type checks both

## Notes
- Data is in‑memory (ephemeral). Suitable for local testing.
- The judge is a deterministic stub; replace with your LLM/embedding pipeline later.
- See `/packages/types/src/index.ts` for the move schema.
