/** Common live-chess time controls. Time categories follow Chess.com's 40-move estimate. */
export const CLOCK_PRESETS = Object.freeze([
  { value: 'untimed', label: 'Không giới hạn', category: 'casual', baseSeconds: 0, incrementSeconds: 0 },
  { value: '0.25+0', label: 'UltraBullet · 0:15+0', category: 'bullet', baseSeconds: 15, incrementSeconds: 0 },
  { value: '0.5+0', label: 'HyperBullet · 0:30+0', category: 'bullet', baseSeconds: 30, incrementSeconds: 0 },
  { value: '1+0', label: 'Bullet · 1+0', category: 'bullet', baseSeconds: 60, incrementSeconds: 0 },
  { value: '1+1', label: 'Bullet · 1+1', category: 'bullet', baseSeconds: 60, incrementSeconds: 1 },
  { value: '2+0', label: 'Bullet · 2+0', category: 'bullet', baseSeconds: 120, incrementSeconds: 0 },
  { value: '2+1', label: 'Bullet · 2+1', category: 'bullet', baseSeconds: 120, incrementSeconds: 1 },
  { value: '3+0', label: 'Blitz · 3+0', category: 'blitz', baseSeconds: 180, incrementSeconds: 0 },
  { value: '3+1', label: 'Blitz · 3+1', category: 'blitz', baseSeconds: 180, incrementSeconds: 1 },
  { value: '3+2', label: 'Blitz · 3+2', category: 'blitz', baseSeconds: 180, incrementSeconds: 2 },
  { value: '5+0', label: 'Blitz · 5+0', category: 'blitz', baseSeconds: 300, incrementSeconds: 0 },
  { value: '5+3', label: 'Blitz · 5+3', category: 'blitz', baseSeconds: 300, incrementSeconds: 3 },
  { value: '5+5', label: 'Blitz · 5+5', category: 'blitz', baseSeconds: 300, incrementSeconds: 5 },
  { value: '6+0', label: 'Blitz · 6+0', category: 'blitz', baseSeconds: 360, incrementSeconds: 0 },
  { value: '10+0', label: 'Rapid · 10+0', category: 'rapid', baseSeconds: 600, incrementSeconds: 0 },
  { value: '10+5', label: 'Rapid · 10+5', category: 'rapid', baseSeconds: 600, incrementSeconds: 5 },
  { value: '15+0', label: 'Rapid · 15+0', category: 'rapid', baseSeconds: 900, incrementSeconds: 0 },
  { value: '15+10', label: 'Rapid · 15+10', category: 'rapid', baseSeconds: 900, incrementSeconds: 10 },
  { value: '20+0', label: 'Rapid · 20+0', category: 'rapid', baseSeconds: 1200, incrementSeconds: 0 },
  { value: '25+5', label: 'Rapid · 25+5', category: 'rapid', baseSeconds: 1500, incrementSeconds: 5 },
  { value: '30+0', label: 'Rapid · 30+0', category: 'rapid', baseSeconds: 1800, incrementSeconds: 0 }
]);

// Correspondence controls are intentionally online-only; local games keep short clocks.
export const ONLINE_DAILY_CLOCK_PRESETS = Object.freeze([
  { value: '1d', label: 'Cờ ngày · 1 ngày mỗi lượt', category: 'daily', baseSeconds: 86400, incrementSeconds: 0 },
  { value: '2d', label: 'Cờ ngày · 2 ngày mỗi lượt', category: 'daily', baseSeconds: 172800, incrementSeconds: 0 }
]);
export const RANKED_CLOCK_PRESETS = Object.freeze([
  ...CLOCK_PRESETS.filter(preset => preset.value !== 'untimed'),
  ...ONLINE_DAILY_CLOCK_PRESETS
]);

export function classifyTimeControl(value) {
  const preset = [...CLOCK_PRESETS, ...ONLINE_DAILY_CLOCK_PRESETS].find(item => item.value === value) || CLOCK_PRESETS.find(item => item.value === '10+0');
  if (preset.value === 'untimed') return 'casual';
  if (preset.category === 'daily') return 'daily';
  const estimatedSeconds = preset.baseSeconds + preset.incrementSeconds * 40;
  if (estimatedSeconds < 180) return 'bullet';
  if (estimatedSeconds < 600) return 'blitz';
  return 'rapid';
}

export function parseClockPreset(value = '10+0') {
  const preset = [...CLOCK_PRESETS, ...ONLINE_DAILY_CLOCK_PRESETS].find(item => item.value === value) || CLOCK_PRESETS.find(item => item.value === '10+0');
  return {
    preset: preset.value,
    category: classifyTimeControl(preset.value),
    enabled: preset.value !== 'untimed',
    baseMs: preset.baseSeconds * 1000,
    incrementMs: preset.incrementSeconds * 1000
  };
}

export function formatClockTime(milliseconds, enabled = true) {
  if (!enabled) return '∞';
  const remaining = Math.max(0, Number(milliseconds) || 0);
  if (remaining < 10_000) return `${(Math.floor(remaining / 100) / 10).toFixed(1)}`;
  const seconds = Math.ceil(remaining / 1000);
  if (seconds >= 86400) { const days = Math.floor(seconds / 86400); const rest = seconds % 86400; return `${days}d ${String(Math.floor(rest / 3600)).padStart(2, '0')}:${String(Math.floor((rest % 3600) / 60)).padStart(2, '0')}`; }
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

/** Calculate one monotonic clock tick without mutating shared state. */
export function consumeClockTick(state, side, now) {
  if (!state || !state.enabled || !state.running || !['w', 'b'].includes(side)) {
    return { valid: false, elapsedMs: 0, remainingMs: null, flagged: false };
  }
  const currentTime = Number(now);
  const lastTickAt = Number(state.lastTickAt);
  const rawRemaining = Number(state.remaining?.[side]);
  const elapsedMs = Number.isFinite(currentTime) && Number.isFinite(lastTickAt)
    ? Math.max(0, currentTime - lastTickAt)
    : 0;
  // A corrupt remaining value fails safe to zero instead of propagating NaN.
  const remainingBefore = Number.isFinite(rawRemaining) ? Math.max(0, rawRemaining) : 0;
  const remainingMs = Math.max(0, remainingBefore - elapsedMs);
  return { valid: true, elapsedMs, remainingMs, flagged: remainingMs <= 0 };
}
