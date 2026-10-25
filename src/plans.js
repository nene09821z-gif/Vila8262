/**
 * Plans and entitlements (v3.56). Pure functions, shared by the app and the Node server.
 *
 *  - free    : may run the full-game review ONCE (that one game stays viewable afterwards)
 *  - pro     : full review access for 365 days from the grant; renewing while active stacks the time
 *  - premium : full review access for life
 *
 * An entitlement is plain JSON: { plan, proExpiresAt, premium, freeReviewsUsed, freeReviewGameId }.
 * Money never changes engine strength or Elo (see docs/guides/MONETIZATION.md); plans only unlock review/analysis access.
 */
export const DAY_MS = 24 * 60 * 60 * 1000;
export const PRO_DURATION_DAYS = 365;
/** A manually confirmed Pro trial is intentionally short and server-timed. */
export const PRO_TRIAL_DURATION_MS = 3 * 60 * 60 * 1000;
/** One-time code trials: Pro lasts five days; Premium preview lasts one minute. */
export const PRO_CODE_TRIAL_DURATION_MS = 5 * DAY_MS;
export const PREMIUM_CODE_TRIAL_DURATION_MS = 60 * 1000;
export const FREE_REVIEW_LIMIT = 1;
/** Free accounts may open this many puzzles in total; Pro and Premium are unlimited. */
export const FREE_PUZZLE_LIMIT = 3;

/** Pure puzzle quota check. `used` is how many puzzles the free player has already opened. */
export function puzzleAccess(entitlement, used = 0, now = Date.now()) {
  const plan = effectivePlan(entitlement, now);
  if (plan === 'premium' || plan === 'pro') return { allowed: true, plan, unlimited: true, remaining: null };
  const remaining = Math.max(0, FREE_PUZZLE_LIMIT - Math.max(0, Math.floor(Number(used) || 0)));
  return { allowed: remaining > 0, plan, unlimited: false, remaining };
}

export const PLAN_CATALOG = Object.freeze({
  free: Object.freeze({ id: 'free', name: 'Miễn phí', tagline: 'Xem lại phân tích 1 lần', perks: ['1 lần phân tích toàn ván (ván đó xem lại được mãi)', 'Câu đố: 3 câu miễn phí', 'Chơi cờ và bài học không giới hạn'] }),
  pro: Object.freeze({ id: 'pro', name: 'Pro', tagline: 'Dùng thử Pro 3 giờ · xác nhận qua admin', durationDays: PRO_DURATION_DAYS, perks: ['Yêu cầu Pro dùng thử 3 giờ với mức 1.000đ', 'Chỉ cấp quyền sau khi admin xác nhận đã nhận thanh toán', 'Mọi mức chất lượng phân tích trong thời hạn đang có', 'Câu đố không giới hạn', 'Gói Pro dài hạn đã mua/xác minh trước đây vẫn giữ nguyên hiệu lực'] }),
  premium: Object.freeze({ id: 'premium', name: 'Premium', tagline: 'Hiện không bán trực tiếp · liên hệ admin', lifetime: true, perks: ['Gửi đề nghị trao đổi mức 1.000đ–100.000đ tới admin', 'Câu đố không giới hạn', 'Không phải thanh toán và không tự kích hoạt Premium', 'Quyền Premium đã được cấp/xác minh từ trước vẫn giữ nguyên', 'Admin phản hồi trong Messenger của ứng dụng'] })
});

const toMs = value => {
  if (value == null || value === '') return null;
  const ms = typeof value === 'number' ? value : Date.parse(String(value));
  return Number.isFinite(ms) && ms > 0 ? ms : null;
};

export function normalizeEntitlement(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    premium: src.premium === true || src.plan === 'premium',
    // A missing expiry means legacy/permanent Premium. Temporary Premium uses an explicit server expiry.
    premiumExpiresAt: toMs(src.premiumExpiresAt),
    proExpiresAt: toMs(src.proExpiresAt),
    freeReviewsUsed: Math.max(0, Math.min(1000, Math.floor(Number(src.freeReviewsUsed) || 0))),
    freeReviewGameId: typeof src.freeReviewGameId === 'string' ? src.freeReviewGameId.slice(0, 120) : ''
  };
}

/** Plan in force right now: premium > active pro > free. An expired Pro silently becomes free. */
export function effectivePlan(entitlement, now = Date.now()) {
  const ent = normalizeEntitlement(entitlement);
  if (ent.premium && (ent.premiumExpiresAt == null || ent.premiumExpiresAt > now)) return 'premium';
  if (ent.proExpiresAt != null && ent.proExpiresAt > now) return 'pro';
  return 'free';
}

/**
 * May this player start (or re-open) a full-game review?
 * `gameId` lets the one free review stay viewable for the same game.
 */
export function reviewAccess(entitlement, gameId = '', now = Date.now()) {
  const ent = normalizeEntitlement(entitlement);
  const plan = effectivePlan(ent, now);
  if (plan === 'premium' || plan === 'pro') return { allowed: true, plan, reason: plan, consumesFree: false, remainingFree: null };
  const remainingFree = Math.max(0, FREE_REVIEW_LIMIT - ent.freeReviewsUsed);
  if (gameId && ent.freeReviewGameId && ent.freeReviewGameId === String(gameId)) {
    return { allowed: true, plan, reason: 'free-same-game', consumesFree: false, remainingFree };
  }
  if (remainingFree > 0) return { allowed: true, plan, reason: 'free-trial', consumesFree: true, remainingFree };
  return { allowed: false, plan, reason: 'limit', consumesFree: false, remainingFree: 0 };
}

