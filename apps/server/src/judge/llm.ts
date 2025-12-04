import { GameState, JudgmentScroll } from '@gbg/types';
import { getLlama, LlamaChatSession } from 'node-llama-cpp';
import judge, { composeClosingReflection } from './index.js';

interface LLMClient {
  prompt(text: string): Promise<string>;
}

/**
 * llama.cpp-based client wrapper
 */
export class LlamaCppClient implements LLMClient {
  private session: LlamaChatSession | null = null;
  private modelPath: string;

  constructor(modelPath?: string) {
    this.modelPath = modelPath || process.env.LLM_MODEL_PATH || '';
  }

  async initialize() {
    if (!this.modelPath) {
      throw new Error('LLM_MODEL_PATH environment variable must be set to the path of your GGUF model file');
    }
    const llama = await getLlama();
    const model = await llama.loadModel({ modelPath: this.modelPath });
    const context = await model.createContext();
    this.session = new LlamaChatSession({ contextSequence: context.getSequence() });
  }

  async prompt(text: string): Promise<string> {
    if (!this.session) {
      await this.initialize();
    }
    if (!this.session) {
      throw new Error('Failed to initialize LlamaCpp session');
    }
    return await this.session.prompt(text);
  }
}

/**
 * Use a local llama.cpp model to select the winning player.
 * Falls back to the deterministic judge if the model fails.
 */
export async function judgeWithLLM(
  state: GameState,
  client?: LLMClient,
): Promise<JudgmentScroll> {
  const baseline = judge(state);

  try {
    const llmClient = client || new LlamaCppClient();

    const summary = state.players.map(p => {
      const beads = Object.values(state.beads).filter(b => b.ownerId === p.id).length;
      const edges = Object.values(state.edges).filter(e => {
        const owns = state.beads[e.from]?.ownerId === p.id || state.beads[e.to]?.ownerId === p.id;
        return owns;
      }).length;
      return `${p.id}: beads=${beads} edges=${edges}`;
    }).join('\n');

    const promptText = `You are the Magister Ludi judging a Glass Bead Game.\n` +
      `Decide which player is winning based on their contributions.\n` +
      `${summary}\n` +
      `Respond ONLY with JSON {"winner":"<playerId>"}`;

    const output = await llmClient.prompt(promptText);

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
