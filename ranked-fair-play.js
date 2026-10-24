/**
 * Server-side fair-play telemetry for ranked games.
 * These are manual review signals, not a cheating verdict. Client timing and engine
 * claims are never trusted; callers must supply duration/position complexity
 * measured by the authoritative server.
 */
const MAX_RECENT_TURNS = 12;
const ULTRA_FAST_MS = 90;
const COMPLEX_FAST_MS = 250;
const COMPLEX_POSITION_LEGAL_MOVES = 24;

function finiteNonNegative(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : fallback;
}

export function createRankedFairPlayState() {
  return {
    signals: 0,
    ultraFastMoves: 0,
    ultraFastStreak: 0,
    level: 'clear',
    recentTurns: [],
    lastComplexSignalPly: -1000,
    metrics: { movesObserved: 0, fastComplexMoves: 0, medianTurnMs: null }
  };
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

/** Mutates `state` and returns events to persist/audit. */
export function assessRankedFairPlayMove(state, {
  userId = '',
  turnDurationMs,
  legalMoveCount,
  ply,
  now = Date.now()
} = {}) {
  const result = state && typeof state === 'object' ? state : createRankedFairPlayState();
  result.signals = finiteNonNegative(result.signals);
  result.ultraFastMoves = finiteNonNegative(result.ultraFastMoves);
  result.ultraFastStreak = finiteNonNegative(result.ultraFastStreak);
  result.recentTurns = Array.isArray(result.recentTurns) ? result.recentTurns : [];
  result.lastComplexSignalPly = Number.isFinite(Number(result.lastComplexSignalPly)) ? Number(result.lastComplexSignalPly) : -1000;

  const duration = finiteNonNegative(turnDurationMs);
  const branching = Math.floor(finiteNonNegative(legalMoveCount));
  const currentPly = Math.floor(finiteNonNegative(ply));
  const timestamp = new Date(Number.isFinite(Number(now)) ? Number(now) : Date.now()).toISOString();
  const sample = { durationMs: duration, legalMoveCount: branching, ply: currentPly, at: timestamp };
  result.recentTurns.push(sample);
  if (result.recentTurns.length > MAX_RECENT_TURNS) result.recentTurns = result.recentTurns.slice(-MAX_RECENT_TURNS);

  if (duration < ULTRA_FAST_MS) {
    result.ultraFastMoves += 1;
    result.ultraFastStreak += 1;
  } else {
    result.ultraFastStreak = 0;
  }

  const events = [];
  const recordEvent = (type, severity, detail) => {
    result.signals += 1;
    events.push({ userId, type, severity, turnDurationMs: duration, legalMoveCount: branching, at: timestamp, ply: currentPly, detail });
  };

  // A continuous sequence of extremely short server-observed turns is stronger
  // than a single fast move; emit only at each 4-turn threshold to avoid spam.
  if (result.ultraFastStreak >= 4 && result.ultraFastStreak % 4 === 0) {
    recordEvent('repeated_ultra_fast_moves', result.ultraFastStreak >= 8 ? 'priority_review' : 'review',
      `${result.ultraFastStreak} consecutive own turns under ${ULTRA_FAST_MS} ms`);
  }

  // Multiple sub-250ms moves in positions with many legal replies are another
  // low-confidence signal. Require recurrence and a cooldown, never auto-ban.
  const recentComplexFast = result.recentTurns.filter(turn =>
    finiteNonNegative(turn.durationMs) < COMPLEX_FAST_MS &&
    finiteNonNegative(turn.legalMoveCount) >= COMPLEX_POSITION_LEGAL_MOVES
  ).length;
  if (recentComplexFast >= 3 && currentPly - result.lastComplexSignalPly >= 12) {
    result.lastComplexSignalPly = currentPly;
    recordEvent('fast_moves_in_complex_positions', 'review',
      `${recentComplexFast} of the last ${result.recentTurns.length} own turns were under ${COMPLEX_FAST_MS} ms with ${COMPLEX_POSITION_LEGAL_MOVES}+ legal moves`);
  }

  const timings = result.recentTurns.map(turn => finiteNonNegative(turn.durationMs));
  result.metrics = {
    movesObserved: (Number(result.metrics?.movesObserved) || 0) + 1,
    fastComplexMoves: recentComplexFast,
    medianTurnMs: median(timings),
    recentTurnCount: result.recentTurns.length
  };
  result.level = result.signals >= 3 ? 'priority_review' : result.signals > 0 ? 'review' : 'clear';
  return { state: result, events };
}