/** Record the use of the free review (idempotent per game). Returns a new entitlement. */
export function consumeFreeReview(entitlement, gameId = '') {
  const ent = normalizeEntitlement(entitlement);
  if (gameId && ent.freeReviewGameId === String(gameId)) return ent;
  return { ...ent, freeReviewsUsed: Math.min(FREE_REVIEW_LIMIT, ent.freeReviewsUsed + 1), freeReviewGameId: String(gameId || ent.freeReviewGameId || '') };
}

/** Grant a short Pro trial after an authenticated admin confirms the payment. */
export function grantProTrial(entitlement, now = Date.now()) {
  const ent = normalizeEntitlement(entitlement);
  if (ent.premium && ent.premiumExpiresAt == null) return ent;
  const base = ent.proExpiresAt != null && ent.proExpiresAt > now ? ent.proExpiresAt : now;
  return { ...ent, proExpiresAt: base + PRO_TRIAL_DURATION_MS };
}

/** Grant a server-verified five-day Pro code trial; active Pro time stacks. */
export function grantProCodeTrial(entitlement, now = Date.now()) {
  const ent = normalizeEntitlement(entitlement);
  if (ent.premium && ent.premiumExpiresAt == null) return ent; // Never overwrite permanent Premium.
  const base = ent.proExpiresAt != null && ent.proExpiresAt > now ? ent.proExpiresAt : now;
  return { ...ent, proExpiresAt: base + PRO_CODE_TRIAL_DURATION_MS };
}

/** Grant a minute-long Premium preview; it cannot downgrade permanent Premium. */
export function grantPremiumCodeTrial(entitlement, now = Date.now()) {
  const ent = normalizeEntitlement(entitlement);
  if (ent.premium && ent.premiumExpiresAt == null) return ent;
  return { ...ent, premium: true, premiumExpiresAt: now + PREMIUM_CODE_TRIAL_DURATION_MS };
}

/** Grant a plan. Premium is permanent and is never downgraded by a later Pro grant. Returns a new entitlement. */
export function grantPlan(entitlement, planId, now = Date.now()) {
  const ent = normalizeEntitlement(entitlement);
  if (planId === 'premium') return { ...ent, premium: true, premiumExpiresAt: null };
  if (planId === 'pro') {
    const base = ent.proExpiresAt != null && ent.proExpiresAt > now ? ent.proExpiresAt : now;
    return { ...ent, proExpiresAt: base + PRO_DURATION_DAYS * DAY_MS };
  }
  throw new Error('Gói không hợp lệ: chỉ có "pro" hoặc "premium".');
}

/** Revoke paid access (refund / chargeback). Free-review usage is kept so it cannot be replayed. */
export function revokePlan(entitlement, planId) {
  const ent = normalizeEntitlement(entitlement);
  if (planId === 'premium') return { ...ent, premium: false, premiumExpiresAt: null };
  if (planId === 'pro') return { ...ent, proExpiresAt: null };
  if (planId === 'all') return { ...ent, premium: false, premiumExpiresAt: null, proExpiresAt: null };
  throw new Error('Gói không hợp lệ.');
}

/**
 * Undo ONE paid purchase after a refund/chargeback. Pro removes the 365 days that purchase added (other paid years
 * stay); Premium switches off. Free-review usage is kept so it cannot be replayed.
 */
export function refundPurchase(entitlement, planId, now = Date.now()) {
  const ent = normalizeEntitlement(entitlement);
  if (planId === 'premium') return { ...ent, premium: false };
  if (planId === 'pro') {
    if (ent.proExpiresAt == null) return ent;
    const next = ent.proExpiresAt - PRO_DURATION_DAYS * DAY_MS;
    return { ...ent, proExpiresAt: next > now ? next : null };
  }
  throw new Error('Gói không hợp lệ.');
}

export function daysLeft(entitlement, now = Date.now()) {
  const ent = normalizeEntitlement(entitlement);
  if (ent.proExpiresAt == null || ent.proExpiresAt <= now) return 0;
  return Math.ceil((ent.proExpiresAt - now) / DAY_MS);
}

export function planStatusLabel(entitlement, now = Date.now()) {
  const plan = effectivePlan(entitlement, now);
  if (plan === 'premium') {
    const ent = normalizeEntitlement(entitlement);
    if (ent.premiumExpiresAt != null) {
      const remaining = Math.max(0, ent.premiumExpiresAt - now);
      const seconds = Math.max(1, Math.ceil(remaining / 1000));
      return `Premium dùng thử · còn ${seconds > 60 ? `${Math.ceil(seconds / 60)} phút` : `${seconds} giây`}`;
    }
    return 'Premium · trọn đời';
  }
  if (plan === 'pro') {
    const ent = normalizeEntitlement(entitlement);
    const remaining = Math.max(0, (ent.proExpiresAt || 0) - now);
    if (remaining < DAY_MS) {
      const hours = Math.floor(remaining / (60 * 60 * 1000));
      const minutes = Math.max(1, Math.ceil((remaining % (60 * 60 * 1000)) / 60_000));
      return `Pro · còn ${hours ? `${hours} giờ ` : ''}${minutes} phút`;
    }
    return `Pro · còn ${daysLeft(entitlement, now)} ngày`;
  }
  const access = reviewAccess(entitlement, '', now);
  return access.remainingFree > 0 ? 'Miễn phí · còn 1 lần phân tích' : 'Miễn phí · đã dùng lượt phân tích';
}

/** Server-safe projection for API responses. */
export function entitlementForClient(entitlement, now = Date.now()) {
  const ent = normalizeEntitlement(entitlement);
  return { ...ent, plan: effectivePlan(ent, now), daysLeft: daysLeft(ent, now), label: planStatusLabel(ent, now) };
}
