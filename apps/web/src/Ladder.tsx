import React, { useEffect, useState } from "react";

interface Rating {
  handle: string;
  wins: number;
  losses: number;
}

export default function Ladder() {
  const [standings, setStandings] = useState<Rating[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("http://localhost:8787/ratings");
        if (!res.ok) return;
        const data = await res.json();
        setStandings(data);
      } catch (err) {
        console.warn("Failed to load ratings", err);
      }
    }
    load();
  }, []);

  const sorted = [...standings].sort((a, b) => b.wins - a.wins);

  return (
    <div>
      <h2 className="text-lg font-medium mb-2">Ladder</h2>
      <ol className="space-y-1">
        {sorted.map((r, idx) => (
          <li key={r.handle} className="text-sm">
            #{idx + 1} {r.handle} — {r.wins}W-{r.losses}L
          </li>
        ))}
        {sorted.length === 0 && (
          <li className="text-sm opacity-60">No standings yet</li>
        )}
      </ol>
    </div>
  );
}

