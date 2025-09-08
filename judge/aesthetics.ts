import { Bead } from "@gbg/types";

/** Compute an aesthetics score [0,1] for a set of text beads. */
export function evaluateAesthetics(beads: Bead[]): number {
  const textBeads = beads.filter((b) => b.modality === "text");
  if (textBeads.length === 0) return 0.2; // minimal baseline

  const sentenceLengths: number[] = [];
  let formattingBoost = 0;

  for (const bead of textBeads) {
    const sentences = bead.content
      .split(/[.!?]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const s of sentences) {
      sentenceLengths.push(s.split(/\s+/).length);
    }
    if (/[*_`#>\[\]!]/.test(bead.content)) {
      formattingBoost += 1;
    }
  }

  const mean = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
  const variance =
    sentenceLengths.reduce((sum, l) => sum + Math.pow(l - mean, 2), 0) /
    sentenceLengths.length;
  // Map variance to [0,1] where more variation increases the score but saturates.
  const varianceScore = Math.atan(variance) / (Math.PI / 2);

  const formattingScore = formattingBoost / textBeads.length; // 0..1

  return 0.7 * varianceScore + 0.3 * formattingScore;
}
