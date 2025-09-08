# Product Requirements Document (PRD)

**Product:** The Glass Bead Game (Two‑Player, AI‑Judged, Online)

**Doc Owner:** JF
**Version:** 1.0 (MVP Sprint 1 scope + Beta preview)
**Last Updated:** 2025-09-08

---

## 1. Purpose & Narrative

A competitive, collaborative game of idea‑weaving. Two players place **beads** (atomic, multi‑modal contributions) and connect them with labeled **strings** (relations) on a living graph. An **AI Magister Ludi** evaluates the whole composition, scoring who elevated coherence, novelty, integrity, aesthetics, and resilience. The goal is to make a new class of game—part debate, part composition studio, part knowledge sport—only possible in the AI era.

**Why now:** AI can transmute modalities on the fly (text↔audio↔image↔math↔code↔data), enforce semantic rules, and transparently judge multi‑criteria quality.

---

## 2. Objectives & Success Metrics (MVP → Beta)

**Primary Objectives (MVP):**

1. Deliver a playable core loop with two players in real time (create/join match, cast, bind, judge).
2. Provide visible, deterministic **Judge Scroll** outcomes with axis scores and an explainer.
3. Persist a **Match Log** and enable replay of the weave (local file for MVP).

**Success Metrics (MVP):**

* **M1:** ≥80% of test matches complete a full loop (Seeds→Cast/Bind→Judge) without errors.
* **M2:** Avg. time to first move < **60s** after match creation; move roundtrip latency (submit→render) < **200ms** local.
* **M3:** Player‑perceived fairness ≥ **4.0/5** (pilot survey); judge reproducibility difference ≤ **±2 pts** total score with same seed/state.

**Secondary Objectives (Beta):**

* Add **Twists/Constraints**, **Counterpoint**, **Prune/Restraint**, **Concordance (Cathedral)**, and a basic ladder.
* Introduce path‑embedding **Resonance**, **NLI‑based Integrity**, and **novelty** scoring.
* Shareable gallery replays with exportable Judgment Scroll PDF.

**Success Metrics (Beta):**

* **B1:** ≥30% of matches use ≥3 different modalities.
* **B2:** Avg. path length of scored strongest path ≥ **3** nodes.
* **B3:** Judge agreement (human panel vs AI) ≥ **0.7** Spearman across totals.

---

## 3. Scope

**In (MVP Sprint 1):**

* Match creation/joining, two simultaneous players, live state sync.
* Seeds (AI‑provided text seeds from disjoint domains, stubbed list ok).
* **Cast** (text beads) & **Bind** (analogy edges with 2‑sentence justification).
* Stub **Magister Ludi** judging across axes (deterministic), Judgment Scroll dialog.
* Basic list‑based weave view (beads & strings lists), not yet force‑graph.
* In‑memory persistence; export JSON Match Log.

**Out (MVP):** account system, full moderation pipeline, ladder, gallery, force‑graph canvas, non‑text modalities, constraints deck, Concordance composer, production DB.

---

## 4. Users & Personas

* **Composer (Player):** Curious generalist or domain expert; wants expressive moves, fair judging, fast feedback.
* **Spectator (Later):** Observes weave & Judge Scroll; may learn from strong paths.
* **Magister (System):** AI pipeline that enforces semantics & evaluates quality.

**Key UX promises:**

* Explainability (why I won/lost), speed (low friction to play), and creative range (modalities).

---

## 5. User Stories (MVP → Beta)

* **US‑01 (Join):** As a player, I can create a match and share an ID so another can join.
* **US‑02 (Cast):** I can cast a bead with a title and text content linked to a seed.
* **US‑03 (Bind):** I can bind two beads with a labeled relation and 2‑sentence justification.
* **US‑04 (Judge):** I can request judgment and see a winner, per‑axis scores, and an explainer.
* **US‑05 (Resilience basic):** If I refresh, the current in‑memory state is re‑broadcast to me via WS.
* **US‑06 (Export):** I can download a JSON Match Log of beads, edges, moves, and the Judgment Scroll.
* **US‑07 (Seeds):** I can view the 3 seeds and attach casts to them.

**Beta stories (preview):**

* **US‑10 (Twist):** I see a global constraint (e.g., inversion only) and my move validator enforces it.
* **US‑11 (Counterpoint):** I can mirror/subvert an opponent bead in a different modality.
* **US‑12 (Concordance):** We co‑author a final Cathedral node with references.
* **US‑13 (Force‑Graph):** I can manipulate a spatial graph of beads and strings.

---

## 6. Functional Requirements (numbered)

**Match & Realtime**

