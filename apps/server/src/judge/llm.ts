import { GameState, JudgmentScroll } from '@gbg/types';
import { Ollama } from 'ollama';
import judge from './index.js';

/**
 * Use a local Ollama model to select the winning player.
 * Falls back to the deterministic judge if the model fails.
 */
export async function judgeWithLLM(state: GameState): Promise<JudgmentScroll> {
  const baseline = judge(state);
  const model = process.env.LLM_MODEL || 'qwen7b:latest';
  const client = new Ollama();

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
    const stream = await client.generate({ model, prompt, stream: true });
    for await (const part of stream) {
      output += part.response;
    }
    const parsed = JSON.parse(output);
    if (typeof parsed.winner === 'string' && baseline.scores[parsed.winner]) {
      baseline.winner = parsed.winner.trim();
    }
  } catch (err) {
    console.warn('LLM judge failed', err);
  }

  return baseline;
}

export default judgeWithLLM;
