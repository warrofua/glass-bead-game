# Architecture Notes

## Resonance Path Analysis

The **Magister Ludi** judge scores resonance by inspecting the game graph.
Each bead becomes a node weighted by its complexity and each bind becomes a
unit‑weight edge. Using this graph we compute the top weighted paths:

1. `findStrongestPaths` explores all simple paths and sums node and edge weights.
2. The three heaviest paths are kept as `strongPaths` for the `JudgmentScroll`.
3. Resonance is proportional to the strongest path weight (clamped to 0‑1).

This simple heuristic highlights long, coherent chains of ideas while remaining
deterministic and easy to explain.