* **GBG‑REQ‑001:** System SHALL allow creation of a match via `POST /match`, returning `GameState`.
* **GBG‑REQ‑002:** System SHALL allow second player to join via `POST /match/:id/join` with handle; reject >2 players.
* **GBG‑REQ‑003:** System SHALL sync state via WS `state:update` within **150ms** local network median.

**Seeds & Casting**

* **GBG‑REQ‑010:** System SHALL provide 3 seeds per match (stub list acceptable in MVP).
* **GBG‑REQ‑011:** A **Cast** move SHALL create a `Bead` with `modality="text"`, `complexity ∈ [1..5]`, `seedId?`.
* **GBG‑REQ‑012:** Cast validation SHALL enforce non‑empty content and title length ≤ 80 chars (warning if missing).

**Binding**

* **GBG‑REQ‑020:** A **Bind** move SHALL create an `Edge` with `label="analogy"` (MVP), `justification` ≥ 2 sentences.
* **GBG‑REQ‑021:** Bind validation SHALL reject self‑edges and missing justifications.

**Judging**

* **GBG‑REQ‑030:** `POST /match/:id/judge` SHALL return a **Judgment Scroll** with axes (resonance, novelty, integrity, aesthetics, resilience) and a winner.
* **GBG‑REQ‑031:** Judge SHALL be deterministic under identical state (seeded RNG), diff ≤ ±2 points total.
* **GBG‑REQ‑032:** Judge Scroll SHALL be presented in‑app with per‑axis values and a summary string.

**Logging & Export**

* **GBG‑REQ‑040:** System SHALL record all moves with timestamps, durations, and validity flags in `GameState.moves`.
* **GBG‑REQ‑041:** System SHALL allow exporting a single JSON file containing `GameState` + `JudgmentScroll`.

**Errors & Validation**

* **GBG‑REQ‑050:** Invalid moves SHALL be rejected with a user‑visible reason and no state mutation.
* **GBG‑REQ‑051:** Server SHALL sanitize/limit payload sizes (bead content ≤ 10k chars MVP).

**Beta (deferred)**

* **GBG‑REQ‑060:** Add Twists with enforcement in validator.
* **GBG‑REQ‑061:** Add non‑text modalities and transmute/mirror moves.
* **GBG‑REQ‑062:** Add Concordance composer and final Cathedral node.

---

## 7. Non‑Functional Requirements

* **NFR‑Perf‑01:** Client action → visible update < **100ms** (optimistic UI) and server echo < **200ms** median local.
* **NFR‑Reliability‑01:** If WS disconnects, client SHALL auto‑reconnect and request latest state.
* **NFR‑A11y‑01:** MVP UI adheres to WCAG 2.1 AA color contrast; keyboard navigation for core actions.
* **NFR‑Sec‑01:** Sanitize HTML/markdown; no remote code execution; content length caps; CORS locked to dev origins.
* **NFR‑Obs‑01:** Console logs with move counts and basic latency metrics (MVP); structured telemetry in Beta.

---

## 8. System Design (MVP Alignment)

**Frontend:** Vite + React + Tailwind. Panels: Match Controls, Seeds, Weave lists (Beads/Strings), Judge dialog.
**Backend:** Fastify REST + WS broadcast; in‑memory `matches` map; basic judge stub.
**Contracts:** Types in `@gbg/types` (Modality, Bead, Edge, Move, GameState, JudgmentScroll).

**Realtime Events:**

* `state:update` {gameState} — on join, move accepted, or judge snapshot.
* `move:accepted` {move} — optimistic confirm.
* `end:judgment` {scroll} — final scores/winner.

---

## 9. AI Judge v0 (MVP) → v1 (Beta)

**v0 (MVP, implemented):** count‑based proxies for **Resonance**, **Aesthetics**, **Novelty**, **Integrity**, **Resilience**, weighted to total; deterministic given same state.
**v1 (Beta, planned):**

* **Resonance:** path embeddings over line‑graph of length ≤4; cycle bonus for non‑trivial loops.
* **Novelty:** shingle/LSH rarity vs baseline corpora.
* **Integrity:** label semantics checks + NLI contradiction detection.
* **Aesthetics:** per‑modality heuristics (text meter, audio motif, image composition, code complexity).
* **Resilience:** micro‑perturbations (edge flips/removals) and score drop sensitivity.

**Transparency:** Judgment Scroll must list top paths (why they scored), weak spots, missed fuse.

---

## 10. Game Rules (MVP subset)

* **Seeds:** 3 disjoint domain seeds are shown at match start.
* **Moves:**

  * **Cast (MVP):** text bead, complexity 1–5, linked to a seed.
  * **Bind (MVP):** analogy edge with 2‑sentence justification.
  * **Judge:** callable at any time; locks state for scoring snapshot.

