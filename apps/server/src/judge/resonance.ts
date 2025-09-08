export function score({ beadCount, edgeCount }: { beadCount: number; edgeCount: number }): number {
  return Math.min(1, (edgeCount / Math.max(1, beadCount)) * 0.6 + 0.2);
}
