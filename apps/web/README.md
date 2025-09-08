# Web Client

Vite + React front‑end for the Glass Bead Game. It connects to the server's REST
and WebSocket APIs to let two players create matches, cast beads, bind them and
request judgments.

The UI uses Tailwind CSS and persists the last used match ID and handle in local
storage for convenience.

## Development

Run workspace scripts from the repository root:

```bash
# Start the dev server on http://localhost:5173
npm --workspace apps/web run dev

# Create a production build
npm --workspace apps/web run build

# Type‑check the project
npm --workspace apps/web run typecheck
```

The built assets will be output to `dist/`.
