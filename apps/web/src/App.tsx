import React, { useEffect, useState } from "react";
import type { GameState, Bead, Move, JudgmentScroll } from "@gbg/types";
import GraphView from "./GraphView";
import Ladder from "./Ladder";
import useMatchState from "./hooks/useMatchState";

// Helper around fetch that only sets the JSON content type when a body is
// present (Fastify returns 400 on an empty JSON body) and throws on HTTP
// errors.
const api = async (path: string, opts: RequestInit = {}) => {
  const headers = opts.body
    ? { "Content-Type": "application/json", ...(opts.headers || {}) }
    : opts.headers;
  const res = await fetch(`http://localhost:8787${path}`, { ...opts, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed with ${res.status}`);
  }
  return res;
};

export default function App() {
  const [matchId, setMatchId] = useState<string>(() => localStorage.getItem("matchId") || "");
  const [handle, setHandle] = useState<string>(() => localStorage.getItem("handle") || "");
  const [playerId, setPlayerId] = useState<string>("");
  const [scroll, setScroll] = useState<JudgmentScroll | null>(null);
  const [selectedPath, setSelectedPath] = useState<number>(0);
  const [beadText, setBeadText] = useState("");
  const [tab, setTab] = useState<'weave' | 'ladder'>('weave');
  const { state, setState, connect } = useMatchState(undefined, { autoConnect: false });
  const currentPlayer = state?.players.find(p => p.id === state.currentPlayerId);
  const isMyTurn = currentPlayer?.id === playerId;

  const twistAllows = (type: Move["type"]): boolean => {
    const effect = state?.twist?.effect;
    if (!effect) return true;
    if ((type === "cast" || type === "mirror" || type === "counterpoint") && effect.modalityLock && !effect.modalityLock.includes("text")) return false;
    if ((type === "bind" || type === "counterpoint") && effect.requiredRelation) {
      const label = type === "bind" ? "analogy" : "motif-echo";
      if (label !== effect.requiredRelation) return false;
    }
    if ((type === "bind" || type === "counterpoint") && effect.justificationLimit) {
      const justification = type === "bind" ? "Two features align; one disanalogy is noted." : "Inverted motif. Counter view.";
      if (justification.length > effect.justificationLimit) return false;
    }
    return true;
  };

  useEffect(() => { localStorage.setItem("matchId", matchId); }, [matchId]);
  useEffect(() => { localStorage.setItem("handle", handle); }, [handle]);

  const createMatch = async () => {
    try {
      const res = await api("/match", { method: "POST" });
      const data = await res.json();
      if (!data?.id) {
        console.error("Invalid match response", data);
        return;
      }
      setMatchId(data.id);
      setState(data);
      connect(data.id);
    } catch (err) {
      console.error("Failed to create match", err);
    }
  };

  const joinMatch = async () => {
    if (!matchId || !handle) return;
    connect(matchId);
    try {
      const res = await api(`/match/${matchId}/join`, {
        method: "POST",
        body: JSON.stringify({ handle })
      });
      const data = await res.json();
      if (data?.id) setPlayerId(data.id);
    } catch (err) {
      console.error("Failed to join match", err);
    }
  };

  const castBead = async () => {
    if (!playerId || !state || !twistAllows("cast")) return;
    const text = beadText.trim();
    if (!text || text.length > 500) return;
    const beadId = `b_${Math.random().toString(36).slice(2, 8)}`;
    const bead: Bead = {
      id: beadId,
      ownerId: playerId,
      modality: "text",
      title: "Idea",
      content: text,
      complexity: 1,
      createdAt: Date.now(),
      seedId: state.seeds[0]?.id
    };
    const move: Move = {
      id: `m_${Math.random().toString(36).slice(2,8)}`,
      playerId,
      type: "cast",
      payload: { bead },
      timestamp: Date.now(),
      durationMs: 1000,
      valid: true
    };
    try {
      await api(`/match/${state.id}/move`, {
        method: "POST",
        body: JSON.stringify(move)
      });
      setBeadText("");
    } catch (err) {
      console.error("Failed to cast bead", err);
    }
  };

  const [selected, setSelected] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelected(sel => {
      if (sel.includes(id)) return sel.filter(s => s !== id);
      if (sel.length === 2) return [sel[1], id];
      return [...sel, id];
    });
  };

  const bindSelected = async () => {
    if (!playerId || !state || selected.length !== 2 || !twistAllows("bind")) return;
    const [from, to] = selected;
    const move: Move = {
      id: `m_${Math.random().toString(36).slice(2,8)}`,
      playerId,
      type: "bind",
      payload: {
        from,
        to,
        label: "analogy",
        justification: "Two features align; one disanalogy is noted.",
      },
      timestamp: Date.now(),
      durationMs: 800,
      valid: true,
    };
    try {
      await api(`/match/${state.id}/move`, {
        method: "POST",
        body: JSON.stringify(move),
      });
      setSelected([]);
    } catch (err) {
      console.error("Failed to bind beads", err);
    }
  };

  const counterpointSelected = async () => {
    if (!playerId || !state || selected.length !== 2 || !twistAllows("counterpoint")) return;
    const [from, to] = selected;
    const move: Move = {
      id: `m_${Math.random().toString(36).slice(2,8)}`,
      playerId,
      type: "counterpoint",
      payload: {
        from,
        to,
        label: "motif-echo",
        justification: "Inverted motif. Counter view.",
      },
      timestamp: Date.now(),
      durationMs: 800,
      valid: true,
    };
    try {
      await api(`/match/${state.id}/move`, {
        method: "POST",
        body: JSON.stringify(move),
      });
      setSelected([]);
    } catch (err) {
      console.error("Failed to counterpoint beads", err);
    }
  };

  const drawTwist = async () => {
    if (!state) return;
    try {
      await api(`/match/${state.id}/twist`, { method: "POST" });
    } catch (err) {
      console.error("Failed to draw twist", err);
    }
  };

  const suggestBead = async () => {
    if (!state || !playerId) return;
    try {
      const res = await api(`/match/${state.id}/ai`, {
        method: "POST",
        body: JSON.stringify({ playerId }),
      });
      const data = await res.json();
      if (data?.suggestion) setBeadText(data.suggestion);
    } catch (err) {
      console.error("Failed to get suggestion", err);
    }
  };

  const requestJudgment = async () => {
    if (!state) return;
    try {
      const res = await api(`/match/${state.id}/judge`, { method: "POST" });
      const data = (await res.json()) as JudgmentScroll;
      setScroll(data);
      setSelectedPath(0);
    } catch (err) {
      console.error("Failed to request judgment", err);
    }
  };

  const requestConcord = async () => {
    if (!state) return;
    try {
      const res = await api(`/match/${state.id}/concord`, { method: "POST" });
      const data = await res.json();
      if (data?.cathedral) {
        setState((s) => (s ? { ...s, cathedral: data.cathedral } : s));
      }
    } catch (err) {
      console.error("Failed to request concord", err);
    }
  };

  const exportLog = async () => {
    if (!state) return;
    try {
      const res = await api(`/match/${state.id}/log`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `match-${state.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export log", err);
    }
  };

  return (
    <div className="min-h-screen p-4 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
      <aside className="bg-[var(--panel)] rounded-2xl p-4 space-y-3 shadow">
        <h1 className="text-xl font-semibold">Glass Bead Game — MVP</h1>
        <div className="space-y-2">
          <label className="block text-sm text-[var(--muted)]">Match ID</label>
          <input value={matchId} onChange={e=>setMatchId(e.target.value)} className="w-full bg-zinc-900 rounded px-3 py-2" placeholder="(create or paste)"/>
          <label className="block text-sm text-[var(--muted)]">Handle</label>
          <input value={handle} onChange={e=>setHandle(e.target.value)} className="w-full bg-zinc-900 rounded px-3 py-2" placeholder="e.g., MagisterRex"/>
          <div className="flex gap-2 pt-2">
            <button onClick={createMatch} className="px-3 py-2 bg-zinc-800 rounded hover:bg-zinc-700">Create</button>
            <button onClick={joinMatch} className="px-3 py-2 bg-zinc-800 rounded hover:bg-zinc-700">Join</button>
          </div>
        </div>
        {state && (
          <div className="pt-4">
            <h2 className="text-sm uppercase tracking-wide text-[var(--muted)]">Turn</h2>
            <p className="text-sm mt-1">
              {currentPlayer?.handle || currentPlayer?.id || ""} {isMyTurn && "(your turn)"}
            </p>
          </div>
        )}
        <div className="pt-4">
          <h2 className="text-sm uppercase tracking-wide text-[var(--muted)]">Seeds</h2>
          <ul className="text-sm mt-2 space-y-1">
            {state?.seeds?.map(s => (
              <li key={s.id} className="opacity-80">• {s.text} <span className="opacity-60">({s.domain})</span></li>
            ))}
          </ul>
        </div>
        {state && (
          <div className="pt-4">
            <h2 className="text-sm uppercase tracking-wide text-[var(--muted)]">Twist</h2>
            {state.twist ? (
              <p className="text-sm mt-1">{state.twist.name}: {state.twist.description}</p>
            ) : (
              <button onClick={drawTwist} disabled={!isMyTurn} className="px-3 py-2 bg-zinc-800 rounded hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed">Draw Twist</button>
            )}
          </div>
        )}
        <div className="pt-4 space-y-2">
          <h2 className="text-sm uppercase tracking-wide text-[var(--muted)]">Cast Bead</h2>
          <textarea
            value={beadText}
            onChange={e => setBeadText(e.target.value)}
            className="w-full bg-zinc-900 rounded px-3 py-2 h-24"
            placeholder="Share an idea..."
          />
          <button
            onClick={suggestBead}
            disabled={!isMyTurn}
            className="w-full px-3 py-2 bg-zinc-800 rounded hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Suggest with AI
          </button>
          <button
            onClick={castBead}
            disabled={!beadText.trim() || !isMyTurn || !twistAllows("cast")}
            className="w-full px-3 py-2 bg-indigo-600 rounded hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cast Bead
          </button>
          <button
            onClick={bindSelected}
            disabled={!isMyTurn || selected.length !== 2 || !twistAllows("bind")}
            className="w-full px-3 py-2 bg-indigo-600 rounded hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Bind Selected
          </button>
          <button
            onClick={counterpointSelected}
            disabled={!isMyTurn || selected.length !== 2 || !twistAllows("counterpoint")}
            className="w-full px-3 py-2 bg-indigo-600 rounded hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Counterpoint Selected
          </button>
          <button onClick={requestJudgment} disabled={!isMyTurn} className="w-full px-3 py-2 bg-emerald-600 rounded hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed">Request Judgment</button>
          <button onClick={requestConcord} disabled={!isMyTurn} className="w-full px-3 py-2 bg-amber-600 rounded hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed">Concord</button>
          <button onClick={exportLog} className="w-full px-3 py-2 bg-zinc-800 rounded hover:bg-zinc-700">Export Log</button>
        </div>
        <p className="text-xs text-[var(--muted)] pt-4">MVP: cast text beads, bind, get a stub judgment.</p>
      </aside>

      <main className="bg-[var(--panel)] rounded-2xl p-4 shadow">
        <nav className="mb-3 flex gap-4">
          <button
            onClick={() => setTab('weave')}
            className={tab === 'weave' ? 'font-semibold underline' : 'opacity-60'}
          >
            Weave
          </button>
          <button
            onClick={() => setTab('ladder')}
            className={tab === 'ladder' ? 'font-semibold underline' : 'opacity-60'}
          >
            Ladder
          </button>
        </nav>
        {tab === 'weave' && (
          <>
            <h2 className="text-lg font-medium mb-3">Weave</h2>
            {!state && <p className="opacity-60">Create or join a match to begin.</p>}
            {state && (
              <div className="grid gap-4 lg:grid-cols-2">
                <section>
                  <h3 className="text-sm uppercase tracking-wide text-[var(--muted)]">Beads</h3>
                  <ul className="mt-2 space-y-2">
                    {Object.values(state.beads).map((b) => (
                      <li
                        key={b.id}
                        data-testid={`bead-${b.id}`}
                        onClick={() => toggleSelect(b.id)}
                        aria-selected={selected.includes(b.id)}
                        className={`p-3 rounded bg-zinc-900 cursor-pointer ${
                          selected.includes(b.id) ? "ring-2 ring-indigo-500" : ""
                        }`}
                      >
                        <div className="text-sm font-semibold">{b.title || b.id}</div>
                        <div className="text-xs opacity-70">{b.modality} · by {b.ownerId}</div>
                        <div className="text-xs mt-1 opacity-80">{tryParseMarkdown(b.content)}</div>
                      </li>
                    ))}
                  </ul>
                </section>
                <section>
                  <h3 className="text-sm uppercase tracking-wide text-[var(--muted)]">Strings</h3>
                  <ul className="mt-2 space-y-2">
                    {Object.values(state.edges).map((e) => (
                      <li key={e.id} className="p-3 rounded bg-zinc-900 text-xs">
                        <div className="opacity-80">
                          <b>{e.label}</b>: {e.from} → {e.to}
                        </div>
                        <div className="opacity-60 mt-1">{e.justification}</div>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="lg:col-span-2">
                  <h3 className="text-sm uppercase tracking-wide text-[var(--muted)]">Graph</h3>
                  <div className="mt-2">
                    <GraphView matchId={matchId} state={state ?? undefined} strongPaths={scroll?.strongPaths} selectedPathIndex={selectedPath} width={600} height={400} />
                  </div>
                </section>
              </div>
            )}
            {scroll && (
              <section className="mt-6">
                <h3 className="text-sm uppercase tracking-wide text-[var(--muted)]">Judgment</h3>
                  <div className="mt-2 text-sm">
                    <div className="mb-2">Winner: {scroll.winner || "TBD"}</div>
                    <ul className="space-y-1">
                      {Object.entries(scroll.scores).map(([pid, s]) => (
                        <li key={pid} className="text-xs">
                          <b>{pid}</b>: {(s.total * 100).toFixed(1)}% (res {s.resonance.toFixed(2)}, nov {s.novelty.toFixed(2)}, int {s.integrity.toFixed(2)}, aes {s.aesthetics.toFixed(2)}, res {s.resilience.toFixed(2)})
                        </li>
                      ))}
                    </ul>
                    {scroll.strongPaths.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-xs uppercase tracking-wide text-[var(--muted)]">Strong Paths</h4>
                        <ul className="mt-1 space-y-1">
                          {scroll.strongPaths.map((p, idx) => (
                            <li key={idx}>
                              <button onClick={() => setSelectedPath(idx)} className={`text-xs underline ${selectedPath === idx ? 'font-bold' : ''}`}>
                                {p.nodes.join(' → ')} {p.why && `(${p.why})`}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {scroll.weakSpots.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-xs uppercase tracking-wide text-[var(--muted)]">Weak Spots</h4>
                        <div className="text-xs">{scroll.weakSpots.join(', ')}</div>
                      </div>
                    )}
                  </div>
              </section>
            )}
          </>
        )}
        {tab === 'ladder' && <Ladder />}
      </main>
    </div>
  );
}

function tryParseMarkdown(content: string){
  return content;
}
