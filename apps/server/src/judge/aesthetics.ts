export function score({ beadCount }: { beadCount: number }): number {
  return Math.min(1, beadCount > 0 ? 0.3 + 0.05 * beadCount : 0.2);
}
