export function score({ beadCount }: { beadCount: number }): number {
  return 0.4 + 0.1 * Math.tanh(beadCount / 4);
}