**Anti‑spam:** shot clock (UI timer only in MVP), rudimentary redundancy warnings (Beta).

---

## 11. UX & UI Requirements

* **UX‑01:** Left panel: match controls (create/join), handle input, seeds list, action buttons.
* **UX‑02:** Main panel: bead list with owner, modality, parsed markdown preview; strings list with labels and justifications.
* **UX‑03:** Judgment modal/alert with winner + per‑axis scores (bar list); copy‑to‑clipboard JSON.
* **UX‑04 (Beta):** Force‑directed graph with labeled edges; Twist ticker; Cathedral composer.

---

## 12. Data Model (Authoritative Types)

Types are defined in `@gbg/types`. Key entities: `Player`, `Seed`, `Bead`, `Edge`, `Move`, `GameState`, `JudgmentScroll`.
Constraints: bead content ≤ 10k chars (MVP); justification ≥ 2 sentences for Bind.

---

## 13. API Spec (MVP)

* `POST /match` → `GameState`
* `POST /match/:id/join` { handle } → `Player`
* `GET /match/:id` → `GameState`
* `POST /match/:id/move` { Move } → `{ ok: true }` (server validates & applies minimal Cast/Bind)
* `POST /match/:id/judge` → `JudgmentScroll`

**WebSocket:** `ws://…/?matchId={id}` subscribes to `state:update`, `move:accepted`, `end:judgment`.

---

## 14. Telemetry (MVP → Beta)

* **MVP:** console metrics — move latency, moves per match, bead/edge counts.
* **Beta:** structured events (MatchCreated, PlayerJoined, MoveSubmitted, JudgeRequested), error codes, judge axis distributions, path lengths, average justification length.

---

## 15. Privacy, Safety, Licensing

* No PII required beyond handle.
* Sanitize markdown; block script tags; length caps.
* MVP assets are text only; later modalities require license policy & watermarking of AI‑generated content.
* Exported logs are local files (user’s machine) for MVP.

---

## 16. Rollout Plan

* **Sprint 1 (MVP Core):** Cast, Bind, Judge, Seeds, in‑memory matches, JSON export.
* **Sprint 2:** Constraints/Twists engine, validator rules, Concordance composer, basic graph canvas.
* **Sprint 3:** Judge v1 (embeddings + NLI + novelty), replays, exportable Scroll PDF.
* **Sprint 4:** Gallery, ladder, Duet/Boss mode, Blindfold variant.

---

## 17. Risks & Mitigations

* **R1 Judging trust:** Early heuristics feel arbitrary → *Mitigation:* deterministic scoring, transparent Scroll, side‑by‑side examples.
* **R2 Latency under real net:** Local dev fine; prod jitter → *Mitigation:* optimistic UI, diff‑based WS patches, rate limits.
* **R3 Content misuse:** Off‑topic or spammy text → *Mitigation:* caps, validator reasons, later moderation flags.

---

## 18. Acceptance Criteria (MVP)

* **AC‑01:** Two browsers can join the same match and see the same seeds and state.
* **AC‑02:** Player can cast ≥1 text bead; appears immediately for both.
* **AC‑03:** Player can bind two beads with a justification; appears for both.
* **AC‑04:** Requesting judgment yields a winner and axis scores; repeated calls on unchanged state return identical totals (±2).
* **AC‑05:** Exported JSON includes all beads, edges, moves, and the Judgment Scroll.
* **AC‑06:** Invalid move (e.g., missing justification) is rejected with a clear message.

---

## 19. Open Questions

* Should seeds be fully AI‑generated from a controlled taxonomy or curated lists?
* Where to host replays (IPFS vs centralized) once gallery is added?
* What’s the minimal set of relation labels we can meaningfully enforce in Beta?
* How do we score aesthetics for non‑text modalities without heavyweight models?

---

## 20. Glossary

* **Bead:** Atomic content node (text in MVP).
* **String:** Labeled relation (analogy in MVP).
* **Cathedral:** Final synthesis node (Beta).
* **Magister Ludi:** AI judge with rubric, scores, and explainer.
* **Twist/Constraint:** Temporary global rule affecting allowed moves (Beta).

---

## 21. Appendix — Mapping to Code (Starter Repo)

* **/apps/server** → Fastify REST + WS, in‑memory `matches`, endpoints in §13, judge stub in `src/index.ts`.
* **/apps/web** → Vite React UI implementing §11 flows; Actions: Create/Join, Cast, Bind, Judge.
* **/packages/types** → Typed contracts mirroring §12 entities.

> This PRD captures MVP requirements aligned to the existing starter repo, plus a credible path to Beta without architectural rewrites. Update version when adding Constraints, Concordance, and Judge v1.
