import React, { useEffect, useMemo, useState } from "react";
import {
  MOVE_COSTS,
  sanitizeMarkdown,
  type Bead,
  type Edge,
  type Move,
  type JudgmentScroll,
  type Modality,
} from "@gbg/types";
import { marked } from "marked";
import GraphView from "./GraphView";
import useMatchState from "./hooks/useMatchState";
import api from "./api";

const AXIS_INFO = {
  resonance: {
    label: "Resonance",
    desc: "Semantic cohesion between connected beads",
    weight: 0.3,
  },
  novelty: {
    label: "Novelty",
    desc: "Rarity of n-grams vs baseline corpus",
    weight: 0.2,
  },
  integrity: {
    label: "Integrity",
    desc: "Lack of contradictions between beads",
    weight: 0.2,
  },
  aesthetics: {
    label: "Aesthetics",
    desc: "Beauty via bead contributions",
    weight: 0.2,
  },
  resilience: {
    label: "Resilience",
    desc: "Structural robustness of the web",
    weight: 0.1,
  },
} as const;


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

  const playersById = useMemo(() => {
    if (!state) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const player of state.players) {
      map.set(player.id, player.handle || player.id);
    }
    return map;
  }, [state]);

  const beadsInOrder = useMemo(() => {
    if (!state) return [] as Bead[];
    return Object.values(state.beads).sort((a, b) => a.createdAt - b.createdAt);
  }, [state]);

  const stringsInWeave = useMemo(() => {
    if (!state) return [] as Edge[];
    return Object.values(state.edges);
  }, [state]);

  const weaveChronicle = useMemo(() => {
    if (!state) return [] as Array<{ move: Move; summary: string; detail?: string }>;
    return state.moves
      .slice()
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((move) => {
        const actor = playersById.get(move.playerId) ?? move.playerId;
        if (move.type === "cast" || move.type === "mirror") {
          const bead = move.payload?.bead as Bead | undefined;
          const beadLabel = bead?.title || bead?.id || "New bead";
          const verb = move.type === "cast" ? "casts" : "mirrors";
          return {
            move,
            summary: `${actor} ${verb} ${beadLabel}`,
            detail: bead?.content,
          };
        }
        if (move.type === "bind" || move.type === "counterpoint" || move.type === "canonize" || move.type === "refute") {
          const relation = move.payload?.label || move.type;
          const from = move.payload?.from || move.payload?.targetId || "";
          const to = move.payload?.to || "";
          return {
            move,
            summary: `${actor} ${relation} ${from}${to ? ` → ${to}` : ""}`,
            detail: move.payload?.justification,
          };
        }
        if (move.type === "lift" || move.type === "prune" || move.type === "joker") {
          const target = move.payload?.targetId || "the weave";
          return {
            move,
            summary: `${actor} ${move.type} ${target}`,
            detail: move.notes,
          };
        }
        return {
          move,
          summary: `${actor} plays ${move.type}`,
          detail: move.notes,
        };
      });
  }, [playersById, state]);

  const preludeNarrative = useMemo(() => {
    if (!state)
      return "Gather your ensemble. Create or join a match to draw the first strands of thought.";
    const seeds = state.seeds;
    const players = state.players;
    const seedsLine =
      seeds.length > 0
        ? `Seeds on the lectern: ${seeds
            .map((s) => `"${s.text}"${s.domain ? ` (${s.domain})` : ""}`)
            .join(", ")}.`
        : "No seeds have been revealed yet.";
    const playersLine =
      players.length > 0
        ? `Voices in the circle: ${players
            .map((p) => p.handle || p.id)
            .join(", ")}.`
        : "Awaiting players to take their seats.";
    const twistLine = state.twist
      ? `${state.twist.name} stirs the air: ${state.twist.description}`
      : "The twist deck remains face-down for now.";
    return [seedsLine, playersLine, twistLine].filter(Boolean).join(" ");
  }, [state]);

  const activeStrongPath = scroll?.strongPaths?.[selectedPath];

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
    <div className="min-h-screen bg-[var(--bg)] text-white p-4 md:p-6 transition-colors duration-700 ease-out">
      <div className="mx-auto max-w-7xl grid grid-cols-1 gap-4 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] xl:grid-cols-[minmax(260px,320px)_minmax(0,1fr)_minmax(260px,360px)]">
        <section className="bg-[var(--panel)] rounded-3xl p-5 shadow-xl space-y-6 transition-all duration-700 ease-out">
          <header className="space-y-2">
            <h1 className="text-xl font-semibold">Glass Bead Game — Revival</h1>
            <p className="text-sm leading-relaxed text-[var(--muted)] transition-opacity duration-700 ease-out">
              {preludeNarrative}
            </p>
          </header>

          <div className="space-y-3">
            <label className="block text-sm text-[var(--muted)]">Match ID</label>
            <input
              value={matchId}
              onChange={(e) => setMatchId(e.target.value)}
              className="w-full bg-zinc-900/70 rounded-xl px-3 py-2 transition-colors duration-500 ease-out focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="(create or paste)"
            />
            <label className="block text-sm text-[var(--muted)]">Handle</label>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="w-full bg-zinc-900/70 rounded-xl px-3 py-2 transition-colors duration-500 ease-out focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., MagisterRex"
            />
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={createMatch}
                className="px-3 py-2 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-colors duration-500 ease-out"
              >
                Create
              </button>
              <button
                onClick={joinMatch}
                className="px-3 py-2 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-colors duration-500 ease-out"
              >
                Join
              </button>
            </div>
          </div>

          {state && (
            <div className="space-y-2 border-t border-white/5 pt-4">
              <h2 className="text-sm uppercase tracking-wide text-[var(--muted)]">Turn & Resources</h2>
              <p className="text-sm transition-opacity duration-500 ease-out">
                {currentPlayer?.handle || currentPlayer?.id || ""} {isMyTurn && "(your turn)"}
              </p>
              {currentPlayer && (
                <p className="text-xs text-[var(--muted)]">
                  Insight: {currentPlayer.resources.insight}, Restraint: {currentPlayer.resources.restraint}, Wild: {currentPlayer.resources.wildAvailable ? 1 : 0}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2 border-t border-white/5 pt-4">
            <h2 className="text-sm uppercase tracking-wide text-[var(--muted)]">Seeds</h2>
            {state?.seeds?.length ? (
              <ul className="text-sm space-y-1">
                {state.seeds.map((s) => (
                  <li key={s.id} className="opacity-80 transition-opacity duration-500 ease-out">
                    • {s.text} <span className="opacity-60">({s.domain})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--muted)]">Awaiting seeds.</p>
            )}
          </div>

          {state && (
            <div className="space-y-2 border-t border-white/5 pt-4">
              <h2 className="text-sm uppercase tracking-wide text-[var(--muted)]">Twist</h2>
              {state.twist ? (
                <p className="text-sm transition-opacity duration-500 ease-out">
                  {state.twist.name}: {state.twist.description}
                </p>
              ) : (
                <button
                  onClick={drawTwist}
                  disabled={!isMyTurn}
                  className="px-3 py-2 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-colors duration-500 ease-out disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Draw Twist
                </button>
              )}
            </div>
          )}

          <div className="space-y-3 border-t border-white/5 pt-4">
            <h2 className="text-sm uppercase tracking-wide text-[var(--muted)]">Cast Bead</h2>
            {currentPlayer && (
              <p className="text-xs text-[var(--muted)]">
                Insight: {currentPlayer.resources.insight}, Restraint: {currentPlayer.resources.restraint}, Wild: {currentPlayer.resources.wildAvailable ? 1 : 0}
              </p>
            )}
            <textarea
              value={beadText}
              onChange={(e) => setBeadText(e.target.value)}
              className="w-full bg-zinc-900/70 rounded-2xl px-3 py-2 h-24 transition-colors duration-500 ease-out focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Share an idea..."
            />
            <label htmlFor="modality" className="block text-sm text-[var(--muted)]">Modality</label>
            <select
              id="modality"
              value={beadModality}
              onChange={(e) => setBeadModality(e.target.value as Modality)}
              className="w-full bg-zinc-900/70 rounded-xl px-3 py-2 transition-colors duration-500 ease-out focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="w-full px-3 py-2 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-colors duration-500 ease-out disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="w-full px-3 py-2 bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-colors duration-500 ease-out disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {`Cast Bead${moveCostLabel("cast")}`}
            </button>
            <button
              onClick={bindSelected}
              disabled={!isMyTurn || selected.length !== 2 || !twistAllows("bind") || !canAfford("bind")}
              className="w-full px-3 py-2 bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-colors duration-500 ease-out disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {`Bind Selected${moveCostLabel("bind")}`}
            </button>
            <button
              onClick={counterpointSelected}
              disabled={!isMyTurn || selected.length !== 2 || !twistAllows("counterpoint") || !canAfford("counterpoint")}
              className="w-full px-3 py-2 bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-colors duration-500 ease-out disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {`Counterpoint Selected${moveCostLabel("counterpoint")}`}
            </button>
            <button
              onClick={mirrorSelected}
              disabled={!isMyTurn || selected.length !== 1 || !beadText.trim() || !twistAllows("mirror") || !canAfford("mirror")}
              className="w-full px-3 py-2 bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-colors duration-500 ease-out disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {`Mirror Selected${moveCostLabel("mirror")}`}
            </button>
            <button
              onClick={liftMove}
              disabled={!isMyTurn || selected.length !== 1 || !twistAllows("lift") || !canAfford("lift")}
              className="w-full px-3 py-2 bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-colors duration-500 ease-out disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {`Lift${moveCostLabel("lift")}`}
            </button>
            <button
              onClick={canonizeMove}
              disabled={!isMyTurn || selected.length !== 1 || !twistAllows("canonize") || !canAfford("canonize")}
              className="w-full px-3 py-2 bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-colors duration-500 ease-out disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {`Canonize${moveCostLabel("canonize")}`}
            </button>
            <button
              onClick={refuteMove}
              disabled={!isMyTurn || selected.length !== 1 || !twistAllows("refute") || !canAfford("refute")}
              className="w-full px-3 py-2 bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-colors duration-500 ease-out disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {`Refute${moveCostLabel("refute")}`}
            </button>
            <button
              onClick={pruneMove}
              disabled={!isMyTurn || selected.length !== 1 || !twistAllows("prune") || !canAfford("prune")}
              className="w-full px-3 py-2 bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-colors duration-500 ease-out disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {`Prune${moveCostLabel("prune")}`}
            </button>
            <button
              onClick={jokerMove}
              disabled={!isMyTurn || !twistAllows("joker") || !canAfford("joker")}
              className="w-full px-3 py-2 bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-colors duration-500 ease-out disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {`Joker${moveCostLabel("joker")}`}
            </button>
            <button
              onClick={requestJudgment}
              disabled={!isMyTurn}
              className="w-full px-3 py-2 bg-emerald-600 rounded-xl hover:bg-emerald-500 transition-colors duration-500 ease-out disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Request Judgment
            </button>
            <button
              onClick={requestConcord}
              disabled={!isMyTurn}
              className="w-full px-3 py-2 bg-amber-600 rounded-xl hover:bg-amber-500 transition-colors duration-500 ease-out disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Concord
            </button>
            <button
              onClick={exportLog}
              className="w-full px-3 py-2 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-colors duration-500 ease-out"
            >
              Export Log
            </button>
          </div>

          <p className="text-xs text-[var(--muted)] pt-2">
            Moves: cast, bind, counterpoint, mirror, lift, canonize, refute, prune, joker. Features: twists, AI suggestions,
            judgment, concord.
          </p>
        </section>

        <section className="bg-[var(--panel)] rounded-3xl p-5 shadow-xl space-y-6 transition-all duration-700 ease-out">
          <header className="space-y-1">
            <h2 className="text-lg font-medium">Weave Log</h2>
            <p className="text-sm text-[var(--muted)]">
              Threads arrive in order. Select beads to form relations and choose strong paths to tint the graph.
            </p>
          </header>

          {!state && <p className="text-sm text-[var(--muted)]">Create or join a match to begin weaving.</p>}

          {state && (
            <div className="space-y-6">
              {scroll?.strongPaths?.length ? (
                <div className="space-y-2">
                  <h3 className="text-sm uppercase tracking-wide text-[var(--muted)]">Strong Paths</h3>
                  <p className="text-xs text-[var(--muted)]">
                    Choose a path to bathe the graph in its cadence. The Scroll panel mirrors your selection live.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {scroll.strongPaths.map((path, idx) => (
                      <button
                        key={`${path.nodes.join("-")}-${idx}`}
                        onClick={() => setSelectedPath(idx)}
                        className={`px-3 py-2 rounded-2xl text-xs transition-all duration-500 ease-out border border-white/10 hover:border-indigo-400/60 ${
                          selectedPath === idx ? "bg-indigo-600/80" : "bg-zinc-900/60"
                        }`}
                      >
                        {path.nodes.join(" → ")} {path.why ? `— ${path.why}` : ""}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <h3 className="text-sm uppercase tracking-wide text-[var(--muted)]">Strong Paths</h3>
                  <p className="text-xs text-[var(--muted)]">No highlighted paths yet. Request a judgment to reveal them.</p>
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-2">
                <section>
                  <h3 className="text-sm uppercase tracking-wide text-[var(--muted)]">Beads</h3>
                  <ul className="mt-3 space-y-2">
                    {beadsInOrder.map((b) => (
                      <li
                        key={b.id}
                        data-testid={`bead-${b.id}`}
                        onClick={() => toggleSelect(b.id)}
                        aria-selected={selected.includes(b.id)}
                        className={`p-3 rounded-2xl bg-zinc-900/60 border border-white/5 cursor-pointer transition-all duration-500 ease-out hover:border-indigo-400/60 ${
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
                  <ul className="mt-3 space-y-2">
                    {stringsInWeave.map((e) => (
                      <li key={e.id} className="p-3 rounded-2xl bg-zinc-900/60 text-xs border border-white/5 transition-colors duration-500 ease-out">
                        <div className="opacity-80">
                          <b>{e.label}</b>: {e.from} → {e.to}
                        </div>
                        <div className="opacity-60 mt-1">{e.justification}</div>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              <section>
                <h3 className="text-sm uppercase tracking-wide text-[var(--muted)]">Chronicle</h3>
                {weaveChronicle.length ? (
                  <ul className="mt-3 space-y-3">
                    {weaveChronicle.map(({ move, summary, detail }) => (
                      <li key={move.id} className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 transition-all duration-500 ease-out">
                        <div className="text-sm font-medium">{summary}</div>
                        <div className="mt-1 text-xs uppercase tracking-wide text-[var(--muted)]">{move.type}</div>
                        {detail && (
                          <div
                            className="mt-2 text-xs leading-relaxed opacity-80"
                            dangerouslySetInnerHTML={{ __html: parseMarkdown(detail) }}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-[var(--muted)]">No moves recorded yet.</p>
                )}
              </section>
            </div>
          )}
        </section>

        <section className="bg-[var(--panel)] rounded-3xl p-5 shadow-xl space-y-6 transition-all duration-700 ease-out">
          <header className="space-y-1">
            <h2 className="text-lg font-medium">Scroll</h2>
            <p className="text-sm text-[var(--muted)]">
              The Magister whispers through the graph. Watch the commentary evolve as the weave deepens.
            </p>
          </header>

          {!state && <p className="text-sm text-[var(--muted)]">No match is active. Summon a board to receive the scroll.</p>}

          {state && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm uppercase tracking-wide text-[var(--muted)]">Living Graph</h3>
                <p className="text-xs text-[var(--muted)]">Highlight selections from the Weave panel to see resonant paths glow.</p>
                <div className="mt-3 rounded-3xl bg-zinc-900/40 p-3 backdrop-blur-sm border border-white/5">
                  <div className="overflow-x-auto">
                    <GraphView
                      matchId={matchId}
                      state={state ?? undefined}
                      strongPaths={scroll?.strongPaths}
                      selectedPathIndex={selectedPath}
                      width={640}
                      height={420}
                    />
                  </div>
                </div>
                {activeStrongPath && (
                  <div className="mt-3 rounded-2xl bg-indigo-600/10 border border-indigo-500/40 p-3 text-xs leading-relaxed">
                    <div className="font-semibold text-indigo-200">Highlighted path</div>
                    <p className="mt-1 text-indigo-100/80">
                      {activeStrongPath.nodes.join(" → ")} {activeStrongPath.why ? `— ${activeStrongPath.why}` : ""}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-3 border-t border-white/5 pt-4">
                <h3 className="text-sm uppercase tracking-wide text-[var(--muted)]">Magister Commentary</h3>
                {scroll ? (
                  <div className="space-y-4 text-sm">
                    <div className="rounded-2xl bg-zinc-900/60 border border-white/5 p-3">
                      <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Verdict</div>
                      <div className="text-base font-semibold mt-1">Winner: {scroll.winner || "TBD"}</div>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(scroll.scores).map(([pid, score]) => (
                        <div key={pid} className="rounded-2xl bg-zinc-900/60 border border-white/5 p-3 text-xs space-y-2">
                          <div className="font-semibold text-sm">{pid}</div>
                          <div>Total: {(score.total * 100).toFixed(1)}%</div>
                          <ul className="space-y-1">
                            {Object.entries(AXIS_INFO).map(([axis, info]) => (
                              <li key={axis}>
                                {info.label}: {(score[axis as keyof typeof AXIS_INFO] * 100).toFixed(1)}% × {Math.round(info.weight * 100)}% = {(score.contributions[axis as keyof typeof AXIS_INFO] * 100).toFixed(1)}% – {info.desc}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                    {scroll.weakSpots.length > 0 && (
                      <div className="rounded-2xl bg-rose-900/40 border border-rose-500/30 p-3 text-xs">
                        <div className="font-semibold text-sm">Weak Spots</div>
                        <p className="mt-1">{scroll.weakSpots.join(", ")}</p>
                      </div>
                    )}
                    {scroll.missedFuse && (
                      <div className="rounded-2xl bg-amber-900/40 border border-amber-500/30 p-3 text-xs">
                        <div className="font-semibold text-sm">Missed Fuse</div>
                        <p className="mt-1">{scroll.missedFuse}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--muted)]">The Magister has not yet offered a scroll. Call for judgment when ready.</p>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function parseMarkdown(content: string): string {
  const html = marked.parse(content, { async: false }) as string;
  return sanitizeMarkdown(html);
}
