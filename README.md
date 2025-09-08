# The Glass Bead Game — Starter Repo (MVP Sprint 1)

Two‑player, online, AI‑judged prototype. This MVP includes:
- Realtime match state (in‑memory) via Fastify + WebSocket
- Shared TypeScript types
- Vite + React web client with Tailwind and a minimal graph‑like list
- A stub **Magister Ludi** judge that scores basic Resonance/Aesthetics

## Quickstart
**Requirements:** Node 20+ (or 18+ with `--experimental‐fetch`), npm 9+

```bash
# from repo root
npm install
npm run dev
# web: http://localhost:5173  |  server: http://localhost:8787
```
Open two browser windows, choose distinct handles, and join/create the same match ID.

## Scripts
- `npm run dev` — runs server + web concurrently
- `npm run build` — builds both
- `npm run typecheck` — type checks both

## Notes
- Data is in‑memory (ephemeral). Suitable for local testing.
- The judge is a deterministic stub; replace with your LLM/embedding pipeline later.
- See `/packages/types/src/index.ts` for the move schema.
