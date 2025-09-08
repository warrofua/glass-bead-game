export function score({ edgeCount }: { edgeCount: number }): number {
  return 0.5 + 0.1 * Math.tanh(edgeCount / 5);
}
