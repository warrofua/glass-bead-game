import { spawn, ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function startServer(port: number): Promise<ChildProcess>{
  const cwd = path.join(__dirname, '..');
  const server = spawn('node', ['dist/index.js'], {
    cwd,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore','pipe','pipe']
  });
  await new Promise(res => setTimeout(res, 1000));
  return server;
}

export async function createMatchWithMoves(base: string){
  const match = await (await fetch(`${base}/match`, { method: 'POST' })).json();
  const matchId = match.id as string;

  const join = (handle: string) =>
    fetch(`${base}/match/${matchId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle })
    }).then(r => r.json());

  const p1 = await join('Alice');
  await join('Bob');

  const bead = {
    id: `b_${Math.random().toString(36).slice(2,8)}`,
    ownerId: p1.id,
    modality: 'text',
    content: 'example',
    complexity: 1,
    createdAt: Date.now()
  };
  const move = {
    id: `m_${Math.random().toString(36).slice(2,8)}`,
    playerId: p1.id,
    type: 'cast',
    payload: { bead },
    timestamp: Date.now(),
    durationMs: 0,
    valid: true
  };
  await fetch(`${base}/match/${matchId}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(move)
  });
  return { matchId, bead, move };
}

