import React, { useEffect, useState } from "react";
import {
  MOVE_COSTS,
  sanitizeMarkdown,
  type GameState,
  type Bead,
  type Move,
  type JudgmentScroll,
  type Modality,
} from "@gbg/types";
import { marked } from "marked";
import GraphView from "./GraphView";
import useMatchState from "./hooks/useMatchState";
import api from "./api";

export default function App() {
  const [matchId, setMatchId] = useState<string>(() => localStorage.getItem("matchId") || "");
  const [handle, setHandle] = useState<string>(() => localStorage.getItem("handle") || "");
  const [playerId, setPlayerId] = useState<string>("");
  const [scroll, setScroll] = useState<JudgmentScroll | null>(null);
  const [selectedPath, setSelectedPath] = useState<number>(0);
  const [beadText, setBeadText] = useState("");
  const [beadModality, setBeadModality] = useState<Modality>("text");
  const { state, setState, connect } = useMatchState(undefined, { autoConnect: false });
  const currentPlayer = state?.players.find(p => p.id === state.currentPlayerId);
  const isMyTurn = currentPlayer?.id === playerId;

  const displayPlayer = (id: string) => {
    const player = state?.players.find((p) => p.id === id);
    return player?.handle || id;
  };

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

  const safeSummary = scroll?.summary ?? {
    leadingPlayer: scroll?.winner,
    axisLeads: [],
    strongPathCount: scroll?.strongPaths?.length ?? 0,
    weakSpotCount: scroll?.weakSpots?.length ?? 0,
  };
  const dialogueTurns = scroll?.dialogue?.turns ?? [];
  const magisterName = scroll?.dialogue?.magister ?? "Magister Ludi";

  const remainingResources = (type: Move["type"]) => {
    if (!currentPlayer) return null;
    const cost = MOVE_COSTS[type] ?? {};
    let { insight, restraint, wildAvailable } = currentPlayer.resources;
    if (cost.insight) {
      if (insight >= cost.insight) {
        insight -= cost.insight;
      } else if (wildAvailable) {
        wildAvailable = false;
        insight = 0;
      } else {
        return null;
      }
    }
    if (cost.restraint) {
      if (restraint >= cost.restraint) {
        restraint -= cost.restraint;
      } else if (wildAvailable) {
        wildAvailable = false;
        restraint = 0;
      } else {
        return null;
      }
    }
    return { insight, restraint, wildAvailable };
  };

  const canAfford = (type: Move["type"]) => !!remainingResources(type);

  const moveCostLabel = (type: Move["type"]) => {
    const cost = MOVE_COSTS[type] ?? {};
    const parts: string[] = [];
    if (cost.insight) parts.push(`-${cost.insight} Insight`);
    if (cost.restraint) parts.push(`-${cost.restraint} Restraint`);
    return parts.length ? ` (${parts.join(", ")})` : "";
  };

  const twistAllows = (type: Move["type"]): boolean => {
    const effect = state?.twist?.effect;
    if (!effect) return true;
    if ((type === "cast" || type === "mirror") && effect.modalityLock && !effect.modalityLock.includes(beadModality)) return false;
    if (
      (type === "bind" || type === "counterpoint" || type === "canonize" || type === "refute") &&
      effect.requiredRelation
    ) {
      const labelMap: Record<string, string> = {
        bind: "analogy",
        counterpoint: "motif-echo",
        canonize: "proof",
        refute: "refutation",
      };
      const label = labelMap[type];
      if (label && label !== effect.requiredRelation) return false;
    }
    if ((type === "bind" || type === "counterpoint" || type === "canonize" || type === "refute") && effect.justificationLimit) {
      const justificationMap: Record<string, string> = {
        bind: "Two features align; one disanalogy is noted.",
        counterpoint: "Inverted motif. Counter view.",
        canonize: "",
        refute: "",
      };
      const justification = justificationMap[type] ?? "";
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
    if (!playerId || !state || beadModality !== "text" || !twistAllows("cast")) return;
    const text = beadText.trim();
    if (!text || text.length > 500) return;
    const beadId = `b_${Math.random().toString(36).slice(2, 8)}`;
    const bead: Bead = {
      id: beadId,
      ownerId: playerId,
      modality: beadModality,
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

  const mirrorSelected = async () => {
    if (!playerId || !state || selected.length !== 1 || !beadText.trim() || !twistAllows("mirror")) return;
    const targetId = selected[0];
    const text = beadText.trim();
    const beadId = `b_${Math.random().toString(36).slice(2, 8)}`;
    const bead: Bead = {
      id: beadId,
      ownerId: playerId,
      modality: beadModality,
      title: "Mirror",
      content: text,
      complexity: 1,
      createdAt: Date.now(),
      seedId: state.seeds[0]?.id,
    };
    const move: Move = {
      id: `m_${Math.random().toString(36).slice(2,8)}`,
      playerId,
      type: "mirror",
      payload: { bead, targetId },
      timestamp: Date.now(),
      durationMs: 1000,
      valid: true,
    };
    try {
      await api(`/match/${state.id}/move`, {
        method: "POST",
        body: JSON.stringify(move),
      });
      setSelected([]);
      setBeadText("");
    } catch (err) {
      console.error("Failed to mirror bead", err);
    }
  };

  const liftMove = async () => {
    if (!playerId || !state || selected.length !== 1 || !twistAllows("lift")) return;
    const targetId = selected[0];
    const move: Move = {
      id: `m_${Math.random().toString(36).slice(2,8)}`,
      playerId,
      type: "lift",
      payload: { targetId },
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
      console.error("Failed to lift", err);
    }
  };

  const canonizeMove = async () => {
    if (!playerId || !state || selected.length !== 1 || !twistAllows("canonize")) return;
    const targetId = selected[0];
    const move: Move = {
      id: `m_${Math.random().toString(36).slice(2,8)}`,
      playerId,
      type: "canonize",
      payload: { targetId },
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
      console.error("Failed to canonize", err);
    }
  };

  const refuteMove = async () => {
    if (!playerId || !state || selected.length !== 1 || !twistAllows("refute")) return;
    const targetId = selected[0];
    const move: Move = {
      id: `m_${Math.random().toString(36).slice(2,8)}`,
      playerId,
      type: "refute",
      payload: { targetId },
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
      console.error("Failed to refute", err);
    }
  };

  const pruneMove = async () => {
    if (!playerId || !state || selected.length !== 1 || !twistAllows("prune")) return;
    const targetId = selected[0];
    const move: Move = {
      id: `m_${Math.random().toString(36).slice(2,8)}`,
      playerId,
      type: "prune",
      payload: { targetId },
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
      console.error("Failed to prune", err);
    }
  };

  const jokerMove = async () => {
    if (!playerId || !state || !twistAllows("joker")) return;
    const move: Move = {
      id: `m_${Math.random().toString(36).slice(2,8)}`,
      playerId,
      type: "joker",
      payload: {},
      timestamp: Date.now(),
      durationMs: 800,
      valid: true,
    };
    try {
      await api(`/match/${state.id}/move`, {
        method: "POST",
        body: JSON.stringify(move),
      });
    } catch (err) {
      console.error("Failed to play joker", err);
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
            {currentPlayer && (
              <p className="text-xs mt-1">
                Insight: {currentPlayer.resources.insight}, Restraint: {currentPlayer.resources.restraint}, Wild: {currentPlayer.resources.wildAvailable ? 1 : 0}
              </p>
            )}
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
          {currentPlayer && (
            <p className="text-xs text-[var(--muted)]">
              Insight: {currentPlayer.resources.insight}, Restraint: {currentPlayer.resources.restraint}, Wild: {currentPlayer.resources.wildAvailable ? 1 : 0}
            </p>
          )}
          <textarea
            value={beadText}
            onChange={e => setBeadText(e.target.value)}
            className="w-full bg-zinc-900 rounded px-3 py-2 h-24"
            placeholder="Share an idea..."
          />
          <label htmlFor="modality" className="block text-sm text-[var(--muted)] mt-2">Modality</label>
          <select
            id="modality"
            value={beadModality}
            onChange={e => setBeadModality(e.target.value as Modality)}
            className="w-full bg-zinc-900 rounded px-3 py-2"
          >
            <option value="text">text</option>
            <option value="image">image</option>
            <option value="audio">audio</option>
            <option value="math">math</option>
            <option value="code">code</option>
            <option value="data">data</option>
          </select>
          <button
            onClick={suggestBead}
            disabled={!isMyTurn}
            className="w-full px-3 py-2 bg-zinc-800 rounded hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Suggest with AI
          </button>
          <button
            onClick={castBead}
            disabled={
              !beadText.trim() ||
              beadModality !== "text" ||
              !isMyTurn ||
              !twistAllows("cast") ||
              !canAfford("cast")
            }
            className="w-full px-3 py-2 bg-indigo-600 rounded hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {`Cast Bead${moveCostLabel("cast")}`}
          </button>
          <button
            onClick={bindSelected}
            disabled={!isMyTurn || selected.length !== 2 || !twistAllows("bind") || !canAfford("bind")}
            className="w-full px-3 py-2 bg-indigo-600 rounded hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {`Bind Selected${moveCostLabel("bind")}`}
          </button>
          <button
            onClick={counterpointSelected}
            disabled={!isMyTurn || selected.length !== 2 || !twistAllows("counterpoint") || !canAfford("counterpoint")}
            className="w-full px-3 py-2 bg-indigo-600 rounded hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {`Counterpoint Selected${moveCostLabel("counterpoint")}`}
          </button>
          <button
            onClick={mirrorSelected}
            disabled={!isMyTurn || selected.length !== 1 || !beadText.trim() || !twistAllows("mirror") || !canAfford("mirror")}
            className="w-full px-3 py-2 bg-indigo-600 rounded hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {`Mirror Selected${moveCostLabel("mirror")}`}
          </button>
          <button
            onClick={liftMove}
            disabled={!isMyTurn || selected.length !== 1 || !twistAllows("lift") || !canAfford("lift")}
            className="w-full px-3 py-2 bg-indigo-600 rounded hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {`Lift${moveCostLabel("lift")}`}
          </button>
          <button
            onClick={canonizeMove}
            disabled={!isMyTurn || selected.length !== 1 || !twistAllows("canonize") || !canAfford("canonize")}
            className="w-full px-3 py-2 bg-indigo-600 rounded hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {`Canonize${moveCostLabel("canonize")}`}
          </button>
          <button
            onClick={refuteMove}
            disabled={!isMyTurn || selected.length !== 1 || !twistAllows("refute") || !canAfford("refute")}
            className="w-full px-3 py-2 bg-indigo-600 rounded hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {`Refute${moveCostLabel("refute")}`}
          </button>

          <button
            onClick={pruneMove}
            disabled={!isMyTurn || selected.length !== 1 || !twistAllows("prune") || !canAfford("prune")}
            className="w-full px-3 py-2 bg-indigo-600 rounded hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {`Prune${moveCostLabel("prune")}`}
          </button>
          <button
            onClick={jokerMove}
            disabled={!isMyTurn || !twistAllows("joker") || !canAfford("joker")}
            className="w-full px-3 py-2 bg-indigo-600 rounded hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {`Joker${moveCostLabel("joker")}`}
          </button>
          <button onClick={requestJudgment} disabled={!isMyTurn} className="w-full px-3 py-2 bg-emerald-600 rounded hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed">Request Judgment</button>
          <button onClick={requestConcord} disabled={!isMyTurn} className="w-full px-3 py-2 bg-amber-600 rounded hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed">Concord</button>
          <button onClick={exportLog} className="w-full px-3 py-2 bg-zinc-800 rounded hover:bg-zinc-700">Export Log</button>
        </div>
        <p className="text-xs text-[var(--muted)] pt-4">
          Moves: cast, bind, counterpoint, mirror, lift, canonize, refute, prune, joker. Features: twists, AI suggestions,
          judgment, concord.
        </p>
      </aside>

      <main className="bg-[var(--panel)] rounded-2xl p-4 shadow">
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
                    <div
                      className="text-xs mt-1 opacity-80"
                      dangerouslySetInnerHTML={{ __html: parseMarkdown(b.content) }}
                    />
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
            )}
            {scroll && (
              <section className="mt-6">
                <h3 className="text-sm uppercase tracking-wide text-[var(--muted)]">Magister's Judgment</h3>
                <div className="mt-2 text-sm space-y-4">
                  <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                    <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{magisterName}</div>
                    <div className="mt-1 text-base font-medium">
                      {scroll.winner ? `${displayPlayer(scroll.winner)} carries the laurel.` : "No laurel bestowed yet."}
                    </div>
                    <div className="mt-2 text-xs text-[var(--muted)]">
                      Paths traced: {safeSummary.strongPathCount} · Quiet beads: {safeSummary.weakSpotCount}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {dialogueTurns.map((turn, idx) => {
                      if (turn.kind === "axis-insight") {
                        return (
                          <article key={idx} className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
                            <header className="flex items-baseline justify-between gap-2">
                              <span className="text-xs uppercase tracking-wide text-[var(--muted)]">{turn.title}</span>
                              <span className="text-[var(--muted)] text-xs">axis: {turn.axis}</span>
                            </header>
                            <p className="mt-2 leading-relaxed">{turn.insight}</p>
                            <ul className="mt-3 text-xs space-y-1">
                              {turn.ranking.map((entry) => (
                                <li key={entry.playerId} className="flex justify-between gap-2">
                                  <span className="font-medium">{displayPlayer(entry.playerId)}</span>
                                  <span className="opacity-70">
                                    tone {formatPercent(entry.value)} · influence {formatPercent(entry.contribution)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                            <p className="mt-3 text-xs italic text-[var(--muted)]">{turn.prompt}</p>
                          </article>
                        );
                      }
                      if (turn.kind === "path-story") {
                        return (
                          <article key={idx} className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-900/60">
                            <header className="flex items-baseline justify-between gap-2">
                              <span className="text-xs uppercase tracking-wide text-emerald-200">{turn.title}</span>
                              <span className="text-xs text-emerald-200/80">weight {turn.weight.toFixed(2)}</span>
                            </header>
                            <p className="mt-2 leading-relaxed">{turn.story}</p>
                            <div className="mt-2 text-xs text-emerald-200/90">{turn.nodes.join(" → ")}</div>
                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                              <button
                                onClick={() => setSelectedPath(turn.pathIndex)}
                                className={`px-3 py-1 rounded-full border ${selectedPath === turn.pathIndex ? 'border-emerald-300 text-emerald-200' : 'border-emerald-700 text-emerald-200/80'}`}
                              >
                                Trace path
                              </button>
                              <span className="italic text-emerald-200/70">{turn.prompt}</span>
                            </div>
                          </article>
                        );
                      }
                      return (
                        <article key={idx} className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-900/60">
                          <header className="flex items-baseline justify-between gap-2">
                            <span className="text-xs uppercase tracking-wide text-indigo-200">{turn.title}</span>
                          </header>
                          <p className="mt-2 leading-relaxed">{turn.reflection}</p>
                          <p className="mt-3 text-xs italic text-indigo-200/80">{turn.prompt}</p>
                        </article>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
        <section className="mt-8 rounded-xl bg-zinc-900/60 p-4">
          <h3 className="text-sm uppercase tracking-wide text-[var(--muted)]">Reflective Archive</h3>
          <p className="text-sm mt-2 opacity-80">
            Competitive standings now live in our reflective archive chronicles. Review post-match summaries to revisit highlights and lessons without a public ranking board.
          </p>
        </section>
      </main>
    </div>
  );
}

function parseMarkdown(content: string): string {
  const html = marked.parse(content, { async: false }) as string;
  return sanitizeMarkdown(html);
}
