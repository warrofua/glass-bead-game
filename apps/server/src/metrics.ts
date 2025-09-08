export const metrics = {
  moveCount: 0,
  wsFailures: 0,
  totalLatencyMs: 0
};

export function recordMove(latencyMs: number) {
  metrics.moveCount++;
  metrics.totalLatencyMs += latencyMs;
}

export function recordWsFailure() {
  metrics.wsFailures++;
}

export function getMetrics() {
  return { ...metrics };
}
