import React, { useEffect, useState } from "react";
import type { GameState, JudgmentScroll, Move } from "@gbg/types";
import { replayMoves } from "@gbg/types";

type Meta = { id: string; timestamp: number; players: { id: string; handle: string }[] };

const api = async (path: string, opts: RequestInit = {}) => {
  const headers = opts.body ? { "Content-Type": "application/json", ...(opts.headers || {}) } : opts.headers;
  const res = await fetch(`http://localhost:8787${path}`, { ...opts, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed with ${res.status}`);
  }
  return res;
};

interface Props {
  onLoad: (id: string, state: GameState, scroll: JudgmentScroll) => void;
}

export default function Gallery({ onLoad }: Props) {
  const [matches, setMatches] = useState<Meta[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await api("/replays");
        const data = await res.json();
        setMatches(data);
      } catch (err) {
        console.error("Failed to load replays", err);
      }
    })();
  }, []);

  const loadReplay = async (id: string) => {
    try {
      const res = await api(`/match/${id}/replay`);
      const data = await res.json();
      const initial: GameState = {
        id: data.id,
        round: 1,
        phase: "SeedDraw",
        players: data.players,
        currentPlayerId: undefined,
        seeds: data.seeds,
        beads: {},
        edges: {},
        moves: [],
        createdAt: data.timestamp,
        updatedAt: data.timestamp,
      };
      const finalState = replayMoves(initial, data.moves as Move[]);
      onLoad(id, finalState, data.scroll as JudgmentScroll);
    } catch (err) {
      console.error("Failed to load replay", err);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold">Match Gallery</h2>
      <ul className="space-y-2">
        {matches.map((m) => (
          <li key={m.id} className="flex items-center gap-2 bg-[var(--panel)] p-2 rounded">
            <span className="flex-1">
              {m.players.map((p) => p.handle).join(" vs ")} — {new Date(m.timestamp).toLocaleString()}
            </span>
            <button onClick={() => loadReplay(m.id)} className="px-2 py-1 bg-zinc-800 rounded hover:bg-zinc-700">
              Load
            </button>
            <a
              href={`http://localhost:8787/match/${m.id}/replay.pdf`}
              className="px-2 py-1 bg-zinc-800 rounded hover:bg-zinc-700"
              download
            >
              PDF
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

