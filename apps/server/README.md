# Server

Backend for the Glass Bead Game built with Fastify and WebSockets. The server
maintains in‑memory matches, validates moves via `@gbg/types` helpers and emits
state updates to connected clients.

## REST endpoints

- `POST /match` – create a new match and return its initial state
- `POST /match/:id/join` – join an existing match with a handle
- `GET /match/:id` – fetch current match state
- `POST /match/:id/move` – submit a move; broadcast on acceptance
- `POST /match/:id/judge` – run the stub judge and broadcast results
- `GET /match/:id/log` – download the entire match state as JSON

WebSocket connections are upgraded at `ws://localhost:8787/?matchId=ID` and
receive `state:update` and `move:accepted` events.

## Development

From the repository root you can use workspace scripts:

```bash
# Start the server in watch mode on http://localhost:8787
npm --workspace apps/server run dev

# Build the compiled output to dist/
npm --workspace apps/server run build

# Type‑check without emitting output
npm --workspace apps/server run typecheck
```

The server stores everything in memory; restarting clears active matches.

## Testing

```bash
npm --workspace apps/server run test
```

Run the server's test suite.
