declare module "../../judge/novelty" {
  import type { GameState } from "@gbg/types";
  export function scoreNovelty(state: GameState): Record<string, number>;
}
