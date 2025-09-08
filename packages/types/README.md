# @gbg/types

Shared TypeScript types and helper utilities for the Glass Bead Game.

This package exports the core domain models (`Player`, `Bead`, `Edge`, `Move`,
`GameState` and more) along with sanitization and validation helpers such as
`sanitizeMarkdown`, `validateSeed`, `validateMove`, `applyMove` and
`replayMoves`.

## Development

From the repository root you can run the following scripts against this
workspace:

```bash
# Build once
npm --workspace packages/types run build

# Continuous compilation
npm --workspace packages/types run dev

# Type‑check without emitting output
npm --workspace packages/types run typecheck

# Run unit tests
npm --workspace packages/types test
```

The compiled artifacts are emitted to `dist/` and are not committed.
