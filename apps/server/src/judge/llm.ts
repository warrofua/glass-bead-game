import { GameState, JudgmentScroll } from '@gbg/types';
import { Ollama } from 'ollama';
import judge, { composeClosingReflection } from './index.js';

interface LLMClient {
  generate(model: string, prompt: string): AsyncIterable<string>;
}

/**
 * Use a local Ollama model to select the winning player.
 * Falls back to the deterministic judge if the model fails.
 */
export async function judgeWithLLM(
  state: GameState,
  client: LLMClient = new Ollama(),
): Promise<JudgmentScroll> {
  const baseline = judge(state);
  const model = process.env.LLM_MODEL || 'qwen7b:latest';

  try {
    const summary = state.players.map(p => {
      const beads = Object.values(state.beads).filter(b => b.ownerId === p.id).length;
      const edges = Object.values(state.edges).filter(e => {
        const owns = state.beads[e.from]?.ownerId === p.id || state.beads[e.to]?.ownerId === p.id;
        return owns;
      }).length;
      return `${p.id}: beads=${beads} edges=${edges}`;
    }).join('\n');

    const prompt = `You are the Magister Ludi judging a Glass Bead Game.\n` +
      `Decide which player is winning based on their contributions.\n` +
      `${summary}\n` +
      `Respond ONLY with JSON {"winner":"<playerId>"}`;

    let output = '';
    for await (const part of client.generate(model, prompt)) {
      output += part;
    }
    const parsed = JSON.parse(output);
    if (typeof parsed.winner === 'string') {
      const chosenWinner = parsed.winner.trim();
      if (chosenWinner && baseline.scores[chosenWinner]) {
        baseline.winner = chosenWinner;
        if (baseline.summary) {
          baseline.summary = { ...baseline.summary, leadingPlayer: chosenWinner };
        }
        const closingIndex = baseline.dialogue.turns.length - 1;
        const closingTurn = baseline.dialogue.turns[closingIndex];
        if (closingTurn?.kind === 'closing') {
          baseline.dialogue.turns[closingIndex] = {
            ...closingTurn,
            reflection: composeClosingReflection(state, chosenWinner),
          };
        }
      }
    }
  } catch (err) {
    console.warn('LLM judge failed', err);
  }

  return baseline;
}

export default judgeWithLLM;
