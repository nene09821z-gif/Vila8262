// TỆP TỰ SINH từ cloudflare/src/index.js bằng `npm run bundle` — đừng sửa tay, hãy sửa nguồn rồi chạy lại.

// src/index.js
import { Chess } from "chess.js";

// ../src/plans.js
var DAY_MS = 24 * 60 * 60 * 1e3;
var PRO_DURATION_DAYS = 365;
var DIAMOND_DURATION_DAYS = 365;
var DIAMOND_PRICE_VND = 99e3;
var PAID_PLANS = Object.freeze(["diamond", "premium", "pro"]);
var PRO_TRIAL_DURATION_MS = 3 * 60 * 60 * 1e3;
var PRO_CODE_TRIAL_DURATION_MS = 5 * DAY_MS;
var PREMIUM_CODE_TRIAL_DURATION_MS = 60 * 1e3;
var FREE_REVIEW_LIMIT = 1;
var PLAN_CATALOG = Object.freeze({
  free: Object.freeze({ id: "free", name: "Mi\u1EC5n ph\xED", tagline: "Xem l\u1EA1i ph\xE2n t\xEDch 1 l\u1EA7n", perks: ["1 l\u1EA7n ph\xE2n t\xEDch to\xE0n v\xE1n (v\xE1n \u0111\xF3 xem l\u1EA1i \u0111\u01B0\u1EE3c m\xE3i)", "C\xE2u \u0111\u1ED1: 3 c\xE2u mi\u1EC5n ph\xED", "Ch\u01A1i c\u1EDD v\xE0 b\xE0i h\u1ECDc kh\xF4ng gi\u1EDBi h\u1EA1n"] }),
  pro: Object.freeze({ id: "pro", name: "Pro", tagline: "D\xF9ng th\u1EED Pro 3 gi\u1EDD \xB7 x\xE1c nh\u1EADn qua admin", durationDays: PRO_DURATION_DAYS, perks: ["Y\xEAu c\u1EA7u Pro d\xF9ng th\u1EED 3 gi\u1EDD v\u1EDBi m\u1EE9c 1.000\u0111", "Ch\u1EC9 c\u1EA5p quy\u1EC1n sau khi admin x\xE1c nh\u1EADn \u0111\xE3 nh\u1EADn thanh to\xE1n", "M\u1ECDi m\u1EE9c ch\u1EA5t l\u01B0\u1EE3ng ph\xE2n t\xEDch trong th\u1EDDi h\u1EA1n \u0111ang c\xF3", "C\xE2u \u0111\u1ED1 kh\xF4ng gi\u1EDBi h\u1EA1n", "G\xF3i Pro d\xE0i h\u1EA1n \u0111\xE3 mua/x\xE1c minh tr\u01B0\u1EDBc \u0111\xE2y v\u1EABn gi\u1EEF nguy\xEAn hi\u1EC7u l\u1EF1c"] }),
  diamond: Object.freeze({ id: "diamond", name: "Kim C\u01B0\u01A1ng", tagline: "G\xF3i cao c\u1EA5p nh\u1EA5t \xB7 1 n\u0103m \xB7 c\u1ED9ng d\u1ED3n khi gia h\u1EA1n", durationDays: DIAMOND_DURATION_DAYS, priceVnd: DIAMOND_PRICE_VND, perks: ["M\u1ECDi quy\u1EC1n l\u1EE3i c\u1EE7a Pro: ph\xE2n t\xEDch to\xE0n v\xE1n v\xE0 c\xE2u \u0111\u1ED1 kh\xF4ng gi\u1EDBi h\u1EA1n", "Huy hi\u1EC7u 3D \xABKIM C\u01AF\u01A0NG\xBB tr\xEAn h\u1ED3 s\u01A1, b\u1EA3ng x\u1EBFp h\u1EA1ng v\xE0 tin nh\u1EAFn", "Khung tin nh\u1EAFn ri\xEAng \xE1nh kim c\u01B0\u01A1ng", "Gia h\u1EA1n khi c\xF2n h\u1EA1n s\u1EBD c\u1ED9ng d\u1ED3n th\xEAm 365 ng\xE0y", "Ch\u1EC9 c\u1EA5p sau khi admin x\xE1c nh\u1EADn \u0111\xE3 nh\u1EADn thanh to\xE1n; kh\xF4ng \u1EA3nh h\u01B0\u1EDFng Elo hay s\u1EE9c m\u1EA1nh bot"] }),
  premium: Object.freeze({ id: "premium", name: "Premium", tagline: "Hi\u1EC7n kh\xF4ng b\xE1n tr\u1EF1c ti\u1EBFp \xB7 li\xEAn h\u1EC7 admin", lifetime: true, perks: ["G\u1EEDi \u0111\u1EC1 ngh\u1ECB trao \u0111\u1ED5i m\u1EE9c 1.000\u0111\u2013100.000\u0111 t\u1EDBi admin", "C\xE2u \u0111\u1ED1 kh\xF4ng gi\u1EDBi h\u1EA1n", "Kh\xF4ng ph\u1EA3i thanh to\xE1n v\xE0 kh\xF4ng t\u1EF1 k\xEDch ho\u1EA1t Premium", "Quy\u1EC1n Premium \u0111\xE3 \u0111\u01B0\u1EE3c c\u1EA5p/x\xE1c minh t\u1EEB tr\u01B0\u1EDBc v\u1EABn gi\u1EEF nguy\xEAn", "Admin ph\u1EA3n h\u1ED3i trong Messenger c\u1EE7a \u1EE9ng d\u1EE5ng"] })
});
var toMs = (value) => {
  if (value == null || value === "") return null;
  const ms = typeof value === "number" ? value : Date.parse(String(value));
  return Number.isFinite(ms) && ms > 0 ? ms : null;
};
function normalizeEntitlement(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  return {
    premium: src.premium === true || src.plan === "premium",
    // A missing expiry means legacy/permanent Premium. Temporary Premium uses an explicit server expiry.
    premiumExpiresAt: toMs(src.premiumExpiresAt),
    proExpiresAt: toMs(src.proExpiresAt),
    diamondExpiresAt: toMs(src.diamondExpiresAt),
    freeReviewsUsed: Math.max(0, Math.min(1e3, Math.floor(Number(src.freeReviewsUsed) || 0))),
    freeReviewGameId: typeof src.freeReviewGameId === "string" ? src.freeReviewGameId.slice(0, 120) : ""
  };
}
function effectivePlan(entitlement, now = Date.now()) {
  const ent = normalizeEntitlement(entitlement);
  if (ent.diamondExpiresAt != null && ent.diamondExpiresAt > now) return "diamond";
  if (ent.premium && (ent.premiumExpiresAt == null || ent.premiumExpiresAt > now)) return "premium";
  if (ent.proExpiresAt != null && ent.proExpiresAt > now) return "pro";
  return "free";
}
function reviewAccess(entitlement, gameId = "", now = Date.now()) {
  const ent = normalizeEntitlement(entitlement);
  const plan = effectivePlan(ent, now);
  if (PAID_PLANS.includes(plan)) return { allowed: true, plan, reason: plan, consumesFree: false, remainingFree: null };
  const remainingFree = Math.max(0, FREE_REVIEW_LIMIT - ent.freeReviewsUsed);
  if (gameId && ent.freeReviewGameId && ent.freeReviewGameId === String(gameId)) {
    return { allowed: true, plan, reason: "free-same-game", consumesFree: false, remainingFree };
  }
  if (remainingFree > 0) return { allowed: true, plan, reason: "free-trial", consumesFree: true, remainingFree };
  return { allowed: false, plan, reason: "limit", consumesFree: false, remainingFree: 0 };
}
function consumeFreeReview(entitlement, gameId = "") {
  const ent = normalizeEntitlement(entitlement);
  if (gameId && ent.freeReviewGameId === String(gameId)) return ent;
  return { ...ent, freeReviewsUsed: Math.min(FREE_REVIEW_LIMIT, ent.freeReviewsUsed + 1), freeReviewGameId: String(gameId || ent.freeReviewGameId || "") };
}
function grantProTrial(entitlement, now = Date.now()) {
  const ent = normalizeEntitlement(entitlement);
  if (ent.premium && ent.premiumExpiresAt == null) return ent;
  const base = ent.proExpiresAt != null && ent.proExpiresAt > now ? ent.proExpiresAt : now;
  return { ...ent, proExpiresAt: base + PRO_TRIAL_DURATION_MS };
}
function grantProCodeTrial(entitlement, now = Date.now()) {
  const ent = normalizeEntitlement(entitlement);
  if (ent.premium && ent.premiumExpiresAt == null) return ent;
  const base = ent.proExpiresAt != null && ent.proExpiresAt > now ? ent.proExpiresAt : now;
  return { ...ent, proExpiresAt: base + PRO_CODE_TRIAL_DURATION_MS };
}
function grantPremiumCodeTrial(entitlement, now = Date.now()) {
  const ent = normalizeEntitlement(entitlement);
  if (ent.premium && ent.premiumExpiresAt == null) return ent;
  return { ...ent, premium: true, premiumExpiresAt: now + PREMIUM_CODE_TRIAL_DURATION_MS };
}
function grantPlan(entitlement, planId, now = Date.now()) {
  const ent = normalizeEntitlement(entitlement);
  if (planId === "premium") return { ...ent, premium: true, premiumExpiresAt: null };
  if (planId === "pro") {
    const base = ent.proExpiresAt != null && ent.proExpiresAt > now ? ent.proExpiresAt : now;
    return { ...ent, proExpiresAt: base + PRO_DURATION_DAYS * DAY_MS };
  }
  if (planId === "diamond") {
    const base = ent.diamondExpiresAt != null && ent.diamondExpiresAt > now ? ent.diamondExpiresAt : now;
    return { ...ent, diamondExpiresAt: base + DIAMOND_DURATION_DAYS * DAY_MS };
  }
  throw new Error('G\xF3i kh\xF4ng h\u1EE3p l\u1EC7: ch\u1EC9 c\xF3 "pro", "premium" ho\u1EB7c "diamond".');
}
function revokePlan(entitlement, planId) {
  const ent = normalizeEntitlement(entitlement);
  if (planId === "premium") return { ...ent, premium: false, premiumExpiresAt: null };
  if (planId === "pro") return { ...ent, proExpiresAt: null };
  if (planId === "diamond") return { ...ent, diamondExpiresAt: null };
  if (planId === "all") return { ...ent, premium: false, premiumExpiresAt: null, proExpiresAt: null, diamondExpiresAt: null };
  throw new Error("G\xF3i kh\xF4ng h\u1EE3p l\u1EC7.");
}
function refundPurchase(entitlement, planId, now = Date.now()) {
  const ent = normalizeEntitlement(entitlement);
  if (planId === "premium") return { ...ent, premium: false };
  if (planId === "pro") {
    if (ent.proExpiresAt == null) return ent;
    const next = ent.proExpiresAt - PRO_DURATION_DAYS * DAY_MS;
    return { ...ent, proExpiresAt: next > now ? next : null };
  }
  if (planId === "diamond") {
    if (ent.diamondExpiresAt == null) return ent;
    const next = ent.diamondExpiresAt - DIAMOND_DURATION_DAYS * DAY_MS;
    return { ...ent, diamondExpiresAt: next > now ? next : null };
  }
  throw new Error("G\xF3i kh\xF4ng h\u1EE3p l\u1EC7.");
}
function daysLeft(entitlement, now = Date.now()) {
  const ent = normalizeEntitlement(entitlement);
  if (ent.proExpiresAt == null || ent.proExpiresAt <= now) return 0;
  return Math.ceil((ent.proExpiresAt - now) / DAY_MS);
}
function diamondDaysLeft(entitlement, now = Date.now()) {
  const ent = normalizeEntitlement(entitlement);
  if (ent.diamondExpiresAt == null || ent.diamondExpiresAt <= now) return 0;
  return Math.ceil((ent.diamondExpiresAt - now) / DAY_MS);
}
function planStatusLabel(entitlement, now = Date.now()) {
  const plan = effectivePlan(entitlement, now);
  if (plan === "diamond") {
    const ent = normalizeEntitlement(entitlement);
    const remaining = Math.max(0, (ent.diamondExpiresAt || 0) - now);
    if (remaining < DAY_MS) {
      const hours = Math.floor(remaining / (60 * 60 * 1e3));
      const minutes = Math.max(1, Math.ceil(remaining % (60 * 60 * 1e3) / 6e4));
      return `Kim C\u01B0\u01A1ng \xB7 c\xF2n ${hours ? `${hours} gi\u1EDD ` : ""}${minutes} ph\xFAt`;
    }
    return `Kim C\u01B0\u01A1ng \xB7 c\xF2n ${diamondDaysLeft(entitlement, now)} ng\xE0y`;
  }
  if (plan === "premium") {
    const ent = normalizeEntitlement(entitlement);
    if (ent.premiumExpiresAt != null) {
      const remaining = Math.max(0, ent.premiumExpiresAt - now);
      const seconds = Math.max(1, Math.ceil(remaining / 1e3));
      return `Premium d\xF9ng th\u1EED \xB7 c\xF2n ${seconds > 60 ? `${Math.ceil(seconds / 60)} ph\xFAt` : `${seconds} gi\xE2y`}`;
    }
    return "Premium \xB7 tr\u1ECDn \u0111\u1EDDi";
  }
  if (plan === "pro") {
    const ent = normalizeEntitlement(entitlement);
    const remaining = Math.max(0, (ent.proExpiresAt || 0) - now);
    if (remaining < DAY_MS) {
      const hours = Math.floor(remaining / (60 * 60 * 1e3));
      const minutes = Math.max(1, Math.ceil(remaining % (60 * 60 * 1e3) / 6e4));
      return `Pro \xB7 c\xF2n ${hours ? `${hours} gi\u1EDD ` : ""}${minutes} ph\xFAt`;
    }
    return `Pro \xB7 c\xF2n ${daysLeft(entitlement, now)} ng\xE0y`;
  }
  const access = reviewAccess(entitlement, "", now);
  return access.remainingFree > 0 ? "Mi\u1EC5n ph\xED \xB7 c\xF2n 1 l\u1EA7n ph\xE2n t\xEDch" : "Mi\u1EC5n ph\xED \xB7 \u0111\xE3 d\xF9ng l\u01B0\u1EE3t ph\xE2n t\xEDch";
}
function entitlementForClient(entitlement, now = Date.now()) {
  const ent = normalizeEntitlement(entitlement);
  return { ...ent, plan: effectivePlan(ent, now), daysLeft: daysLeft(ent, now), diamondDaysLeft: diamondDaysLeft(ent, now), label: planStatusLabel(ent, now) };
}

// ../src/clock.js
var CLOCK_PRESETS = Object.freeze([
  { value: "untimed", label: "Kh\xF4ng gi\u1EDBi h\u1EA1n", category: "casual", baseSeconds: 0, incrementSeconds: 0 },
  { value: "0.25+0", label: "UltraBullet \xB7 0:15+0", category: "bullet", baseSeconds: 15, incrementSeconds: 0 },
  { value: "0.5+0", label: "HyperBullet \xB7 0:30+0", category: "bullet", baseSeconds: 30, incrementSeconds: 0 },
  { value: "1+0", label: "Bullet \xB7 1+0", category: "bullet", baseSeconds: 60, incrementSeconds: 0 },
  { value: "1+1", label: "Bullet \xB7 1+1", category: "bullet", baseSeconds: 60, incrementSeconds: 1 },
  { value: "2+0", label: "Bullet \xB7 2+0", category: "bullet", baseSeconds: 120, incrementSeconds: 0 },
  { value: "2+1", label: "Bullet \xB7 2+1", category: "bullet", baseSeconds: 120, incrementSeconds: 1 },
  { value: "3+0", label: "Blitz \xB7 3+0", category: "blitz", baseSeconds: 180, incrementSeconds: 0 },
  { value: "3+1", label: "Blitz \xB7 3+1", category: "blitz", baseSeconds: 180, incrementSeconds: 1 },
  { value: "3+2", label: "Blitz \xB7 3+2", category: "blitz", baseSeconds: 180, incrementSeconds: 2 },
  { value: "5+0", label: "Blitz \xB7 5+0", category: "blitz", baseSeconds: 300, incrementSeconds: 0 },
  { value: "5+3", label: "Blitz \xB7 5+3", category: "blitz", baseSeconds: 300, incrementSeconds: 3 },
  { value: "5+5", label: "Blitz \xB7 5+5", category: "blitz", baseSeconds: 300, incrementSeconds: 5 },
  { value: "6+0", label: "Blitz \xB7 6+0", category: "blitz", baseSeconds: 360, incrementSeconds: 0 },
  { value: "10+0", label: "Rapid \xB7 10+0", category: "rapid", baseSeconds: 600, incrementSeconds: 0 },
  { value: "10+5", label: "Rapid \xB7 10+5", category: "rapid", baseSeconds: 600, incrementSeconds: 5 },
  { value: "15+0", label: "Rapid \xB7 15+0", category: "rapid", baseSeconds: 900, incrementSeconds: 0 },
  { value: "15+10", label: "Rapid \xB7 15+10", category: "rapid", baseSeconds: 900, incrementSeconds: 10 },
  { value: "20+0", label: "Rapid \xB7 20+0", category: "rapid", baseSeconds: 1200, incrementSeconds: 0 },
  { value: "25+5", label: "Rapid \xB7 25+5", category: "rapid", baseSeconds: 1500, incrementSeconds: 5 },
  { value: "30+0", label: "Rapid \xB7 30+0", category: "rapid", baseSeconds: 1800, incrementSeconds: 0 }
]);
var ONLINE_DAILY_CLOCK_PRESETS = Object.freeze([
  { value: "1d", label: "C\u1EDD ng\xE0y \xB7 1 ng\xE0y m\u1ED7i l\u01B0\u1EE3t", category: "daily", baseSeconds: 86400, incrementSeconds: 0 },
  { value: "2d", label: "C\u1EDD ng\xE0y \xB7 2 ng\xE0y m\u1ED7i l\u01B0\u1EE3t", category: "daily", baseSeconds: 172800, incrementSeconds: 0 }
]);
var RANKED_CLOCK_PRESETS = Object.freeze([
  ...CLOCK_PRESETS.filter((preset) => preset.value !== "untimed"),
  ...ONLINE_DAILY_CLOCK_PRESETS
]);

// ../src/license.js
var LICENSE_STATUSES = Object.freeze(["none", "pending", "approved", "rejected", "revoked"]);
var LICENSE_DECISIONS = Object.freeze(["approve", "reject", "revoke"]);
var LICENSE_LABELS = Object.freeze({
  none: "Ch\u01B0a \u0111\u0103ng k\xFD",
  pending: "\u0110ang ch\u1EDD admin duy\u1EC7t",
  approved: "\u0110\xE3 \u0111\u01B0\u1EE3c c\u1EA5p ph\xE9p",
  rejected: "B\u1ECB t\u1EEB ch\u1ED1i",
  revoked: "\u0110\xE3 b\u1ECB thu h\u1ED3i"
});
var text = (value, max) => typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
var CODE_RE = /^[\p{L}\p{N}][\p{L}\p{N} ._\/-]{1,38}[\p{L}\p{N}]$/u;
function normalizeLicense(raw) {
  const value = raw && typeof raw === "object" ? raw : {};
  const status = LICENSE_STATUSES.includes(value.status) ? value.status : "none";
  return {
    status,
    holderName: text(value.holderName, 60),
    licenseCode: text(value.licenseCode, 40),
    note: text(value.note, 300),
    submittedAt: typeof value.submittedAt === "string" ? value.submittedAt : null,
    decidedAt: typeof value.decidedAt === "string" ? value.decidedAt : null,
    decidedBy: typeof value.decidedBy === "string" ? value.decidedBy : "",
    reason: text(value.reason, 200)
  };
}
function isLicensed(user) {
  return Boolean(user && !user.banned && normalizeLicense(user.license).status === "approved");
}
function validateLicenseSubmission(body) {
  const holderName = text(body?.holderName, 60);
  const licenseCode = text(body?.licenseCode, 40);
  const note = text(body?.note, 300);
  if (holderName.length < 2) return { ok: false, error: "Nh\u1EADp h\u1ECD t\xEAn ng\u01B0\u1EDDi gi\u1EEF gi\u1EA5y ph\xE9p (\xEDt nh\u1EA5t 2 k\xFD t\u1EF1)." };
  if (!CODE_RE.test(licenseCode)) return { ok: false, error: "M\xE3 gi\u1EA5y ph\xE9p / ch\u1EE9ng nh\u1EADn d\xE0i 3\u201340 k\xFD t\u1EF1 (ch\u1EEF, s\u1ED1, d\u1EA5u . _ - /)." };
  return { ok: true, value: { holderName, licenseCode, note } };
}
function submitLicense(user, body, nowIso2 = (/* @__PURE__ */ new Date()).toISOString()) {
  const current = normalizeLicense(user?.license);
  if (current.status === "pending") return { ok: false, status: 409, error: "H\u1ED3 s\u01A1 gi\u1EA5y ph\xE9p c\u1EE7a b\u1EA1n \u0111ang ch\u1EDD admin duy\u1EC7t." };
  if (current.status === "approved") return { ok: false, status: 409, error: "T\xE0i kho\u1EA3n \u0111\xE3 \u0111\u01B0\u1EE3c c\u1EA5p gi\u1EA5y ph\xE9p." };
  const checked = validateLicenseSubmission(body);
  if (!checked.ok) return { ok: false, status: 400, error: checked.error };
  user.license = { ...checked.value, status: "pending", submittedAt: nowIso2, decidedAt: null, decidedBy: "", reason: "" };
  return { ok: true, license: normalizeLicense(user.license) };
}
function decideLicense(user, decision, adminId, reason = "", nowIso2 = (/* @__PURE__ */ new Date()).toISOString()) {
  if (!LICENSE_DECISIONS.includes(decision)) return { ok: false, status: 400, error: "Quy\u1EBFt \u0111\u1ECBnh kh\xF4ng h\u1EE3p l\u1EC7." };
  const current = normalizeLicense(user?.license);
  if (decision === "revoke") {
    if (current.status !== "approved") return { ok: false, status: 409, error: "Ch\u1EC9 thu h\u1ED3i \u0111\u01B0\u1EE3c gi\u1EA5y ph\xE9p \u0111\xE3 duy\u1EC7t." };
  } else if (current.status !== "pending") {
    return { ok: false, status: 409, error: "H\u1ED3 s\u01A1 n\xE0y kh\xF4ng \u1EDF tr\u1EA1ng th\xE1i ch\u1EDD duy\u1EC7t." };
  }
  const status = decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "revoked";
  user.license = { ...current, status, decidedAt: nowIso2, decidedBy: String(adminId || ""), reason: text(reason, 200) };
  return { ok: true, license: normalizeLicense(user.license) };
}

// ../src/club-tournament.js
var ICT_OFFSET_MS = 7 * 36e5;
var WEEK_MS = 7 * 24 * 36e5;
var TOURNAMENT_START_HOUR = 20;
var TOURNAMENT_DURATION_MIN = 90;
var MAX_GAMES_PER_OPPONENT = 3;
var MAX_ENTRIES = 500;
var MAX_KEPT_TOURNAMENTS = 60;
var POINTS = Object.freeze({ win: 2, draw: 1, loss: 0 });
var DEFAULT_PRIZE = "Nh\xE0 v\xF4 \u0111\u1ECBch Ch\u1EE7 nh\u1EADt: huy hi\u1EC7u & banner vinh danh trong \u0111\u1EA5u tr\u01B0\u1EDDng online";
var pad = (n) => String(n).padStart(2, "0");
function sundayWindow(nowMs = Date.now()) {
  const shifted = new Date(nowMs + ICT_OFFSET_MS);
  const daysToSunday = (7 - shifted.getUTCDay()) % 7;
  let startsAt = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate() + daysToSunday, TOURNAMENT_START_HOUR) - ICT_OFFSET_MS;
  let endsAt = startsAt + TOURNAMENT_DURATION_MIN * 6e4;
  if (nowMs >= endsAt) {
    startsAt += WEEK_MS;
    endsAt += WEEK_MS;
  }
  return { id: tournamentIdFor(startsAt), startsAt, endsAt };
}
function tournamentIdFor(startsAtMs) {
  const d = new Date(startsAtMs + ICT_OFFSET_MS);
  return `club-${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
function tournamentPhase(t, nowMs = Date.now()) {
  if (!t) return "none";
  if (nowMs < t.startsAt) return "upcoming";
  if (nowMs < t.endsAt) return "live";
  return "finished";
}
function createTournament(win, prize = DEFAULT_PRIZE, nowIso2 = (/* @__PURE__ */ new Date()).toISOString()) {
  return { id: win.id, startsAt: win.startsAt, endsAt: win.endsAt, prize: String(prize || DEFAULT_PRIZE).slice(0, 200), entries: [], scores: {}, counted: [], result: null, createdAt: nowIso2 };
}
function normalizeTournament(raw) {
  if (!raw || typeof raw !== "object" || typeof raw.id !== "string") return null;
  const startsAt = Number(raw.startsAt), endsAt = Number(raw.endsAt);
  if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || endsAt <= startsAt) return null;
  return {
    id: raw.id,
    startsAt,
    endsAt,
    prize: String(raw.prize || DEFAULT_PRIZE).slice(0, 200),
    entries: Array.isArray(raw.entries) ? raw.entries.filter((e) => e && typeof e.userId === "string") : [],
    scores: raw.scores && typeof raw.scores === "object" && !Array.isArray(raw.scores) ? raw.scores : {},
    counted: Array.isArray(raw.counted) ? raw.counted.filter((id) => typeof id === "string") : [],
    result: raw.result && typeof raw.result === "object" ? raw.result : null,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date(startsAt).toISOString()
  };
}
function isEntered(t, userId) {
  return Boolean(t?.entries?.some((entry) => entry.userId === userId));
}
function joinTournament(t, userId, nowMs = Date.now()) {
  if (!t || tournamentPhase(t, nowMs) === "finished") return { ok: false, status: 409, error: "Gi\u1EA3i n\xE0y \u0111\xE3 k\u1EBFt th\xFAc." };
  if (isEntered(t, userId)) return { ok: false, status: 409, error: "B\u1EA1n \u0111\xE3 \u0111\u0103ng k\xFD gi\u1EA3i n\xE0y r\u1ED3i." };
  if (t.entries.length >= MAX_ENTRIES) return { ok: false, status: 409, error: "Gi\u1EA3i \u0111\xE3 \u0111\u1EE7 s\u1ED1 ng\u01B0\u1EDDi \u0111\u0103ng k\xFD." };
  t.entries.push({ userId, joinedAt: new Date(nowMs).toISOString() });
  return { ok: true };
}
function leaveTournament(t, userId, nowMs = Date.now()) {
  if (!t || !isEntered(t, userId)) return { ok: false, status: 404, error: "B\u1EA1n ch\u01B0a \u0111\u0103ng k\xFD gi\u1EA3i n\xE0y." };
  if (tournamentPhase(t, nowMs) !== "upcoming") return { ok: false, status: 409, error: "Gi\u1EA3i \u0111\xE3 b\u1EAFt \u0111\u1EA7u, kh\xF4ng th\u1EC3 h\u1EE7y \u0111\u0103ng k\xFD." };
  t.entries = t.entries.filter((entry) => entry.userId !== userId);
  return { ok: true };
}
function emptyScore() {
  return { points: 0, games: 0, wins: 0, draws: 0, losses: 0, vs: {} };
}
function recordMatchResult(t, match) {
  if (!t || t.result || !match || match.ranked !== true || match.status !== "finished") return false;
  const finishedMs = Date.parse(match.finishedAt || "");
  if (!Number.isFinite(finishedMs) || finishedMs < t.startsAt || finishedMs >= t.endsAt) return false;
  const matchId = String(match.id || "");
  if (!matchId || t.counted.includes(matchId)) return false;
  const white = match.players?.w, black = match.players?.b;
  if (!white || !black || white === black) return false;
  const outcome = match.result === "1-0" ? { [white]: "win", [black]: "loss" } : match.result === "0-1" ? { [white]: "loss", [black]: "win" } : { [white]: "draw", [black]: "draw" };
  let scored = false;
  for (const [me, opp] of [[white, black], [black, white]]) {
    if (!isEntered(t, me)) continue;
    const row = t.scores[me] = { ...emptyScore(), ...t.scores[me] || {}, vs: { ...t.scores[me]?.vs || {} } };
    if ((row.vs[opp] || 0) >= MAX_GAMES_PER_OPPONENT) continue;
    row.vs[opp] = (row.vs[opp] || 0) + 1;
    const kind = outcome[me];
    row.games += 1;
    row.points += POINTS[kind];
    if (kind === "win") row.wins += 1;
    else if (kind === "draw") row.draws += 1;
    else row.losses += 1;
    scored = true;
  }
  t.counted.push(matchId);
  if (t.counted.length > 2e3) t.counted = t.counted.slice(-2e3);
  return scored;
}
function standings(t) {
  const joined = new Map((t?.entries || []).map((entry, index) => [entry.userId, index]));
  return (t?.entries || []).map((entry) => {
    const row = { ...emptyScore(), ...t.scores?.[entry.userId] || {} };
    return { userId: entry.userId, points: row.points, games: row.games, wins: row.wins, draws: row.draws, losses: row.losses, order: joined.get(entry.userId) };
  }).sort((a, b) => b.points - a.points || b.wins - a.wins || a.games - b.games || a.order - b.order).map(({ order, ...row }, index) => ({ rank: index + 1, ...row }));
}
function finalizeTournament(t, nowMs = Date.now(), nowIso2 = new Date(nowMs).toISOString()) {
  if (!t || t.result || tournamentPhase(t, nowMs) !== "finished") return false;
  const podium = standings(t).filter((row) => row.games > 0).slice(0, 3).map((row, index) => ({ ...row, rank: index + 1 }));
  t.result = { finalizedAt: nowIso2, entrants: t.entries.length, podium, championId: podium[0]?.userId || null };
  return true;
}
function ensureCurrentTournament(db, nowMs = Date.now()) {
  db.tournaments = (Array.isArray(db.tournaments) ? db.tournaments : []).map(normalizeTournament).filter(Boolean);
  for (const t of db.tournaments) finalizeTournament(t, nowMs);
  const win = sundayWindow(nowMs);
  let current = db.tournaments.find((t) => t.id === win.id);
  if (!current) {
    const lastPrize = [...db.tournaments].sort((a, b) => b.startsAt - a.startsAt)[0]?.prize;
    current = createTournament(win, lastPrize || DEFAULT_PRIZE, new Date(nowMs).toISOString());
    db.tournaments.push(current);
  }
  db.tournaments.sort((a, b) => a.startsAt - b.startsAt);
  if (db.tournaments.length > MAX_KEPT_TOURNAMENTS) db.tournaments = db.tournaments.slice(-MAX_KEPT_TOURNAMENTS);
  return db.tournaments.find((t) => t.id === win.id);
}
function recordMatchInTournaments(db, match, nowMs = Date.now()) {
  if (!Array.isArray(db.tournaments) || !match) return false;
  let any = false;
  for (const t of db.tournaments) if (recordMatchResult(t, match)) any = true;
  return any;
}
function tournamentView(t, { userId = "", userOf = () => null, nowMs = Date.now(), top = 10 } = {}) {
  if (!t) return null;
  const phase = tournamentPhase(t, nowMs);
  const name = (id) => {
    const u = userOf(id);
    return u ? { id: u.id, displayName: u.displayName || u.username || "Ng\u01B0\u1EDDi ch\u01A1i", username: u.username || "", avatarId: u.avatarId ?? 0 } : { id, displayName: "T\xE0i kho\u1EA3n \u0111\xE3 x\xF3a", username: "", avatarId: 0 };
  };
  const table = standings(t).map((row) => ({ ...row, player: name(row.userId) }));
  return {
    id: t.id,
    startsAt: t.startsAt,
    endsAt: t.endsAt,
    phase,
    prize: t.prize,
    entrants: t.entries.length,
    joined: Boolean(userId) && isEntered(t, userId),
    myRow: userId ? table.find((row) => row.userId === userId) || null : null,
    standings: table.slice(0, top).map(({ userId: _u, ...row }) => row),
    podium: t.result ? t.result.podium.map((row) => ({ ...row, player: name(row.userId) })).map(({ userId: _u, ...row }) => row) : null,
    pointsRule: `Th\u1EAFng ${POINTS.win} \xB7 h\xF2a ${POINTS.draw} \xB7 thua ${POINTS.loss} (t\u1ED1i \u0111a ${MAX_GAMES_PER_OPPONENT} v\xE1n / \u0111\u1ED1i th\u1EE7)`
  };
}
function tournamentHistory(db, { userOf = () => null, limit = 8 } = {}) {
  return (db.tournaments || []).filter((t) => t.result).sort((a, b) => b.startsAt - a.startsAt).slice(0, limit).map((t) => {
    const view = tournamentView(t, { userOf, nowMs: t.endsAt + 1, top: 3 });
    return { id: t.id, endsAt: t.endsAt, entrants: t.entries.length, prize: t.prize, champion: view.podium?.[0]?.player || null, podium: view.podium || [] };
  });
}

// ../src/ranked-fair-play.js
var MAX_RECENT_TURNS = 12;
var ULTRA_FAST_MS = 90;
var COMPLEX_FAST_MS = 250;
var COMPLEX_POSITION_LEGAL_MOVES = 24;
function finiteNonNegative(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : fallback;
}
function createRankedFairPlayState() {
  return {
    signals: 0,
    ultraFastMoves: 0,
    ultraFastStreak: 0,
    level: "clear",
    recentTurns: [],
    lastComplexSignalPly: -1e3,
    metrics: { movesObserved: 0, fastComplexMoves: 0, medianTurnMs: null }
  };
}
function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}
function assessRankedFairPlayMove(state, {
  userId = "",
  turnDurationMs,
  legalMoveCount,
  ply,
  now = Date.now()
} = {}) {
  const result = state && typeof state === "object" ? state : createRankedFairPlayState();
  result.signals = finiteNonNegative(result.signals);
  result.ultraFastMoves = finiteNonNegative(result.ultraFastMoves);
  result.ultraFastStreak = finiteNonNegative(result.ultraFastStreak);
  result.recentTurns = Array.isArray(result.recentTurns) ? result.recentTurns : [];
  result.lastComplexSignalPly = Number.isFinite(Number(result.lastComplexSignalPly)) ? Number(result.lastComplexSignalPly) : -1e3;
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
  if (result.ultraFastStreak >= 4 && result.ultraFastStreak % 4 === 0) {
    recordEvent(
      "repeated_ultra_fast_moves",
      result.ultraFastStreak >= 8 ? "priority_review" : "review",
      `${result.ultraFastStreak} consecutive own turns under ${ULTRA_FAST_MS} ms`
    );
  }
  const recentComplexFast = result.recentTurns.filter(
    (turn) => finiteNonNegative(turn.durationMs) < COMPLEX_FAST_MS && finiteNonNegative(turn.legalMoveCount) >= COMPLEX_POSITION_LEGAL_MOVES
  ).length;
  if (recentComplexFast >= 3 && currentPly - result.lastComplexSignalPly >= 12) {
    result.lastComplexSignalPly = currentPly;
    recordEvent(
      "fast_moves_in_complex_positions",
      "review",
      `${recentComplexFast} of the last ${result.recentTurns.length} own turns were under ${COMPLEX_FAST_MS} ms with ${COMPLEX_POSITION_LEGAL_MOVES}+ legal moves`
    );
  }
  const timings = result.recentTurns.map((turn) => finiteNonNegative(turn.durationMs));
  result.metrics = {
    movesObserved: (Number(result.metrics?.movesObserved) || 0) + 1,
    fastComplexMoves: recentComplexFast,
    medianTurnMs: median(timings),
    recentTurnCount: result.recentTurns.length
  };
  result.level = result.signals >= 3 ? "priority_review" : result.signals > 0 ? "review" : "clear";
  return { state: result, events };
}
var FOCUS_MIN_LOST_MS = 3e3;
var FOCUS_MIN_SHARE = 0.5;
var FOCUS_MIN_LEGAL_MOVES = 20;
var FOCUS_COOLDOWN_PLIES = 6;
function assessRankedFocusSignal(state, { userId = "", focusLostMs = 0, focusCount = 0, turnDurationMs = 0, legalMoveCount = 0, ply = 0, now = Date.now() } = {}) {
  const result = state && typeof state === "object" ? state : createRankedFairPlayState();
  const duration = finiteNonNegative(turnDurationMs);
  const lost = Math.min(finiteNonNegative(focusLostMs), duration);
  const count = Math.min(finiteNonNegative(focusCount), 50);
  const branching = Math.floor(finiteNonNegative(legalMoveCount));
  const currentPly = Math.floor(finiteNonNegative(ply));
  result.focusLossTurns = finiteNonNegative(result.focusLossTurns);
  result.lastFocusSignalPly = Number.isFinite(Number(result.lastFocusSignalPly)) ? Number(result.lastFocusSignalPly) : -1e3;
  const events = [];
  const suspicious = count > 0 && lost >= FOCUS_MIN_LOST_MS && duration > 0 && lost / duration >= FOCUS_MIN_SHARE && branching >= FOCUS_MIN_LEGAL_MOVES;
  if (suspicious) {
    result.focusLossTurns += 1;
    if (result.focusLossTurns >= 3 && currentPly - result.lastFocusSignalPly >= FOCUS_COOLDOWN_PLIES) {
      result.lastFocusSignalPly = currentPly;
      result.signals = finiteNonNegative(result.signals) + 1;
      events.push({
        userId,
        type: "repeated_focus_loss_on_complex_turns",
        severity: result.focusLossTurns >= 6 ? "priority_review" : "review",
        turnDurationMs: duration,
        legalMoveCount: branching,
        at: new Date(Number.isFinite(Number(now)) ? Number(now) : Date.now()).toISOString(),
        ply: currentPly,
        detail: `${result.focusLossTurns} complex turns spent mostly outside the app (client-reported, low confidence)`
      });
    }
  }
  return { state: result, events };
}

// ../src/game-rules.js
var RANKED_MIN_PLIES = 2;
var FORFEIT_REASONS = Object.freeze(["resignation", "abandoned", "disconnect_timeout", "time_forfeit"]);
function emptySide() {
  return { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0, bishopsLight: 0, bishopsDark: 0 };
}
function parseFenMaterial(fen) {
  const board = String(fen || "").trim().split(/\s+/)[0] || "";
  const rows = board.split("/");
  if (rows.length !== 8) return null;
  const sides = { w: emptySide(), b: emptySide() };
  for (let row = 0; row < 8; row += 1) {
    let file = 0;
    for (const ch of rows[row]) {
      if (ch >= "1" && ch <= "8") {
        file += Number(ch);
        continue;
      }
      const kind = ch.toLowerCase();
      if (!"pnbrqk".includes(kind) || kind.length !== 1 || file > 7) return null;
      const side = sides[ch === kind ? "b" : "w"];
      side[kind] += 1;
      if (kind === "b") {
        const rank = 7 - row;
        side[(file + rank) % 2 === 0 ? "bishopsDark" : "bishopsLight"] += 1;
      }
      file += 1;
    }
    if (file !== 8) return null;
  }
  if (sides.w.k !== 1 || sides.b.k !== 1) return null;
  return sides;
}
function hasInsufficientMatingMaterial(fen, color) {
  if (color !== "w" && color !== "b") return false;
  const material = parseFenMaterial(fen);
  if (!material) return false;
  const me = material[color];
  const opponent = material[color === "w" ? "b" : "w"];
  if (me.p || me.r || me.q) return false;
  const minors = me.n + me.b;
  if (minors === 0) return true;
  const opponentIsBareKing = opponent.p + opponent.n + opponent.b + opponent.r + opponent.q === 0;
  if (!opponentIsBareKing) return false;
  if (minors === 1) return true;
  return me.n === 0 && (me.bishopsLight === 0 || me.bishopsDark === 0);
}
function resolveFlagResult(fen, flaggedColor) {
  if (flaggedColor !== "w" && flaggedColor !== "b") return { result: "*", reason: "invalid_color", drawn: false };
  const winner = flaggedColor === "w" ? "b" : "w";
  if (hasInsufficientMatingMaterial(fen, winner)) {
    return { result: "1/2-1/2", reason: "timeout_vs_insufficient", drawn: true, winner: null };
  }
  return { result: winner === "w" ? "1-0" : "0-1", reason: "time_forfeit", drawn: false, winner };
}
function planRankedFinish({ result, reason = "game_over", plyCount = 0, fen = "" } = {}) {
  if (FORFEIT_REASONS.includes(reason) && !(Number(plyCount) >= RANKED_MIN_PLIES)) {
    return { status: "aborted", result: null, reason: "aborted", originalReason: reason, rated: false };
  }
  if (reason === "time_forfeit" && (result === "1-0" || result === "0-1")) {
    const flagged = result === "1-0" ? "b" : "w";
    const outcome = resolveFlagResult(fen, flagged);
    return { status: "finished", result: outcome.result, reason: outcome.reason, rated: true };
  }
  return { status: "finished", result, reason, rated: true };
}

// src/team.js
var DEFAULT_TEAM_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";
var MAX_QUESTION_CHARS = 500;
var MAX_SPECIALISTS_PER_QUESTION = 3;
var MAX_REPLY_CHARS = 900;
var TEAM_MAX_TOKENS = 260;
var DAILY_QUESTION_LIMITS = Object.freeze({ free: 5, pro: 30, diamond: 60, premium: 100, admin: 500 });
var SPECIALISTS = Object.freeze([
  {
    id: "opening",
    name: "Chuy\xEAn gia khai cu\u1ED9c",
    icon: "\u265E",
    keywords: ["khai cu\u1ED9c", "khai cuoc", "opening", "sicilian", "ruy lopez", "gambit", "ph\xF2ng th\u1EE7", "phong thu", "eco", "n\u01B0\u1EDBc \u0111\u1EA7u", "nuoc dau", "s\xE1ch khai", "repertoire"],
    focus: "khai cu\u1ED9c: \xFD t\u01B0\u1EDFng c\u1EE7a th\u1EBF c\u1EDD, k\u1EBF ho\u1EA1ch ph\xE1t tri\u1EC3n qu\xE2n, b\u1EABy th\u01B0\u1EDDng g\u1EB7p, khi n\xE0o n\xEAn r\u1EDDi l\xFD thuy\u1EBFt"
  },
  {
    id: "tactics",
    name: "Chuy\xEAn gia chi\u1EBFn thu\u1EADt",
    icon: "\u2694",
    keywords: ["chi\u1EBFn thu\u1EADt", "chien thuat", "\u0111\xF2n", "don chien", "fork", "ghim", "pin", "skewer", "chi\u1EBFu", "chieu", "b\u1EAFt \u0111\xF4i", "bat doi", "sai l\u1EA7m", "sai lam", "blunder", "m\u1EA5t qu\xE2n", "mat quan", "\u0103n qu\xE2n", "an quan", "tactic", "hy sinh", "hi sinh"],
    focus: "chi\u1EBFn thu\u1EADt: \u0111\xF2n \u0111\xF4i, ghim, nh\u1EED qu\xE2n, nguy c\u01A1 m\u1EA5t qu\xE2n, v\xEC sao n\u01B0\u1EDBc \u0111i t\u1ED1t nh\u1EA5t c\u1EE7a engine hi\u1EC7u qu\u1EA3"
  },
  {
    id: "endgame",
    name: "Chuy\xEAn gia t\xE0n cu\u1ED9c",
    icon: "\u265A",
    keywords: ["t\xE0n cu\u1ED9c", "tan cuoc", "endgame", "t\u1ED1t th\xF4ng", "tot thong", "phong c\u1EA5p", "phong cap", "\u0111\u1ED1i vua", "doi vua", "h\xF2a", "hoa co", "zugzwang", "xe t\xE0n", "\xEDt qu\xE2n", "it quan"],
    focus: "t\xE0n cu\u1ED9c: v\u1ECB tr\xED vua, t\u1ED1t th\xF4ng, \u0111\u1ED1i vua, quy t\u1EAFc h\xF2a, k\u1EF9 thu\u1EADt chuy\u1EC3n h\xF3a l\u1EE3i th\u1EBF"
  },
  {
    id: "coach",
    name: "Hu\u1EA5n luy\u1EC7n vi\xEAn",
    icon: "\u{1F393}",
    keywords: ["t\u1EA1i sao", "tai sao", "v\xEC sao", "vi sao", "gi\u1EA3i th\xEDch", "giai thich", "h\u1ECDc", "hoc", "c\u1EA3i thi\u1EC7n", "cai thien", "luy\u1EC7n", "luyen", "\u0111i\u1EC3m y\u1EBFu", "diem yeu", "l\u1EDDi khuy\xEAn", "loi khuyen", "v\xE1n v\u1EEBa", "van vua", "ph\xE2n t\xEDch", "phan tich"],
    focus: "hu\u1EA5n luy\u1EC7n: gi\u1EA3i th\xEDch d\u1EC5 hi\u1EC3u, ch\u1EC9 ra m\u1ED9t l\u1ED7i t\u01B0 duy ch\xEDnh v\xE0 m\u1ED9t b\xE0i t\u1EADp nh\u1ECF \u0111\u1EC3 luy\u1EC7n"
  },
  {
    id: "positional",
    name: "Chuy\xEAn gia th\u1EBF tr\u1EADn",
    icon: "\u265C",
    keywords: ["th\u1EBF tr\u1EADn", "the tran", "c\u1EA5u tr\xFAc t\u1ED1t", "cau truc tot", "\xF4 y\u1EBFu", "o yeu", "c\u1ED9t m\u1EDF", "cot mo", "v\u1ECB tr\xED qu\xE2n", "vi tri quan", "k\u1EBF ho\u1EA1ch", "ke hoach", "t\u01B0\u1EE3ng x\u1EA5u", "m\xE3 \u0111\u1EB9p", "positional", "strategy", "chi\u1EBFn l\u01B0\u1EE3c", "chien luoc"],
    focus: "th\u1EBF tr\u1EADn: c\u1EA5u tr\xFAc t\u1ED1t, \xF4 y\u1EBFu, c\u1ED9t m\u1EDF, qu\xE2n ho\u1EA1t \u0111\u1ED9ng v\xE0 k\u1EBF ho\u1EA1ch d\xE0i h\u1EA1n"
  }
]);
var SPECIALIST_BY_ID = new Map(SPECIALISTS.map((item) => [item.id, item]));
function dailyLimitFor(tier) {
  return DAILY_QUESTION_LIMITS[tier] ?? DAILY_QUESTION_LIMITS.free;
}
function utcDay(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}
function consumeDailyQuestion(user, tier, now = Date.now()) {
  const day = utcDay(now);
  const limit = dailyLimitFor(tier);
  const usage = user.teamUsage && user.teamUsage.day === day ? user.teamUsage : { day, count: 0 };
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  const resetsAt = next.toISOString();
  if (usage.count >= limit) {
    user.teamUsage = usage;
    return { allowed: false, used: usage.count, limit, remaining: 0, resetsAt };
  }
  usage.count += 1;
  user.teamUsage = usage;
  return { allowed: true, used: usage.count, limit, remaining: limit - usage.count, resetsAt };
}
function refundDailyQuestion(user, now = Date.now()) {
  if (user.teamUsage && user.teamUsage.day === utcDay(now) && user.teamUsage.count > 0) user.teamUsage.count -= 1;
}
function cleanText(value, max) {
  return String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
function parseTeamRequest(body, { Chess: Chess2 } = {}) {
  const question = cleanText(body?.question, MAX_QUESTION_CHARS);
  if (question.length < 2) throw new TeamInputError("H\xE3y nh\u1EADp c\xE2u h\u1ECFi cho \u0111\u1ED9i chuy\xEAn gia.");
  const out = { question, fen: "", sideToMove: "", legalMoveCount: 0, engine: null, history: "", specialists: [] };
  const fen = cleanText(body?.fen, 100);
  if (fen) {
    if (!Chess2) throw new TeamInputError("M\xE1y ch\u1EE7 ch\u01B0a s\u1EB5n s\xE0ng ki\u1EC3m tra th\u1EBF c\u1EDD.");
    let game;
    try {
      game = new Chess2(fen);
    } catch {
      throw new TeamInputError("Th\u1EBF c\u1EDD (FEN) kh\xF4ng h\u1EE3p l\u1EC7.");
    }
    out.fen = fen;
    out.sideToMove = game.turn() === "w" ? "Tr\u1EAFng" : "\u0110en";
    out.legalMoveCount = game.moves().length;
    const engine = body?.engine;
    if (engine && typeof engine === "object") {
      const e = { evalCp: null, mate: null, bestMove: "", depth: 0 };
      if (Number.isFinite(Number(engine.evalCp))) e.evalCp = Math.max(-1e4, Math.min(1e4, Math.round(Number(engine.evalCp))));
      if (Number.isFinite(Number(engine.mate)) && Number(engine.mate) !== 0) e.mate = Math.max(-99, Math.min(99, Math.round(Number(engine.mate))));
      if (Number.isFinite(Number(engine.depth))) e.depth = Math.max(0, Math.min(99, Math.round(Number(engine.depth))));
      const best = cleanText(engine.bestMove, 8).toLowerCase();
      if (/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(best)) {
        try {
          const probe = new Chess2(fen);
          const move = probe.move({ from: best.slice(0, 2), to: best.slice(2, 4), promotion: best[4] });
          if (move) e.bestMove = move.san;
        } catch {
        }
      }
      if (e.evalCp !== null || e.mate !== null || e.bestMove) out.engine = e;
    }
  }
  out.history = cleanText(body?.history, 400);
  return out;
}
var TeamInputError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "TeamInputError";
    this.status = 400;
  }
};
function pickSpecialists(request) {
  const text2 = request.question.toLowerCase();
  const scored = SPECIALISTS.map((item, index) => {
    let score = 0;
    for (const word of item.keywords) if (text2.includes(word)) score += word.length > 6 ? 2 : 1;
    return { item, score, index };
  }).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score || a.index - b.index);
  const chosen = scored.slice(0, MAX_SPECIALISTS_PER_QUESTION).map((entry) => entry.item);
  if (!chosen.length) chosen.push(SPECIALIST_BY_ID.get(request.fen ? "tactics" : "coach"));
  if (request.fen && request.engine && !chosen.some((item) => item.id === "coach") && chosen.length < MAX_SPECIALISTS_PER_QUESTION) chosen.push(SPECIALIST_BY_ID.get("coach"));
  return chosen;
}
function describeEval(engine) {
  if (!engine) return "";
  const parts = [];
  if (engine.mate !== null) parts.push(`chi\u1EBFu h\u1EBFt sau ${Math.abs(engine.mate)} n\u01B0\u1EDBc (${engine.mate > 0 ? "b\xEAn \u0111i \u0111\u01B0\u1EE3c l\u1EE3i" : "b\xEAn \u0111i b\u1ECB l\u1EE3i"})`);
  else if (engine.evalCp !== null) parts.push(`\u0111i\u1EC3m engine ${engine.evalCp >= 0 ? "+" : ""}${(engine.evalCp / 100).toFixed(2)} t\u1ED1t cho ${engine.evalCp >= 0 ? "b\xEAn \u0111i" : "b\xEAn kia"}`);
  if (engine.bestMove) parts.push(`n\u01B0\u1EDBc t\u1ED1t nh\u1EA5t theo engine: ${engine.bestMove}`);
  if (engine.depth) parts.push(`\u0111\u1ED9 s\xE2u ${engine.depth}`);
  return parts.join("; ");
}
function buildMessages(specialist, request) {
  const system = [
    `B\u1EA1n l\xE0 "${specialist.name}" trong \u0111\u1ED9i chuy\xEAn gia c\u1EDD vua c\u1EE7a \u1EE9ng d\u1EE5ng ViLa.`,
    `L\u0129nh v\u1EF1c c\u1EE7a b\u1EA1n: ${specialist.focus}.`,
    "Lu\xF4n tr\u1EA3 l\u1EDDi b\u1EB1ng ti\u1EBFng Vi\u1EC7t, t\u1ED1i \u0111a 4 c\xE2u ng\u1EAFn, d\u1EC5 hi\u1EC3u cho ng\u01B0\u1EDDi ch\u01A1i tr\xEAn \u0111i\u1EC7n tho\u1EA1i.",
    "Ch\u1EC9 n\xF3i v\u1EC1 l\u0129nh v\u1EF1c c\u1EE7a b\u1EA1n. Kh\xF4ng d\xF9ng markdown ph\u1EE9c t\u1EA1p, kh\xF4ng l\u1EB7p l\u1EA1i c\xE2u h\u1ECFi.",
    "Quy t\u1EAFc quan tr\u1ECDng: KH\xD4NG t\u1EF1 b\u1ECBa n\u01B0\u1EDBc \u0111i hay \u0111i\u1EC3m s\u1ED1. Ch\u1EC9 nh\u1EAFc n\u01B0\u1EDBc c\u1EDD c\xF3 trong d\u1EEF li\u1EC7u engine \u0111\u01B0\u1EE3c cung c\u1EA5p. N\u1EBFu thi\u1EBFu d\u1EEF li\u1EC7u th\xEC n\xF3i r\xF5 l\xE0 ch\u01B0a \u0111\u1EE7 th\xF4ng tin."
  ].join(" ");
  const lines = [`C\xE2u h\u1ECFi: ${request.question}`];
  if (request.fen) {
    lines.push(`Th\u1EBF c\u1EDD (FEN): ${request.fen}`, `B\xEAn \u0111i: ${request.sideToMove}; s\u1ED1 n\u01B0\u1EDBc h\u1EE3p l\u1EC7: ${request.legalMoveCount}.`);
    const engine = describeEval(request.engine);
    lines.push(engine ? `D\u1EEF li\u1EC7u engine (\u0111\xE1ng tin): ${engine}.` : "Kh\xF4ng c\xF3 d\u1EEF li\u1EC7u engine cho th\u1EBF c\u1EDD n\xE0y.");
  }
  if (request.history) lines.push(`C\xE1c n\u01B0\u1EDBc g\u1EA7n \u0111\xE2y: ${request.history}`);
  return [{ role: "system", content: system }, { role: "user", content: lines.join("\n") }];
}
function extractText(result) {
  if (typeof result === "string") return result;
  if (typeof result?.response === "string") return result.response;
  const content = result?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content : "";
}
function tidyReply(text2) {
  return cleanText(String(text2 || "").replace(/[*_#`>]+/g, ""), MAX_REPLY_CHARS);
}
function isQuotaError(error) {
  return /quota|limit|neuron|exceed|capacity|too many|429|10000|4006/i.test(String(error?.message || error || ""));
}
async function runTeam({ ai, model = DEFAULT_TEAM_MODEL, request, specialists }) {
  if (!ai || typeof ai.run !== "function") throw new TeamUnavailableError("\u0110\u1ED9i chuy\xEAn gia ch\u01B0a \u0111\u01B0\u1EE3c b\u1EADt tr\xEAn m\xE1y ch\u1EE7.");
  const settled = await Promise.allSettled(specialists.map(async (specialist) => {
    const result = await ai.run(model, { messages: buildMessages(specialist, request), max_tokens: TEAM_MAX_TOKENS, temperature: 0.4 });
    const text2 = tidyReply(extractText(result));
    if (!text2) throw new Error("empty reply");
    return { id: specialist.id, name: specialist.name, icon: specialist.icon, text: text2 };
  }));
  const answers = [];
  const failed = [];
  let quota = false;
  settled.forEach((entry, index) => {
    if (entry.status === "fulfilled") answers.push(entry.value);
    else {
      failed.push(specialists[index].id);
      if (isQuotaError(entry.reason)) quota = true;
    }
  });
  if (!answers.length) {
    throw new TeamUnavailableError(quota ? "\u0110\u1ED9i chuy\xEAn gia \u0111\xE3 d\xF9ng h\u1EBFt l\u01B0\u1EE3t mi\u1EC5n ph\xED h\xF4m nay v\xE0 ngh\u1EC9 \u0111\u1EBFn 7 gi\u1EDD s\xE1ng mai (gi\u1EDD Vi\u1EC7t Nam)." : "\u0110\u1ED9i chuy\xEAn gia \u0111ang b\u1EADn. H\xE3y th\u1EED l\u1EA1i sau \xEDt ph\xFAt.", quota);
  }
  const combined = answers.map((item) => `${item.icon} ${item.name}: ${item.text}`).join("\n\n");
  return { answers, failed, combined };
}
var TeamUnavailableError = class extends Error {
  constructor(message, quota = false) {
    super(message);
    this.name = "TeamUnavailableError";
    this.status = 503;
    this.quota = quota;
  }
};

// src/billing.js
var SCOPE = "https://www.googleapis.com/auth/androidpublisher";
var API = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications";
var DEFAULT_PACKAGE = "com.aistudio.covuavila.vzrk";
var DEFAULT_PRODUCTS = Object.freeze({ pro: "vila_pro_1y", premium: "vila_premium_lifetime", diamond: "vila_diamond_1y" });
var enc = new TextEncoder();
function b64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function pemToDer(pem) {
  const body = String(pem).replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "");
  return Uint8Array.from(atob(body), (char) => char.charCodeAt(0));
}
async function sha256Hex(text2) {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(String(text2)));
  return [...new Uint8Array(digest)].map((n) => n.toString(16).padStart(2, "0")).join("");
}
function billingProducts(env = {}) {
  return { pro: String(env.PRO_PRODUCT_ID || DEFAULT_PRODUCTS.pro), premium: String(env.PREMIUM_PRODUCT_ID || DEFAULT_PRODUCTS.premium), diamond: String(env.DIAMOND_PRODUCT_ID || DEFAULT_PRODUCTS.diamond) };
}
function packageName(env = {}) {
  return String(env.PLAY_PACKAGE_NAME || DEFAULT_PACKAGE);
}
function planForProduct(env, productId) {
  const products = billingProducts(env);
  if (productId === products.pro) return "pro";
  if (productId === products.premium) return "premium";
  if (productId === products.diamond) return "diamond";
  return "";
}
function billingConfigured(env = {}) {
  try {
    const account = JSON.parse(String(env.GOOGLE_SERVICE_ACCOUNT_JSON || ""));
    return Boolean(account.client_email && account.private_key);
  } catch {
    return false;
  }
}
function accountBindingId(userId) {
  return sha256Hex(`vila-billing:${userId}`).then((hex2) => hex2.slice(0, 32));
}
var BillingError = class extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
};
async function googleAccessToken(env, fetchImpl = fetch, nowMs = Date.now()) {
  let account;
  try {
    account = JSON.parse(String(env.GOOGLE_SERVICE_ACCOUNT_JSON || ""));
  } catch {
    account = null;
  }
  if (!account?.client_email || !account?.private_key) throw new BillingError("M\xE1y ch\u1EE7 ch\u01B0a c\u1EA5u h\xECnh t\xE0i kho\u1EA3n d\u1ECBch v\u1EE5 Google Play.", 503);
  const tokenUri = account.token_uri || "https://oauth2.googleapis.com/token";
  const iat = Math.floor(nowMs / 1e3);
  const header = b64url(enc.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claims = b64url(enc.encode(JSON.stringify({ iss: account.client_email, scope: SCOPE, aud: tokenUri, iat, exp: iat + 3e3 })));
  const key = await crypto.subtle.importKey("pkcs8", pemToDer(account.private_key), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(`${header}.${claims}`)));
  const assertion = `${header}.${claims}.${b64url(signature)}`;
  const response = await fetchImpl(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }).toString()
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw new BillingError("Kh\xF4ng l\u1EA5y \u0111\u01B0\u1EE3c quy\u1EC1n truy c\u1EADp Google Play.", 502);
  return data.access_token;
}
async function playCall(env, fetchImpl, accessToken, path, init = {}) {
  const response = await fetchImpl(`${API}/${encodeURIComponent(packageName(env))}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...init.headers || {} }
  });
  const text2 = await response.text();
  let data = {};
  try {
    data = text2 ? JSON.parse(text2) : {};
  } catch {
    data = {};
  }
  return { ok: response.ok, status: response.status, data };
}
async function lookupPurchase(env, { productId, purchaseToken }, fetchImpl = fetch, accessToken) {
  const token = accessToken || await googleAccessToken(env, fetchImpl);
  const result = await playCall(env, fetchImpl, token, `purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`);
  if (result.status === 400 || result.status === 404 || result.status === 410) throw new BillingError("Google Play kh\xF4ng x\xE1c nh\u1EADn giao d\u1ECBch n\xE0y.", 404);
  if (!result.ok) throw new BillingError("Kh\xF4ng ki\u1EC3m tra \u0111\u01B0\u1EE3c giao d\u1ECBch v\u1EDBi Google Play. H\xE3y th\u1EED l\u1EA1i sau.", 502);
  const data = result.data;
  const state = data.purchaseState === 0 ? "purchased" : data.purchaseState === 2 ? "pending" : "canceled";
  return {
    state,
    orderId: String(data.orderId || ""),
    acknowledged: data.acknowledgementState === 1,
    consumed: data.consumptionState === 1,
    accountId: String(data.obfuscatedExternalAccountId || ""),
    purchaseTimeMillis: Number(data.purchaseTimeMillis) || 0,
    accessToken: token
  };
}
async function acknowledgePurchase(env, { productId, purchaseToken }, fetchImpl = fetch, accessToken) {
  const token = accessToken || await googleAccessToken(env, fetchImpl);
  const result = await playCall(env, fetchImpl, token, `purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`, { method: "POST", body: "{}" });
  return result.ok;
}
async function listVoidedPurchases(env, sinceMs, fetchImpl = fetch) {
  const accessToken = await googleAccessToken(env, fetchImpl);
  const voided = [];
  let pageToken = "";
  for (let page = 0; page < 10; page++) {
    const query = new URLSearchParams({ type: "0", startTime: String(Math.max(0, Math.floor(sinceMs))), maxResults: "200", ...pageToken ? { token: pageToken } : {} });
    const result = await playCall(env, fetchImpl, accessToken, `purchases/voidedpurchases?${query.toString()}`);
    if (!result.ok) throw new BillingError("Kh\xF4ng \u0111\u1ECDc \u0111\u01B0\u1EE3c danh s\xE1ch ho\xE0n ti\u1EC1n t\u1EEB Google Play.", 502);
    for (const item of result.data.voidedPurchases || []) {
      if (item.purchaseToken) voided.push({ purchaseToken: String(item.purchaseToken), orderId: String(item.orderId || ""), voidedTimeMillis: Number(item.voidedTimeMillis) || 0 });
    }
    pageToken = result.data.tokenPagination?.nextPageToken || "";
    if (!pageToken) break;
  }
  return voided;
}

// src/index.js
var TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
var TOKEN_REFRESH_AFTER_SECONDS = 7 * 24 * 60 * 60;
var MIN_PASSWORD_LENGTH = 8;
var USERNAME_RE = /^[a-zA-Z0-9_.-]{3,24}$/;
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var MAX_JSON_BODY_BYTES = 65536;
var DEFAULT_ALLOWED_ORIGINS = Object.freeze([
  "https://localhost",
  "capacitor://localhost",
  "ionic://localhost"
]);
var edgeRateBuckets = /* @__PURE__ */ new Map();
var SECURITY_HEADERS = Object.freeze({
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "X-Permitted-Cross-Domain-Policies": "none",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
});
function corsPolicy(request, env = {}) {
  const configured = typeof env.CORS_ORIGINS === "string" ? env.CORS_ORIGINS.split(",").map((value) => value.trim()).filter(Boolean) : [];
  const allowed = /* @__PURE__ */ new Set([...DEFAULT_ALLOWED_ORIGINS, ...configured]);
  const origin = request.headers.get("Origin") || "";
  const headers = { Vary: "Origin" };
  if (!origin) return { allowed: true, headers };
  if (!allowed.has(origin)) return { allowed: false, headers };
  Object.assign(headers, {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Max-Age": "600"
  });
  return { allowed: true, headers };
}
function secureResponse(response, corsHeaders = {}, request = null) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value);
  headers.set("Cache-Control", headers.get("Cache-Control") || "no-store");
  for (const [key, value] of Object.entries(corsHeaders)) headers.set(key, value);
  try {
    if (request && new URL(request.url).protocol === "https:") headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  } catch {
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
function edgeRateLimit(request, path) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const policy = path.startsWith("/api/lichess/") ? ["lichess-proxy", 20, 6e4] : path === "/api/openings/explorer" ? ["opening-proxy", 30, 6e4] : path.startsWith("/api/puzzles/") ? ["puzzle-proxy", 30, 6e4] : ["external-proxy", 80, 6e4];
  const [name, maximum, windowMs] = policy;
  const key = `${name}:${ip}`;
  const now = Date.now();
  const recent = (edgeRateBuckets.get(key) || []).filter((timestamp) => now - timestamp < windowMs);
  if (recent.length >= maximum) return Math.max(1, Math.ceil((windowMs - (now - recent[0])) / 1e3));
  recent.push(now);
  edgeRateBuckets.set(key, recent);
  if (edgeRateBuckets.size > 5e3) {
    for (const [bucket, hits] of edgeRateBuckets) if (!hits.length || now - hits[hits.length - 1] > 36e5) edgeRateBuckets.delete(bucket);
    while (edgeRateBuckets.size > 5e3) edgeRateBuckets.delete(edgeRateBuckets.keys().next().value);
  }
  return 0;
}
var CONTROLS = Object.freeze(Object.fromEntries(RANKED_CLOCK_PRESETS.map((preset) => [preset.value, {
  category: preset.category,
  base: preset.baseSeconds * 1e3,
  increment: preset.incrementSeconds * 1e3
}])));
var nowIso = () => (/* @__PURE__ */ new Date()).toISOString();
var asText = (value, max = 120) => typeof value === "string" ? value.trim().slice(0, max) : "";
var clamp = (n, min, max) => Math.max(min, Math.min(max, n));
var defaultDb = () => ({ users: [], friendRequests: [], directMessages: [], userReports: [], purchaseRequests: [], audit: [], matches: [], rankedQueue: [], announcements: [], announcementReads: {}, userHistory: {}, rateLimits: {}, purchases: [], tournaments: [], tokenSecret: "" });
function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extraHeaders } });
}
function fail(message, status = 400) {
  return json({ error: message }, status);
}
function b64url2(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function decodeB64url(value) {
  const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
function utf8(value) {
  return new TextEncoder().encode(value);
}
function fromUtf8(bytes) {
  return new TextDecoder().decode(bytes);
}
function hex(bytes) {
  return [...bytes].map((n) => n.toString(16).padStart(2, "0")).join("");
}
function fromHex(text2) {
  const out = new Uint8Array(Math.floor(text2.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(text2.slice(i * 2, i * 2 + 2), 16);
  return out;
}
function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}
async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey("raw", utf8(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(new Uint8Array(await crypto.subtle.sign("HMAC", key, utf8(message))));
}
var PBKDF2_ITERATIONS = 1e5;
async function passwordHash(password, saltHex) {
  const key = await crypto.subtle.importKey("raw", utf8(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: fromHex(saltHex), iterations: PBKDF2_ITERATIONS }, key, 256);
  return hex(new Uint8Array(bits));
}
async function signToken(db, user) {
  const issuedAt = Math.floor(Date.now() / 1e3);
  const payload = { sub: user.id, sv: Number(user.sessionVersion) || 0, iat: issuedAt, exp: issuedAt + TOKEN_TTL_SECONDS };
  const body = b64url2(utf8(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey("raw", decodeB64url(db.tokenSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, utf8(body));
  return `${body}.${b64url2(new Uint8Array(sig))}`;
}
async function verifyToken(db, token) {
  try {
    const tokenText = String(token || "");
    if (!tokenText || tokenText.length > 4096) return null;
    const parts = tokenText.split(".");
    if (parts.length !== 2) return null;
    const key = await crypto.subtle.importKey("raw", decodeB64url(db.tokenSecret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("HMAC", key, decodeB64url(parts[1]), utf8(parts[0]));
    if (!valid) return null;
    const payload = JSON.parse(fromUtf8(decodeB64url(parts[0])));
    if (!payload.sub || !Number.isFinite(payload.exp) || payload.exp <= Date.now() / 1e3) return null;
    const user = db.users.find((item) => item.id === payload.sub);
    if (!user || user.banned || Number(payload.sv) !== (Number(user.sessionVersion) || 0)) return null;
    return { user, payload };
  } catch {
    return null;
  }
}
function ensureRatings(user) {
  const fallback = clamp(Math.round(Number(user?.elo) || 1200), 100, 4e3);
  const existing = user?.ratingsByCategory && typeof user.ratingsByCategory === "object" ? user.ratingsByCategory : {};
  const ratings = {};
  for (const category of ["bullet", "blitz", "rapid", "daily"]) {
    const n = Number(existing[category]);
    ratings[category] = Number.isFinite(n) && n >= 100 && n <= 4e3 ? Math.round(n) : fallback;
  }
  if (user) user.ratingsByCategory = ratings;
  return ratings;
}
function stableAvatarId(user) {
  const input = String(user?.id || user?.username || "vila");
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) hash = Math.imul(hash ^ input.charCodeAt(i), 16777619) >>> 0;
  return hash % 1e3;
}
function publicUser(user) {
  if (!user || typeof user !== "object") return null;
  const ratingsByCategory = ensureRatings(user);
  const avatarId = Number.isInteger(user.avatarId) && user.avatarId >= 0 && user.avatarId < 1e3 ? user.avatarId : stableAvatarId(user);
  user.avatarId = avatarId;
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarId,
    bio: user.bio || "",
    role: user.role === "admin" ? "admin" : "player",
    elo: Math.round((ratingsByCategory.bullet + ratingsByCategory.blitz + ratingsByCategory.rapid) / 3),
    ratingsByCategory,
    games: Number(user.games) || 0,
    wins: Number(user.wins) || 0,
    draws: Number(user.draws) || 0,
    losses: Number(user.losses) || 0,
    createdAt: user.createdAt,
    lastSeenAt: user.lastSeenAt || null,
    online: Boolean(user.lastSeenAt && Date.now() - Date.parse(user.lastSeenAt) < 9e4),
    banned: Boolean(user.banned),
    // Chỉ lộ việc có giấy phép hay không (không lộ mã/họ tên): bảng xếp hạng chỉ hiện người đã được admin chứng nhận.
    licensed: isLicensed(user),
    // Public badge only (never exposes payment data). Admins always show the Premium tier; expired plans fall back to 'free'.
    tier: tierOf(user)
  };
}
function tierOf(user) {
  if (!user || typeof user !== "object") return "free";
  if (user.role === "admin") return "premium";
  try {
    return effectivePlan(normalizeEntitlement(user.entitlement));
  } catch {
    return "free";
  }
}
var SUPPORT_BOT_PREFIX = "VILA Tr\u1EE3 l\xFD (bot):";
function adminsOnlineCount(db) {
  return db.users.filter((item) => item.role === "admin" && !item.banned && item.lastSeenAt && Date.now() - Date.parse(item.lastSeenAt) < 9e4).length;
}
function findSupportAdmin(db) {
  const admins = db.users.filter((item) => item.role === "admin" && !item.banned);
  if (!admins.length) return null;
  const seen = (item) => Date.parse(item.lastSeenAt || "") || 0;
  const online = (item) => Boolean(item.lastSeenAt && Date.now() - seen(item) < 9e4);
  return admins.slice().sort((a, b) => Number(online(b)) - Number(online(a)) || seen(b) - seen(a) || String(a.createdAt).localeCompare(String(b.createdAt)))[0];
}
function selfUser(user) {
  const base = publicUser(user);
  if (!base) return base;
  const entitlement = user.role === "admin" ? entitlementForClient({ premium: true }) : entitlementForClient(user.entitlement);
  const mutedUntil = untilActive(user.mutedUntil) ? user.mutedUntil : null;
  return { ...base, email: String(user.email || ""), entitlement, ...mutedUntil ? { mutedUntil, muteReason: String(user.muteReason || "") } : {} };
}
function eloDelta(playerElo, opponentElo, score, k = 24) {
  const player = clamp(Math.round(Number(playerElo) || 1200), 100, 4e3);
  const opponent = clamp(Math.round(Number(opponentElo) || 1200), 100, 4e3);
  const expected = 1 / (1 + 10 ** ((opponent - player) / 400));
  const after = clamp(player + Math.round(clamp(k, 16, 40) * (score - expected)), 100, 4e3);
  return { before: player, after, delta: after - player };
}
function matchmakingWindow(waitMs) {
  return Math.min(500, 100 + Math.floor(Math.max(0, waitMs) / 1e4) * 50);
}
function settleClock(match, now, turn) {
  if (!match.clockEnabled || !match.clockRemainingMs) return null;
  const elapsed = Math.max(0, now - (Number(match.clockUpdatedAt) || now));
  const next = Math.max(0, (Number(match.clockRemainingMs[turn]) || 0) - elapsed);
  match.clockRemainingMs[turn] = next;
  match.clockUpdatedAt = now;
  return next <= 0 ? turn : null;
}
function ratedResult(chess) {
  if (!chess.isGameOver()) return null;
  if (chess.isCheckmate()) return chess.turn() === "w" ? "0-1" : "1-0";
  return "1/2-1/2";
}
function rankedMatchById(db, id) {
  return db.matches.find((match) => match?.ranked === true && match.id === id);
}
function activeMatchFor(db, userId) {
  return db.matches.find((match) => match?.ranked === true && match.status === "active" && (match.players?.w === userId || match.players?.b === userId));
}
function makeMatchPayload(db, match, userId) {
  const color = match.players?.w === userId ? "w" : "b";
  const opponentId = color === "w" ? match.players.b : match.players.w;
  return { match: {
    id: match.id,
    ranked: true,
    status: match.status,
    startFen: match.startFen,
    fen: match.fen,
    moves: match.moves || [],
    currentPly: (match.moves || []).length,
    players: { w: publicUser(db.users.find((u) => u.id === match.players.w)), b: publicUser(db.users.find((u) => u.id === match.players.b)) },
    color,
    opponent: publicUser(db.users.find((u) => u.id === opponentId)),
    result: match.result || null,
    resultReason: match.resultReason || "",
    finishedAt: match.finishedAt || null,
    eloChanges: match.eloChanges?.[userId] || null,
    lastMoveAt: match.lastMoveAt || match.createdAt,
    timeControl: match.timeControl || "3+2",
    timeCategory: match.timeCategory || "blitz",
    clockEnabled: Boolean(match.clockEnabled),
    clockRemainingMs: match.clockRemainingMs || null,
    clockIncrementMs: Number(match.clockIncrementMs) || 0,
    clockUpdatedAt: Number(match.clockUpdatedAt) || Date.now(),
    fairPlayNotice: match.fairPlaySignals?.[userId] ? { level: match.fairPlaySignals[userId].level || "review", signals: match.fairPlaySignals[userId].signals || 0 } : null
  } };
}
function joinPayload(db, userId) {
  const active = activeMatchFor(db, userId);
  if (active) return { queued: false, ...makeMatchPayload(db, active, userId) };
  const entry = db.rankedQueue.find((item) => item.userId === userId);
  const user = db.users.find((item) => item.id === userId);
  const ratingsByCategory = user ? ensureRatings(user) : null;
  return { queued: Boolean(entry), joinedAt: entry?.joinedAt || null, waitMs: entry ? Math.max(0, Date.now() - entry.joinedAt) : 0, rating: Number(entry?.elo) || Number(user?.elo) || 1200, timeControl: entry?.timeControl || null, timeCategory: entry?.timeCategory || null, ratingsByCategory };
}
function resultScores(result) {
  return result === "1-0" ? [1, 0] : result === "0-1" ? [0, 1] : [0.5, 0.5];
}
function finishMatch(db, match, result, reason = "game_over", quitterId = "") {
  if (!match || match.status !== "active") return;
  const white = db.users.find((user) => user.id === match.players.w);
  const black = db.users.find((user) => user.id === match.players.b);
  if (!white || !black) {
    match.status = "aborted";
    match.resultReason = "player_missing";
    match.finishedAt = nowIso();
    return;
  }
  const plan = planRankedFinish({ result, reason, plyCount: (match.moves || []).length, fen: match.fen || match.startFen });
  if (plan.status === "aborted") {
    match.status = "aborted";
    match.result = null;
    match.resultReason = plan.reason;
    match.abortedFrom = plan.originalReason;
    match.finishedAt = nowIso();
    match.eloChanges = {};
    db.rankedQueue = db.rankedQueue.filter((entry) => entry.userId !== white.id && entry.userId !== black.id);
    return;
  }
  result = plan.result;
  reason = plan.reason;
  if (plan.reason === "timeout_vs_insufficient") quitterId = "";
  const [whiteScore, blackScore] = resultScores(result);
  const category = ["bullet", "blitz", "rapid", "daily"].includes(match.timeCategory) ? match.timeCategory : "blitz";
  const wr = ensureRatings(white), br = ensureRatings(black);
  const wb = wr[category], bb = br[category];
  const wc = eloDelta(wb, bb, whiteScore), bc = eloDelta(bb, wb, blackScore);
  wr[category] = Math.max(100, wc.after - (quitterId === white.id ? 15 : 0));
  br[category] = Math.max(100, bc.after - (quitterId === black.id ? 15 : 0));
  white.ratingsByCategory = wr;
  black.ratingsByCategory = br;
  white.elo = Math.round((wr.bullet + wr.blitz + wr.rapid) / 3);
  black.elo = Math.round((br.bullet + br.blitz + br.rapid) / 3);
  white.games = (Number(white.games) || 0) + 1;
  black.games = (Number(black.games) || 0) + 1;
  if (whiteScore === 1) {
    white.wins = (Number(white.wins) || 0) + 1;
    black.losses = (Number(black.losses) || 0) + 1;
  } else if (whiteScore === 0) {
    black.wins = (Number(black.wins) || 0) + 1;
    white.losses = (Number(white.losses) || 0) + 1;
  } else {
    white.draws = (Number(white.draws) || 0) + 1;
    black.draws = (Number(black.draws) || 0) + 1;
  }
  match.status = "finished";
  match.result = result;
  match.resultReason = reason;
  match.finishedAt = nowIso();
  recordMatchInTournaments(db, match);
  match.eloChanges = {
    [white.id]: { category, before: wb, after: wr[category], delta: wr[category] - wb },
    [black.id]: { category, before: bb, after: br[category], delta: br[category] - bb }
  };
  db.rankedQueue = db.rankedQueue.filter((entry) => entry.userId !== white.id && entry.userId !== black.id);
}
function audit(db, actor, action, target = "", detail = "") {
  db.audit.push({ id: crypto.randomUUID(), at: nowIso(), actor: actor || "system", action, target: String(target).slice(0, 100), detail: String(detail).slice(0, 300), source: "cloudflare-worker" });
  db.audit = db.audit.slice(-2e3);
}
var MAIL_API_URL = "https://api.resend.com/emails";
var MAIL_PER_RECIPIENT_HOURLY = 4;
var MAX_KNOWN_DEVICES = 12;
var MAX_SANCTION_HOURS = 24 * 366;
var SANCTION_SWEEP_MS = 3e4;
var RESERVED_NAME_RE = /(admin|moderator|staff|official|support|quantri|hotro)/;
function mailConfig(env) {
  const apiKey = String(env?.RESEND_API_KEY || "").trim();
  const from = String(env?.MAIL_FROM || env?.RESET_EMAIL_FROM || "").trim();
  return apiKey && from ? { apiKey, from } : null;
}
var escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
function maskEmail(email) {
  const [name = "", domain = ""] = String(email || "").split("@");
  return `${name.slice(0, 2)}${"*".repeat(Math.max(1, Math.min(6, name.length - 2)))}@${domain}`;
}
function maskIp(ip) {
  const value = String(ip || "");
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) return `${value.split(".").slice(0, 2).join(".")}.*.*`;
  if (value.includes(":")) return `${value.split(":").slice(0, 2).join(":")}:*`;
  return "kh\xF4ng r\xF5";
}
function deviceLabel(userAgent) {
  const ua = String(userAgent || "");
  const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad|iPod/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? "Windows" : /Mac OS X|Macintosh/i.test(ua) ? "macOS" : /Linux/i.test(ua) ? "Linux" : "Thi\u1EBFt b\u1ECB l\u1EA1";
  const client = /Android/i.test(ua) && /; wv\)/i.test(ua) ? "\u1EE9ng d\u1EE5ng" : /Edg\//i.test(ua) ? "Edge" : /Firefox\//i.test(ua) ? "Firefox" : /Chrome\//i.test(ua) ? "Chrome" : /Safari\//i.test(ua) ? "Safari" : "tr\xECnh duy\u1EC7t";
  return `${os} \xB7 ${client}`;
}
var mailTime = () => `${(/* @__PURE__ */ new Date()).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour12: false })} (gi\u1EDD Vi\u1EC7t Nam)`;
function normalizeName(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]/g, "");
}
var reservedName = (value) => RESERVED_NAME_RE.test(normalizeName(value));
var untilActive = (iso) => {
  const time = Date.parse(iso || "");
  return Number.isFinite(time) && time > Date.now() ? time : 0;
};
function formatRemaining(untilMs) {
  const minutes = Math.max(1, Math.ceil((untilMs - Date.now()) / 6e4));
  if (minutes < 90) return `${minutes} ph\xFAt`;
  const hours = Math.ceil(minutes / 60);
  return hours < 48 ? `${hours} gi\u1EDD` : `${Math.ceil(hours / 24)} ng\xE0y`;
}
function buildAccountMail({ to, kind, subject, heading, lines, footer = "security" }) {
  const note = footer === "ignore" ? "N\u1EBFu kh\xF4ng ph\u1EA3i b\u1EA1n, h\xE3y b\u1ECF qua email n\xE0y. \u0110\u1ECBa ch\u1EC9 email ch\u01B0a \u0111\u01B0\u1EE3c x\xE1c minh n\xEAn kh\xF4ng ai c\xF3 th\u1EC3 truy c\u1EADp d\u1EEF li\u1EC7u c\u1EE7a b\u1EA1n qua th\xF4ng b\xE1o n\xE0y." : "N\u1EBFu b\u1EA1n kh\xF4ng th\u1EF1c hi\u1EC7n thao t\xE1c n\xE0y, h\xE3y \u0111\u1ED5i m\u1EADt kh\u1EA9u ngay trong C\xE0i \u0111\u1EB7t \u203A T\xE0i kho\u1EA3n. Thao t\xE1c \u0111\xF3 s\u1EBD \u0111\u0103ng xu\u1EA5t m\u1ECDi thi\u1EBFt b\u1ECB kh\xE1c.";
  const text2 = [heading, "", ...lines, "", note, "\u2014 C\u1EDD Vua ViLa"].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#0b1220;padding:24px;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;margin:0 auto;background:#111a2e;border-radius:14px;overflow:hidden"><tr><td style="padding:18px 24px;background:#16233f;color:#f4d27a;font-size:18px;font-weight:700">\u265E C\u1EDD Vua ViLa</td></tr><tr><td style="padding:24px;color:#e6ecf8;font-size:15px;line-height:1.55"><h2 style="margin:0 0 12px;color:#ffffff;font-size:19px">${escapeHtml(heading)}</h2>${lines.map((line) => `<p style="margin:0 0 10px">${escapeHtml(line)}</p>`).join("")}<p style="margin:16px 0 0;padding-top:14px;border-top:1px solid #243452;color:#9fb0d0;font-size:13px">${escapeHtml(note)}</p></td></tr></table></body></html>`;
  return { to, kind, subject, text: text2, html };
}
async function deliverMail(env, message) {
  const config = mailConfig(env);
  if (!config) return { ok: false, skipped: true, reason: "ch\u01B0a c\u1EA5u h\xECnh" };
  try {
    const response = await fetch(MAIL_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: config.from, to: [message.to], subject: message.subject, text: message.text, html: message.html }),
      signal: AbortSignal.timeout(6e3)
    });
    return response.ok ? { ok: true } : { ok: false, reason: `HTTP ${response.status}` };
  } catch (error) {
    return { ok: false, reason: String(error?.message || error).slice(0, 80) };
  }
}
async function readBoundedText(request) {
  const contentLength = request.headers.get("Content-Length");
  const declaredLength = contentLength === null ? NaN : Number(contentLength);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BODY_BYTES) throw new Error("N\u1ED9i dung y\xEAu c\u1EA7u qu\xE1 l\u1EDBn.");
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_JSON_BODY_BYTES) {
        try {
          await reader.cancel();
        } catch {
        }
        throw new Error("N\u1ED9i dung y\xEAu c\u1EA7u qu\xE1 l\u1EDBn.");
      }
      chunks.push(value);
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
    }
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}
async function readRouteBody(request) {
  const raw = await readBoundedText(request);
  if (!raw) return {};
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("D\u1EEF li\u1EC7u JSON kh\xF4ng h\u1EE3p l\u1EC7.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("D\u1EEF li\u1EC7u JSON ph\u1EA3i l\xE0 m\u1ED9t \u0111\u1ED1i t\u01B0\u1EE3ng.");
  return value;
}
function recordsFromDb(db) {
  const records = /* @__PURE__ */ new Map();
  if (db.tokenSecret && !db.tokenSecretFromEnv) records.set("meta:tokenSecret", db.tokenSecret);
  for (const item of db.users || []) records.set(`user:${item.id}`, JSON.stringify(item));
  for (const item of db.friendRequests || []) records.set(`friend:${item.id}`, JSON.stringify(item));
  for (const item of db.directMessages || []) records.set(`message:${item.id}`, JSON.stringify(item));
  for (const item of db.userReports || []) records.set(`report:${item.id}`, JSON.stringify(item));
  for (const item of db.purchaseRequests || []) records.set(`purchase-request:${item.id}`, JSON.stringify(item));
  for (const item of db.audit || []) records.set(`audit:${item.id}`, JSON.stringify(item));
  for (const item of db.matches || []) records.set(`match:${item.id}`, JSON.stringify(item));
  for (const item of db.rankedQueue || []) records.set(`queue:${item.userId}`, JSON.stringify(item));
  for (const item of db.announcements || []) records.set(`announcement:${item.id}`, JSON.stringify(item));
  for (const [userId, ids] of Object.entries(db.announcementReads || {})) records.set(`reads:${userId}`, JSON.stringify(ids));
  for (const [userId, games] of Object.entries(db.userHistory || {})) {
    for (const game of Array.isArray(games) ? games : []) {
      const gameKey = String(game.signature || game.id || "");
      if (gameKey) records.set(`history:${userId}:${encodeURIComponent(gameKey)}`, JSON.stringify({ userId, gameKey, game }));
    }
  }
  for (const item of db.purchases || []) records.set(`purchase:${item.id}`, JSON.stringify(item));
  for (const item of db.tournaments || []) if (item?.id) records.set(`tournament:${item.id}`, JSON.stringify(item));
  for (const [key, hits] of Object.entries(db.rateLimits || {})) records.set(`rate:${encodeURIComponent(key)}`, JSON.stringify(hits));
  return records;
}
function dbFromRecords(rows) {
  const db = defaultDb();
  for (const row of rows) {
    const key = String(row.key || "");
    let value;
    try {
      value = key === "meta:tokenSecret" ? row.value : JSON.parse(row.value);
    } catch {
      continue;
    }
    if (key === "meta:tokenSecret") {
      db.tokenSecret = value;
      continue;
    }
    if (key.startsWith("user:")) db.users.push(value);
    else if (key.startsWith("friend:")) db.friendRequests.push(value);
    else if (key.startsWith("message:")) db.directMessages.push(value);
    else if (key.startsWith("report:")) db.userReports.push(value);
    else if (key.startsWith("purchase-request:")) db.purchaseRequests.push(value);
    else if (key.startsWith("audit:")) db.audit.push(value);
    else if (key.startsWith("match:")) db.matches.push(value);
    else if (key.startsWith("queue:")) db.rankedQueue.push(value);
    else if (key.startsWith("announcement:")) db.announcements.push(value);
    else if (key.startsWith("purchase:")) db.purchases.push(value);
    else if (key.startsWith("tournament:")) {
      const t = normalizeTournament(value);
      if (t) db.tournaments.push(t);
    } else if (key.startsWith("reads:")) db.announcementReads[key.slice("reads:".length)] = value;
    else if (key.startsWith("history:")) {
      if (!db.userHistory[value.userId]) db.userHistory[value.userId] = [];
      db.userHistory[value.userId].push(value.game);
    } else if (key.startsWith("rate:")) db.rateLimits[decodeURIComponent(key.slice("rate:".length))] = value;
  }
  db.directMessages.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  db.userReports.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  db.purchaseRequests.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  db.audit.sort((a, b) => String(a.at).localeCompare(String(b.at)));
  db.matches.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  db.announcements.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  for (const games of Object.values(db.userHistory)) {
    if (Array.isArray(games)) games.sort((a, b) => new Date(b?.date || 0) - new Date(a?.date || 0));
  }
  return db;
}
async function readExternalBody(request) {
  try {
    const raw = await readBoundedText(request);
    if (!raw) return {};
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("D\u1EEF li\u1EC7u JSON ph\u1EA3i l\xE0 m\u1ED9t \u0111\u1ED1i t\u01B0\u1EE3ng.");
    return value;
  } catch (error) {
    throw new Error(error?.message === "N\u1ED9i dung y\xEAu c\u1EA7u qu\xE1 l\u1EDBn." ? error.message : "D\u1EEF li\u1EC7u JSON kh\xF4ng h\u1EE3p l\u1EC7.");
  }
}
function withCors(response, cors, request) {
  return secureResponse(response, cors, request);
}
function validUciList(value) {
  const moves = asText(value, 1e3).split(",").filter(Boolean).slice(0, 40);
  if (moves.some((move) => !/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(move))) return null;
  return moves;
}
async function externalApi(request, url) {
  const path = url.pathname;
  if (path === "/api/openings/explorer" && request.method === "GET") {
    const moves = validUciList(url.searchParams.get("moves") || "");
    if (!moves) return fail("Danh s\xE1ch n\u01B0\u1EDBc UCI kh\xF4ng h\u1EE3p l\u1EC7.");
    const upstreamUrl = new URL("https://explorer.lichess.ovh/lichess");
    upstreamUrl.searchParams.set("variant", "standard");
    upstreamUrl.searchParams.set("speeds[]", "blitz");
    upstreamUrl.searchParams.set("ratings[]", "1600");
    upstreamUrl.searchParams.set("moves", moves.join(","));
    try {
      const upstream = await fetch(upstreamUrl, { headers: { Accept: "application/json", "User-Agent": "ViLa-Chess/3.69.1" }, signal: AbortSignal.timeout(2e4) });
      const raw = await upstream.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = {};
      }
      if (!upstream.ok) return fail(data?.error || `Opening Explorer HTTP ${upstream.status}`, upstream.status);
      return json(data, 200, { "Cache-Control": "public, max-age=60" });
    } catch (error) {
      return fail(`Kh\xF4ng l\u1EA5y \u0111\u01B0\u1EE3c d\u1EEF li\u1EC7u khai cu\u1ED9c: ${String(error?.message || error).slice(0, 220)}`, 502);
    }
  }
  if (/^\/api\/puzzles\/(next|daily)$/.test(path) && request.method === "GET") {
    const daily = path.endsWith("/daily");
    const bandValue = url.searchParams.get("difficulty") || "normal";
    const difficulty = ["easiest", "easier", "normal", "harder", "hardest"].includes(bandValue) ? bandValue : "normal";
    const upstreamUrl = daily ? "https://lichess.org/api/puzzle/daily" : `https://lichess.org/api/puzzle/next?difficulty=${encodeURIComponent(difficulty)}`;
    try {
      const upstream = await fetch(upstreamUrl, { headers: { Accept: "application/json", "User-Agent": "ViLa-Chess/3.69.1 puzzle-proxy" }, signal: AbortSignal.timeout(12e3) });
      const raw = await upstream.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = {};
      }
      if (!upstream.ok) return fail(data?.error || `Lichess puzzle HTTP ${upstream.status}`, upstream.status);
      if (!data?.puzzle?.id || !data?.game?.pgn || !Array.isArray(data?.puzzle?.solution)) return fail("Lichess tr\u1EA3 v\u1EC1 d\u1EEF li\u1EC7u c\xE2u \u0111\u1ED1 ch\u01B0a \u0111\u1EA7y \u0111\u1EE7.", 502);
      return json(data, 200, { "Cache-Control": daily ? "public, max-age=300" : "no-store" });
    } catch (error) {
      return fail(`Kh\xF4ng l\u1EA5y \u0111\u01B0\u1EE3c c\xE2u \u0111\u1ED1 Lichess: ${String(error?.message || error).slice(0, 220)}`, 502);
    }
  }
  if (!path.startsWith("/api/lichess/")) return fail("Kh\xF4ng t\xECm th\u1EA5y API.", 404);
  if (!["POST"].includes(request.method)) return fail("Ph\u01B0\u01A1ng th\u1EE9c kh\xF4ng \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3.", 405);
  let body;
  try {
    body = await readExternalBody(request);
  } catch (error) {
    return fail(error.message || "D\u1EEF li\u1EC7u JSON kh\xF4ng h\u1EE3p l\u1EC7.", 400);
  }
  const token = asText(body.token, 4e3);
  if (!token) return fail("H\xE3y nh\u1EADp Lichess personal access token trong m\u1EE5c Lichess.", 400);
  const apiMode = body.apiMode === "bot" ? "bot" : "board";
  let pathname = "";
  let form = null;
  let method = "GET";
  let accept = "application/json";
  if (path === "/api/lichess/account") pathname = "/api/account";
  else if (path === "/api/lichess/challenge-ai") {
    const level = clamp(Number(body.level || 3), 1, 8);
    const limit = clamp(Number(body.clockLimit || 300), 0, 10800);
    const increment = clamp(Number(body.clockIncrement || 0), 0, 180);
    form = new URLSearchParams({ level: String(level), "clock.limit": String(limit), "clock.increment": String(increment), color: ["white", "black", "random"].includes(body.color) ? body.color : "random" });
    pathname = "/api/challenge/ai";
    method = "POST";
  } else if (path === "/api/lichess/challenge-user") {
    const username = asText(body.username, 80).replace(/^@/, "");
    if (!/^[a-zA-Z0-9_-]{2,30}$/.test(username)) return fail("T\xEAn ng\u01B0\u1EDDi ch\u01A1i Lichess kh\xF4ng h\u1EE3p l\u1EC7.");
    const limit = clamp(Number(body.clockLimit || 300), 0, 10800);
    const increment = clamp(Number(body.clockIncrement || 0), 0, 180);
    form = new URLSearchParams({ rated: "false", "clock.limit": String(limit), "clock.increment": String(increment), color: ["white", "black", "random"].includes(body.color) ? body.color : "random", variant: "standard" });
    pathname = `/api/challenge/${encodeURIComponent(username)}`;
    method = "POST";
  } else if (path === "/api/lichess/move") {
    const gameId = asText(body.gameId, 100), move = asText(body.move, 10);
    if (!/^[a-zA-Z0-9]{8}$/.test(gameId)) return fail("M\xE3 v\xE1n Lichess kh\xF4ng h\u1EE3p l\u1EC7.");
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(move)) return fail("N\u01B0\u1EDBc \u0111i ph\u1EA3i \u1EDF \u0111\u1ECBnh d\u1EA1ng UCI, v\xED d\u1EE5 e2e4.");
    pathname = apiMode === "bot" ? `/api/bot/game/${gameId}/move/${move}` : `/api/board/game/${gameId}/move/${move}`;
    method = "POST";
    form = new URLSearchParams();
  } else if (path === "/api/lichess/stream") {
    const gameId = asText(body.gameId, 100);
    if (!/^[a-zA-Z0-9]{8}$/.test(gameId)) return fail("M\xE3 v\xE1n Lichess kh\xF4ng h\u1EE3p l\u1EC7.");
    pathname = apiMode === "bot" ? `/api/bot/game/stream/${gameId}` : `/api/board/game/stream/${gameId}`;
    accept = "application/x-ndjson";
  } else return fail("Kh\xF4ng t\xECm th\u1EA5y API Lichess.", 404);
  try {
    const upstream = await fetch(`https://lichess.org${pathname}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, Accept: accept, ...method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {} },
      ...method === "POST" ? { body: form.toString() } : {},
      ...path === "/api/lichess/stream" ? { signal: request.signal } : { signal: AbortSignal.timeout(25e3) }
    });
    if (path === "/api/lichess/stream") {
      if (!upstream.ok || !upstream.body) {
        const message = (await upstream.text().catch(() => "Lichess kh\xF4ng m\u1EDF \u0111\u01B0\u1EE3c lu\u1ED3ng v\xE1n c\u1EDD.")).slice(0, 500);
        return fail(message || `Lichess HTTP ${upstream.status}`, upstream.status || 502);
      }
      return new Response(upstream.body, { status: upstream.status, headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
    }
    const raw = await upstream.text();
    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = {};
    }
    if (!upstream.ok) return fail(data?.error || raw || `Lichess HTTP ${upstream.status}`, upstream.status);
    if (path === "/api/lichess/account") return json({ id: data.id, username: data.username, title: data.title || "", perfs: data.perfs || {} });
    if (path === "/api/lichess/challenge-ai") return json({ id: data.id, url: data.url, color: data.color, status: data.status, raw: data });
    if (path === "/api/lichess/challenge-user") return json({ id: data.challenge?.id || data.id, url: data.challenge?.url || data.url, status: data.challenge?.status || data.status, raw: data });
    return json({ ok: true, response: raw });
  } catch (error) {
    return fail(`Kh\xF4ng k\u1EBFt n\u1ED1i \u0111\u01B0\u1EE3c Lichess: ${String(error?.message || error).slice(0, 220)}`, 502);
  }
}
var index_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsPolicyResult = corsPolicy(request, env);
    const cors = corsPolicyResult.headers;
    if (request.method === "OPTIONS") {
      if (!corsPolicyResult.allowed) return secureResponse(fail("Origin ch\u01B0a \u0111\u01B0\u1EE3c cho ph\xE9p.", 403), cors, request);
      return secureResponse(new Response(null, { status: 204 }), cors, request);
    }
    if (request.headers.has("Origin") && !corsPolicyResult.allowed) {
      return secureResponse(fail("Origin ch\u01B0a \u0111\u01B0\u1EE3c cho ph\xE9p.", 403), cors, request);
    }
    if (url.pathname === "/" || url.pathname === "/api/health") {
      return secureResponse(json({ ok: true, app: "C\u1EDD Vua ViLa", version: "3.69.1-secure-patch", service: "cloudflare-durable-object", capabilities: ["ranked-online", "social-accounts", "persistent-storage", "persistent-messenger", "admin-purchase-queue", "support-admin-lookup", "offline-admin-bot", "plan-tier-badges", "rate-limited-plan-requests", "server-authoritative-chess", "session-revocation", "security-headers", "origin-allowlist", "abuse-rate-limits", "lichess-proxy", "opening-explorer", "puzzle-proxy"] }, 200), cors, request);
    }
    const isExternalProxy = url.pathname.startsWith("/api/lichess/") || url.pathname === "/api/openings/explorer" || /^\/api\/puzzles\/(next|daily)$/.test(url.pathname);
    if (isExternalProxy) {
      const retryAfter = edgeRateLimit(request, url.pathname);
      if (retryAfter) return secureResponse(json({ error: "Qu\xE1 nhi\u1EC1u y\xEAu c\u1EA7u t\u1EDBi d\u1ECBch v\u1EE5 t\xEDch h\u1EE3p. H\xE3y th\u1EED l\u1EA1i sau.", retryAfterSeconds: retryAfter }, 429, { "Retry-After": String(retryAfter) }), cors, request);
      try {
        return withCors(await externalApi(request, url), cors, request);
      } catch (error) {
        return withCors(fail("D\u1ECBch v\u1EE5 t\xEDch h\u1EE3p g\u1EB7p l\u1ED7i n\u1ED9i b\u1ED9.", 500), cors, request);
      }
    }
    if (!url.pathname.startsWith("/api/social")) return secureResponse(json({ error: "Kh\xF4ng t\xECm th\u1EA5y API." }, 404), cors, request);
    if (!env?.CHESS_STATE) return secureResponse(json({ error: "M\xE1y ch\u1EE7 c\u1ED9ng \u0111\u1ED3ng ch\u01B0a \u0111\u01B0\u1EE3c c\u1EA5u h\xECnh.", code: "BACKEND_NOT_CONFIGURED" }, 503), cors, request);
    const id = env.CHESS_STATE.idFromName("vila-global-community-v1");
    const stub = env.CHESS_STATE.get(id);
    return withCors(await stub.fetch(request), cors, request);
  },
  /** Cron (see wrangler.toml): revoke plans for purchases Google has refunded. */
  async scheduled(_event, env) {
    if (!billingConfigured(env)) return;
    const stub = env.CHESS_STATE.get(env.CHESS_STATE.idFromName("vila-global-community-v1"));
    await stub.fetch(new Request("https://vila-internal.invalid/__cron/sync-voided", { method: "POST", body: "{}" }));
  }
};
var ChessState = class {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.serial = Promise.resolve();
    this.outbox = [];
    this.ready = state.blockConcurrencyWhile(async () => {
      const sql = state.storage.sql;
      sql.exec("CREATE TABLE IF NOT EXISTS vila_records (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)");
      const rows = Array.from(sql.exec("SELECT key, value FROM vila_records"));
      this.db = dbFromRecords(rows);
      for (const [key, fallback] of Object.entries({ users: [], friendRequests: [], directMessages: [], userReports: [], purchaseRequests: [], audit: [], matches: [], rankedQueue: [], announcements: [], announcementReads: {}, userHistory: {}, rateLimits: {}, purchases: [], tournaments: [] })) {
        if (this.db[key] === void 0 || this.db[key] === null) this.db[key] = fallback;
      }
      const original = new Map(rows.map((row) => [String(row.key), String(row.value)]));
      const envSecret = String(this.env.TOKEN_SECRET || "").trim();
      let envSecretOk = false;
      try {
        envSecretOk = envSecret.length > 0 && decodeB64url(envSecret).length >= 32;
      } catch {
        envSecretOk = false;
      }
      if (envSecretOk) {
        this.db.tokenSecret = envSecret;
        Object.defineProperty(this.db, "tokenSecretFromEnv", { value: true, enumerable: false, writable: true, configurable: true });
      } else if (!this.db.tokenSecret || decodeB64url(this.db.tokenSecret).length < 32) this.db.tokenSecret = b64url2(crypto.getRandomValues(new Uint8Array(48)));
      await this.bootstrapAdmin();
      await this.commitDiff(original, recordsFromDb(this.db));
    });
  }
  async commitDiff(before, after) {
    const sql = this.state.storage.sql;
    const updates = [];
    const removals = [];
    for (const [key, value] of after) if (before.get(key) !== value) updates.push([key, value]);
    for (const key of before.keys()) if (!after.has(key)) removals.push(key);
    if (!updates.length && !removals.length) return;
    this.state.storage.transactionSync(() => {
      for (const [key, value] of updates) sql.exec("INSERT INTO vila_records (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", key, value);
      for (const key of removals) sql.exec("DELETE FROM vila_records WHERE key = ?", key);
    });
  }
  async bootstrapAdmin() {
    const username = asText(this.env.ADMIN_USERNAME, 24).toLowerCase();
    const password = String(this.env.ADMIN_PASSWORD || "");
    this.adminStatus = "ok";
    if (!username || !password) {
      this.adminStatus = "missing-secrets: \u0111\u1EB7t ADMIN_USERNAME v\xE0 ADMIN_PASSWORD trong Settings \u2192 Variables and Secrets";
      return;
    }
    if (!USERNAME_RE.test(username)) {
      this.adminStatus = "bad-username: ADMIN_USERNAME ph\u1EA3i d\xE0i 3\u201324 k\xFD t\u1EF1 (ch\u1EEF, s\u1ED1, . _ -)";
      return;
    }
    if (password.length < 14) {
      this.adminStatus = "weak-password: ADMIN_PASSWORD ph\u1EA3i t\u1EEB 14 k\xFD t\u1EF1 tr\u1EDF l\xEAn";
      return;
    }
    let user = this.db.users.find((item) => item.username.toLowerCase() === username);
    if (!user) {
      const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
      const hash = await passwordHash(password, salt);
      const elo = clamp(Math.round(Number(this.env.ADMIN_INITIAL_ELO) || 3200), 100, 4e3);
      user = { id: crypto.randomUUID(), username, displayName: username, email: "", avatarId: Math.floor(Math.random() * 1e3), salt, passwordHash: hash, sessionVersion: 0, role: "admin", elo, ratingsByCategory: { bullet: elo, blitz: elo, rapid: elo, daily: elo }, bio: "", games: 0, wins: 0, draws: 0, losses: 0, banned: false, createdAt: nowIso(), lastSeenAt: null };
      this.db.users.push(user);
      audit(this.db, "system", "admin_bootstrapped", user.id, "Cloudflare environment secret");
    } else if (user.role !== "admin") {
      user.role = "admin";
    }
  }
  fetch(request) {
    const task = this.serial.then(() => this.handle(request));
    this.serial = task.then(() => void 0, () => void 0);
    return task;
  }
  async handle(request) {
    await this.ready;
    if (!this.db.users.some((item) => item.role === "admin") && this.env.ADMIN_USERNAME && this.env.ADMIN_PASSWORD && Date.now() - (this.lastAdminBootstrapTry || 0) > 15e3) {
      this.lastAdminBootstrapTry = Date.now();
      const beforeBootstrap = recordsFromDb(this.db);
      await this.bootstrapAdmin();
      await this.commitDiff(beforeBootstrap, recordsFromDb(this.db));
    }
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const path = url.pathname.startsWith("/api/social") ? url.pathname.slice("/api/social".length) || "/" : url.pathname;
    if (method === "GET" && path === "/health") return json({ ok: true, service: "C\u1EDD Vua ViLa social", status: "online", storage: "durable-object", admin: { ready: this.db.users.some((item) => item.role === "admin" && !item.banned), bootstrap: this.adminStatus || "unknown" }, mail: mailConfig(this.env) ? "configured" : "not-configured", timestamp: nowIso() });
    if (path !== "/" && !path.startsWith("/")) return fail("\u0110\u01B0\u1EDDng d\u1EABn kh\xF4ng h\u1EE3p l\u1EC7.", 404);
    const before = recordsFromDb(this.db);
    this.refreshSanctions();
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const meta = { ip, userAgent: (request.headers.get("User-Agent") || "").slice(0, 300), country: (request.headers.get("CF-IPCountry") || "").slice(0, 2) };
    const rateError = this.rateLimit(ip, path, method);
    if (rateError) {
      await this.commitDiff(before, recordsFromDb(this.db));
      return fail(rateError, 429);
    }
    let body = {};
    if (["POST", "PATCH", "PUT"].includes(method)) {
      try {
        body = await readRouteBody(request);
      } catch (error) {
        await this.commitDiff(before, recordsFromDb(this.db));
        return fail(error.message || "D\u1EEF li\u1EC7u kh\xF4ng h\u1EE3p l\u1EC7.", 400);
      }
    }
    const authHeader = request.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const auth = token ? await verifyToken(this.db, token) : null;
    const user = auth?.user || null;
    const params = path.split("/").filter(Boolean).map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    });
    let response;
    try {
      response = await this.route({ method, path, params, query: url.searchParams, body, user, auth, token, meta, internal: !url.pathname.startsWith("/api/social") });
    } catch (error) {
      console.error("[VILA security] Unhandled backend route error:", String(error?.message || error).slice(0, 240));
      response = fail("L\u1ED7i m\xE1y ch\u1EE7 n\u1ED9i b\u1ED9. Vui l\xF2ng th\u1EED l\u1EA1i sau.", 500);
    }
    await this.commitDiff(before, recordsFromDb(this.db));
    this.flushOutbox();
    return response;
  }
  rateLimit(ip, path, method) {
    const now = Date.now();
    const policies = [["all", 300, 6e4]];
    if (method === "POST" && path === "/auth/register") policies.push(["register", 20, 36e5]);
    if (method === "POST" && path === "/auth/login") policies.push(["login", 40, 9e5]);
    if (method === "POST" && path === "/auth/forgot-password") policies.push(["password-recovery", 8, 36e5]);
    if (method === "POST" && path === "/auth/reset-password") policies.push(["password-reset", 8, 9e5]);
    if (method === "PATCH" && path === "/account/password") policies.push(["password-change", 8, 9e5]);
    if (method === "PATCH" && path.startsWith("/account/")) policies.push(["account", 15, 9e5]);
    if (method === "POST" && path.startsWith("/messages/")) policies.push(["direct-message", 40, 6e4]);
    if (method === "POST" && path === "/me/purchase-requests") policies.push(["purchase-request", 8, 36e5]);
    if (method === "POST" && path === "/me/redeem-code") policies.push(["trial-code", 5, 9e5]);
    if (method === "POST" && /^\/users\/[^/]+\/report$/.test(path)) policies.push(["user-report", 8, 9e5]);
    if (path.startsWith("/me/purchase") || path === "/me/billing-config") policies.push(["purchase", 40, 36e5]);
    if (path.startsWith("/ranked/")) policies.push(["ranked", 120, 6e4]);
    if (path.startsWith("/team/")) policies.push(["team", 20, 6e4]);
    for (const [name, max, span] of policies) {
      const key = `${name}:${ip}`;
      const recent = (Array.isArray(this.db.rateLimits[key]) ? this.db.rateLimits[key] : []).filter((time) => now - time < span);
      if (recent.length >= max) return "B\u1EA1n thao t\xE1c qu\xE1 nhanh. H\xE3y th\u1EED l\u1EA1i sau.";
      recent.push(now);
      this.db.rateLimits[key] = recent;
    }
    for (const entry of Object.keys(this.db.rateLimits)) {
      const hits = this.db.rateLimits[entry];
      if (!Array.isArray(hits) || !hits.length || now - hits[hits.length - 1] > 36e5) delete this.db.rateLimits[entry];
    }
    const limitEntries = Object.entries(this.db.rateLimits);
    if (limitEntries.length > 1e4) {
      limitEntries.sort((a, b) => (Number(a[1]?.[a[1].length - 1]) || 0) - (Number(b[1]?.[b[1].length - 1]) || 0));
      for (const [key] of limitEntries.slice(0, limitEntries.length - 8e3)) delete this.db.rateLimits[key];
    }
    return "";
  }
  /** Queue an account e-mail. Per-recipient cap stops the form from being used to spam someone's inbox. */
  async queueMail(to, kind, { subject, heading, lines, footer }) {
    const address = asText(to, 254).toLowerCase();
    if (!EMAIL_RE.test(address) || !mailConfig(this.env)) return false;
    const key = `mail:${(await sha256Hex(address)).slice(0, 24)}`;
    const now = Date.now();
    const recent = (Array.isArray(this.db.rateLimits[key]) ? this.db.rateLimits[key] : []).filter((time) => now - time < 36e5);
    if (recent.length >= MAIL_PER_RECIPIENT_HOURLY) {
      this.db.rateLimits[key] = recent;
      audit(this.db, "system", "email_throttled", key.slice(-8), kind);
      return false;
    }
    recent.push(now);
    this.db.rateLimits[key] = recent;
    this.outbox.push(buildAccountMail({ to: address, kind, subject, heading, lines, footer }));
    return true;
  }
  /** Sends queued mail after the database change is persisted; failures are logged, never surfaced to the player. */
  flushOutbox() {
    const queued = this.outbox.splice(0);
    if (!queued.length) return;
    const task = Promise.allSettled(queued.map(async (message) => {
      const result = await deliverMail(this.env, message);
      if (!result.ok && !result.skipped) console.error("[VILA mail] delivery failed:", message.kind, result.reason);
    }));
    this.lastMailTask = task;
    try {
      this.state.waitUntil?.(task);
    } catch {
    }
  }
  /** Remember the device a player signs in from (hash + coarse label only, no IP). isNew is false for the very first device. */
  async recordDevice(user, meta = {}) {
    const label = deviceLabel(meta.userAgent);
    const country = String(meta.country || "").slice(0, 2).toUpperCase();
    const id = (await sha256Hex(`${label}|${country}`)).slice(0, 16);
    if (!Array.isArray(user.knownDevices)) user.knownDevices = [];
    const now = nowIso();
    const existing = user.knownDevices.find((item) => item.id === id);
    if (existing) {
      existing.lastSeenAt = now;
      return { isNew: false, label, country };
    }
    const first = user.knownDevices.length === 0;
    user.knownDevices.push({ id, label, country, firstSeenAt: now, lastSeenAt: now });
    if (user.knownDevices.length > MAX_KNOWN_DEVICES) user.knownDevices.splice(0, user.knownDevices.length - MAX_KNOWN_DEVICES);
    return { isNew: !first, label, country };
  }
  /** Expire temporary bans and mutes (at most every 30 s). Must run after the persistence snapshot is taken. */
  refreshSanctions() {
    const now = Date.now();
    if (now - (this.lastSanctionSweep || 0) < SANCTION_SWEEP_MS) return;
    this.lastSanctionSweep = now;
    for (const item of this.db.users) {
      if (item.banned && item.bannedUntil && !untilActive(item.bannedUntil)) {
        item.banned = false;
        item.banReason = "";
        item.bannedAt = null;
        item.bannedUntil = null;
        audit(this.db, "system", "user_ban_expired", item.id, "temporary suspension ended");
      }
      if (item.mutedUntil && !untilActive(item.mutedUntil)) {
        item.mutedUntil = null;
        item.muteReason = "";
        audit(this.db, "system", "user_mute_expired", item.id, "mute ended");
      }
    }
  }
  muteGuard(user) {
    const until = untilActive(user.mutedUntil);
    if (!until) return null;
    return fail(`B\u1EA1n \u0111ang b\u1ECB h\u1EA1n ch\u1EBF nh\u1EAFn tin v\xE0 k\u1EBFt b\u1EA1n${user.muteReason ? ` (${user.muteReason})` : ""}. C\xF2n kho\u1EA3ng ${formatRemaining(until)}. B\u1EA1n v\u1EABn c\xF3 th\u1EC3 nh\u1EAFn cho qu\u1EA3n tr\u1ECB vi\xEAn \u0111\u1EC3 khi\u1EBFu n\u1EA1i.`, 403);
  }
  /** Per-account sliding window (the IP limits above can be bypassed by rotating addresses). Returns false when over the limit. */
  userRate(user, name, max, spanMs) {
    const key = `u:${name}:${user.id}`;
    const now = Date.now();
    const recent = (Array.isArray(this.db.rateLimits[key]) ? this.db.rateLimits[key] : []).filter((time) => now - time < spanMs);
    if (recent.length >= max) {
      this.db.rateLimits[key] = recent;
      return false;
    }
    recent.push(now);
    this.db.rateLimits[key] = recent;
    return true;
  }
  /** Three strikes within an hour mute the account for 30 minutes automatically (admins are exempt). */
  addStrike(user, kind) {
    const now = Date.now();
    const strikes = (Array.isArray(user.abuseStrikes) ? user.abuseStrikes : []).filter((item) => now - item.at < 36e5);
    strikes.push({ at: now, kind });
    user.abuseStrikes = strikes.slice(-10);
    audit(this.db, user.id, "abuse_strike", user.id, kind);
    if (user.role !== "admin" && strikes.length >= 3 && !untilActive(user.mutedUntil)) {
      user.mutedUntil = new Date(now + 30 * 6e4).toISOString();
      user.muteReason = "T\u1EF1 \u0111\u1ED9ng: thao t\xE1c qu\xE1 nhanh nhi\u1EC1u l\u1EA7n";
      user.abuseStrikes = [];
      audit(this.db, "system", "auto_mute", user.id, `${kind}; 30 minutes`);
    }
  }
  needUser(user) {
    return user ? null : fail("B\u1EA1n c\u1EA7n \u0111\u0103ng nh\u1EADp l\u1EA1i \u0111\u1EC3 ti\u1EBFp t\u1EE5c.", 401);
  }
  async route(ctx) {
    const { method, path, params, query, body, user, auth, internal } = ctx;
    const meta = ctx.meta || {};
    if (method === "GET" && path === "/") return json({ ok: true, service: "ViLa social API" });
    if (method === "POST" && path === "/auth/register") {
      const username = asText(body.username, 24).toLowerCase();
      const displayName = asText(body.displayName || username, 40);
      const email = asText(body.email, 254).toLowerCase();
      const password = String(body.password || "");
      if (!USERNAME_RE.test(username)) return fail("T\xEAn t\xE0i kho\u1EA3n d\xE0i 3\u201324 k\xFD t\u1EF1, ch\u1EC9 g\u1ED3m ch\u1EEF, s\u1ED1, d\u1EA5u ch\u1EA5m, g\u1EA1ch d\u01B0\u1EDBi ho\u1EB7c g\u1EA1ch ngang.");
      if (displayName.length < 2) return fail("T\xEAn hi\u1EC3n th\u1ECB c\u1EA7n \xEDt nh\u1EA5t 2 k\xFD t\u1EF1.");
      if (reservedName(username) || reservedName(displayName)) return fail("T\xEAn n\xE0y d\u1EC5 b\u1ECB nh\u1EA7m v\u1EDBi qu\u1EA3n tr\u1ECB vi\xEAn/h\u1ED7 tr\u1EE3. H\xE3y ch\u1ECDn t\xEAn kh\xE1c.");
      if (password.length < MIN_PASSWORD_LENGTH || password.length > 256) return fail(`M\u1EADt kh\u1EA9u c\u1EA7n d\xE0i t\u1EEB ${MIN_PASSWORD_LENGTH} \u0111\u1EBFn 256 k\xFD t\u1EF1.`);
      if (email && !EMAIL_RE.test(email)) return fail("Email kh\xF4ng h\u1EE3p l\u1EC7 (c\xF3 th\u1EC3 b\u1ECF tr\u1ED1ng).");
      if (this.db.users.some((item) => item.username.toLowerCase() === username)) return fail("T\xEAn t\xE0i kho\u1EA3n \u0111\xE3 \u0111\u01B0\u1EE3c s\u1EED d\u1EE5ng.", 409);
      if (email && this.db.users.some((item) => String(item.email || "").toLowerCase() === email)) return fail("Email n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c d\xF9ng cho t\xE0i kho\u1EA3n kh\xE1c.", 409);
      if (this.db.users.some((item) => String(item.displayName || "").toLowerCase() === displayName.toLowerCase())) return fail("Bi\u1EC7t danh n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c d\xF9ng. H\xE3y ch\u1ECDn bi\u1EC7t danh kh\xE1c.", 409);
      const choices = [200, 500, 1e3, 1500];
      const elo = choices.includes(Number(body.initialElo)) ? Number(body.initialElo) : 500;
      const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
      const hash = await passwordHash(password, salt);
      const duplicate = this.db.users.some((item) => item.username.toLowerCase() === username || email && String(item.email || "").toLowerCase() === email || String(item.displayName || "").toLowerCase() === displayName.toLowerCase());
      if (duplicate) return fail("T\xEAn t\xE0i kho\u1EA3n, email ho\u1EB7c bi\u1EC7t danh \u0111\xE3 \u0111\u01B0\u1EE3c s\u1EED d\u1EE5ng.", 409);
      const user2 = { id: crypto.randomUUID(), username, displayName, email, avatarId: this.chooseAvatarId(), skillTierElo: elo, ratingsByCategory: { bullet: elo, blitz: elo, rapid: elo, daily: elo }, bio: "", salt, passwordHash: hash, sessionVersion: 0, role: "player", elo, games: 0, wins: 0, draws: 0, losses: 0, banned: false, createdAt: nowIso(), lastSeenAt: nowIso() };
      this.db.users.push(user2);
      audit(this.db, user2.id, "account_registered", user2.id, "cloud account");
      await this.recordDevice(user2, meta);
      if (email) await this.queueMail(email, "welcome", { subject: "C\u1EDD Vua ViLa \u2014 t\xE0i kho\u1EA3n \u0111\xE3 li\xEAn k\u1EBFt v\u1EDBi email n\xE0y", heading: "Ch\xE0o m\u1EEBng b\u1EA1n \u0111\u1EBFn C\u1EDD Vua ViLa", footer: "ignore", lines: [`T\xE0i kho\u1EA3n @${username} v\u1EEBa \u0111\u01B0\u1EE3c t\u1EA1o v\xE0 li\xEAn k\u1EBFt v\u1EDBi \u0111\u1ECBa ch\u1EC9 email n\xE0y.`, "ViLa s\u1EBD g\u1EEDi th\xF4ng b\xE1o b\u1EA3o m\u1EADt v\u1EC1 \u0111\xE2y: \u0111\u0103ng nh\u1EADp t\u1EEB thi\u1EBFt b\u1ECB m\u1EDBi, \u0111\u1ED5i m\u1EADt kh\u1EA9u, thay \u0111\u1ED5i email.", `Th\u1EDDi \u0111i\u1EC3m: ${mailTime()}`] });
      return json({ token: await signToken(this.db, user2), user: selfUser(user2) }, 201);
    }
    if (method === "POST" && path === "/auth/login") {
      const identity = asText(body.username || body.identity, 254).toLowerCase();
      const password = String(body.password || "");
      if (!identity || !password || password.length > 256) return fail("Nh\u1EADp t\xEAn \u0111\u0103ng nh\u1EADp v\xE0 m\u1EADt kh\u1EA9u.");
      const identityBucket = `identity-login:${await sha256Hex(identity)}`;
      const now = Date.now();
      const previousAttempts = (Array.isArray(this.db.rateLimits[identityBucket]) ? this.db.rateLimits[identityBucket] : []).filter((time) => now - time < 15 * 6e4);
      const identityThrottled = previousAttempts.length >= 10;
      const found = this.db.users.find((item) => item.username.toLowerCase() === identity || item.email && item.email.toLowerCase() === identity || String(item.displayName || "").toLowerCase() === identity);
      const dummySalt = "00112233445566778899aabbccddeeff";
      const candidate = await passwordHash(password, found?.salt || dummySalt);
      if (!found || !constantTimeEqual(candidate, found.passwordHash || "")) {
        if (identityThrottled) {
          audit(this.db, "system", "login_identity_throttled", identityBucket.slice(-16), "additional failed attempt blocked; identity hash prefix only");
          return json({ error: "Qu\xE1 nhi\u1EC1u l\u1EA7n th\u1EED \u0111\u0103ng nh\u1EADp cho t\xE0i kho\u1EA3n n\xE0y. H\xE3y th\u1EED l\u1EA1i sau 15 ph\xFAt." }, 429, { "Retry-After": "900" });
        }
        previousAttempts.push(now);
        this.db.rateLimits[identityBucket] = previousAttempts;
        audit(this.db, "anonymous", "login_failed", identityBucket.slice(-16), "invalid credentials; identity hash prefix only");
        if (previousAttempts.length >= 10) return json({ error: "Qu\xE1 nhi\u1EC1u l\u1EA7n th\u1EED \u0111\u0103ng nh\u1EADp cho t\xE0i kho\u1EA3n n\xE0y. H\xE3y th\u1EED l\u1EA1i sau 15 ph\xFAt." }, 429, { "Retry-After": "900" });
        return fail("T\xEAn \u0111\u0103ng nh\u1EADp/email ho\u1EB7c m\u1EADt kh\u1EA9u kh\xF4ng \u0111\xFAng.", 401);
      }
      delete this.db.rateLimits[identityBucket];
      if (found.banned) {
        const until = untilActive(found.bannedUntil);
        return fail(until ? `T\xE0i kho\u1EA3n b\u1ECB kh\xF3a t\u1EA1m th\u1EDDi, c\xF2n kho\u1EA3ng ${formatRemaining(until)}. Li\xEAn h\u1EC7 qu\u1EA3n tr\u1ECB vi\xEAn n\u1EBFu c\u1EA7n khi\u1EBFu n\u1EA1i.` : "T\xE0i kho\u1EA3n \u0111\xE3 b\u1ECB kh\xF3a. Li\xEAn h\u1EC7 qu\u1EA3n tr\u1ECB vi\xEAn \u0111\u1EC3 khi\u1EBFu n\u1EA1i.", 403);
      }
      found.lastSeenAt = nowIso();
      found.lastLoginAt = found.lastSeenAt;
      const device = await this.recordDevice(found, meta);
      audit(this.db, found.id, "login_success", found.id, `password login; device=${device.label}${device.isNew ? "; new device" : ""}`);
      if (device.isNew && found.email) await this.queueMail(found.email, "new-device", { subject: "C\u1EDD Vua ViLa \u2014 \u0111\u0103ng nh\u1EADp t\u1EEB thi\u1EBFt b\u1ECB m\u1EDBi", heading: "\u0110\u0103ng nh\u1EADp t\u1EEB thi\u1EBFt b\u1ECB m\u1EDBi", lines: [`T\xE0i kho\u1EA3n @${found.username} v\u1EEBa \u0111\u0103ng nh\u1EADp t\u1EEB m\u1ED9t thi\u1EBFt b\u1ECB ch\u01B0a d\xF9ng tr\u01B0\u1EDBc \u0111\xE2y.`, `Thi\u1EBFt b\u1ECB: ${device.label}`, `Qu\u1ED1c gia: ${device.country || "kh\xF4ng r\xF5"} \xB7 IP: ${maskIp(meta.ip)}`, `Th\u1EDDi \u0111i\u1EC3m: ${mailTime()}`] });
      return json({ token: await signToken(this.db, found), user: selfUser(found) });
    }
    if (method === "POST" && ["/auth/forgot-password", "/auth/reset-password"].includes(path)) return fail("M\xE1y ch\u1EE7 cloud ch\u01B0a \u0111\u01B0\u1EE3c c\u1EA5u h\xECnh d\u1ECBch v\u1EE5 g\u1EEDi email kh\xF4i ph\u1EE5c. H\xE3y li\xEAn h\u1EC7 qu\u1EA3n tr\u1ECB vi\xEAn.", 503);
    if (method === "GET" && path === "/auth/me") {
      const required = this.needUser(user);
      if (required) return required;
      user.lastSeenAt = nowIso();
      const payload = { user: selfUser(user) };
      if (Math.floor(Date.now() / 1e3) - (Number(auth?.payload?.iat) || 0) > TOKEN_REFRESH_AFTER_SECONDS) payload.token = await signToken(this.db, user);
      return json(payload);
    }
    if (method === "POST" && path === "/auth/logout") {
      const required = this.needUser(user);
      if (required) return required;
      user.sessionVersion = (Number(user.sessionVersion) || 0) + 1;
      return json({ ok: true });
    }
    if (method === "PATCH" && path === "/profile") {
      const required = this.needUser(user);
      if (required) return required;
      const displayName = asText(body.displayName, 40), bio = asText(body.bio, 180);
      if (displayName.length < 2) return fail("T\xEAn hi\u1EC3n th\u1ECB c\u1EA7n \xEDt nh\u1EA5t 2 k\xFD t\u1EF1.");
      if (user.role !== "admin" && displayName !== user.displayName && reservedName(displayName)) return fail("T\xEAn n\xE0y d\u1EC5 b\u1ECB nh\u1EA7m v\u1EDBi qu\u1EA3n tr\u1ECB vi\xEAn/h\u1ED7 tr\u1EE3. H\xE3y ch\u1ECDn t\xEAn kh\xE1c.");
      if (this.db.users.some((item) => item.id !== user.id && String(item.displayName || "").toLowerCase() === displayName.toLowerCase())) return fail("Bi\u1EC7t danh n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c ng\u01B0\u1EDDi kh\xE1c s\u1EED d\u1EE5ng.", 409);
      user.displayName = displayName;
      user.bio = bio;
      return json({ user: selfUser(user) });
    }
    if (method === "PATCH" && path === "/account/password") {
      const required = this.needUser(user);
      if (required) return required;
      const currentPassword = String(body.currentPassword || "");
      const newPassword = String(body.newPassword || "");
      if (!currentPassword || currentPassword.length > 256) return fail("H\xE3y nh\u1EADp m\u1EADt kh\u1EA9u hi\u1EC7n t\u1EA1i.");
      if (newPassword.length < MIN_PASSWORD_LENGTH || newPassword.length > 256) return fail(`M\u1EADt kh\u1EA9u m\u1EDBi c\u1EA7n d\xE0i t\u1EEB ${MIN_PASSWORD_LENGTH} \u0111\u1EBFn 256 k\xFD t\u1EF1.`);
      if (newPassword === currentPassword) return fail("M\u1EADt kh\u1EA9u m\u1EDBi ph\u1EA3i kh\xE1c m\u1EADt kh\u1EA9u hi\u1EC7n t\u1EA1i.");
      const candidate = await passwordHash(currentPassword, user.salt || "00112233445566778899aabbccddeeff");
      if (!constantTimeEqual(candidate, user.passwordHash || "")) {
        audit(this.db, user.id, "password_change_failed", user.id, "wrong current password");
        return fail("M\u1EADt kh\u1EA9u hi\u1EC7n t\u1EA1i kh\xF4ng \u0111\xFAng.", 403);
      }
      const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
      user.salt = salt;
      user.passwordHash = await passwordHash(newPassword, salt);
      user.sessionVersion = (Number(user.sessionVersion) || 0) + 1;
      audit(this.db, user.id, "password_changed", user.id, "account settings");
      if (user.email) await this.queueMail(user.email, "password-changed", { subject: "C\u1EDD Vua ViLa \u2014 m\u1EADt kh\u1EA9u v\u1EEBa \u0111\u01B0\u1EE3c \u0111\u1ED5i", heading: "M\u1EADt kh\u1EA9u \u0111\xE3 \u0111\u01B0\u1EE3c thay \u0111\u1ED5i", lines: [`M\u1EADt kh\u1EA9u c\u1EE7a t\xE0i kho\u1EA3n @${user.username} v\u1EEBa \u0111\u01B0\u1EE3c thay \u0111\u1ED5i v\xE0 m\u1ECDi thi\u1EBFt b\u1ECB kh\xE1c \u0111\xE3 b\u1ECB \u0111\u0103ng xu\u1EA5t.`, `Th\u1EDDi \u0111i\u1EC3m: ${mailTime()}`] });
      return json({ ok: true, token: await signToken(this.db, user), user: selfUser(user) });
    }
    if (method === "PATCH" && path === "/account/email") {
      const required = this.needUser(user);
      if (required) return required;
      const password = String(body.password || "");
      const email = asText(body.email, 254).toLowerCase();
      if (!password || password.length > 256) return fail("H\xE3y nh\u1EADp m\u1EADt kh\u1EA9u \u0111\u1EC3 x\xE1c nh\u1EADn.");
      if (email && !EMAIL_RE.test(email)) return fail("Email kh\xF4ng h\u1EE3p l\u1EC7.");
      const candidate = await passwordHash(password, user.salt || "00112233445566778899aabbccddeeff");
      if (!constantTimeEqual(candidate, user.passwordHash || "")) return fail("M\u1EADt kh\u1EA9u kh\xF4ng \u0111\xFAng.", 403);
      if (email && this.db.users.some((item) => item.id !== user.id && String(item.email || "").toLowerCase() === email)) return fail("Email n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c d\xF9ng cho t\xE0i kho\u1EA3n kh\xE1c.", 409);
      const previousEmail = String(user.email || "").toLowerCase();
      user.email = email;
      audit(this.db, user.id, email ? "email_linked" : "email_unlinked", user.id, "account settings");
      if (email && email !== previousEmail) {
        await this.queueMail(email, "email-linked", { subject: "C\u1EDD Vua ViLa \u2014 email \u0111\xE3 \u0111\u01B0\u1EE3c li\xEAn k\u1EBFt", heading: "Email \u0111\xE3 \u0111\u01B0\u1EE3c li\xEAn k\u1EBFt v\u1EDBi t\xE0i kho\u1EA3n", footer: "ignore", lines: [`T\xE0i kho\u1EA3n @${user.username} (${user.displayName}) v\u1EEBa li\xEAn k\u1EBFt v\u1EDBi \u0111\u1ECBa ch\u1EC9 email n\xE0y.`, "ViLa s\u1EBD g\u1EEDi th\xF4ng b\xE1o b\u1EA3o m\u1EADt v\u1EC1 \u0111\xE2y: \u0111\u0103ng nh\u1EADp t\u1EEB thi\u1EBFt b\u1ECB m\u1EDBi, \u0111\u1ED5i m\u1EADt kh\u1EA9u, thay \u0111\u1ED5i email.", `Th\u1EDDi \u0111i\u1EC3m: ${mailTime()}`] });
      }
      if (previousEmail && previousEmail !== email) {
        await this.queueMail(previousEmail, "email-changed", { subject: email ? "C\u1EDD Vua ViLa \u2014 email c\u1EE7a t\xE0i kho\u1EA3n v\u1EEBa b\u1ECB thay \u0111\u1ED5i" : "C\u1EDD Vua ViLa \u2014 \u0111\xE3 g\u1EE1 email kh\u1ECFi t\xE0i kho\u1EA3n", heading: email ? "Email li\xEAn k\u1EBFt \u0111\xE3 \u0111\u01B0\u1EE3c thay \u0111\u1ED5i" : "Email li\xEAn k\u1EBFt \u0111\xE3 \u0111\u01B0\u1EE3c g\u1EE1", lines: [email ? `T\xE0i kho\u1EA3n @${user.username} v\u1EEBa \u0111\u1ED5i email li\xEAn k\u1EBFt sang ${maskEmail(email)}.` : `Email n\xE0y v\u1EEBa \u0111\u01B0\u1EE3c g\u1EE1 kh\u1ECFi t\xE0i kho\u1EA3n @${user.username}.`, `Th\u1EDDi \u0111i\u1EC3m: ${mailTime()}`] });
      }
      return json({ ok: true, user: selfUser(user) });
    }
    if (method === "GET" && path === "/users/search") {
      const required = this.needUser(user);
      if (required) return required;
      if (user.role !== "admin" && !this.userRate(user, "search", 60, 6e4)) return fail("B\u1EA1n t\xECm ki\u1EBFm qu\xE1 nhanh. H\xE3y th\u1EED l\u1EA1i sau \xEDt gi\xE2y.", 429);
      const q = asText(query.get("q"), 30).toLowerCase();
      if (q.length < 2) return fail("Nh\u1EADp \xEDt nh\u1EA5t 2 k\xFD t\u1EF1 \u0111\u1EC3 t\xECm ng\u01B0\u1EDDi ch\u01A1i.");
      return json({ users: this.db.users.filter((item) => !item.banned && item.id !== user.id && (item.username.toLowerCase().includes(q) || item.displayName.toLowerCase().includes(q))).slice(0, 20).map(publicUser) });
    }
    if (method === "GET" && params[0] === "users" && params.length === 2) {
      const required = this.needUser(user);
      if (required) return required;
      const username = asText(params[1], 24).toLowerCase();
      const target = this.db.users.find((item) => item.username.toLowerCase() === username && !item.banned);
      if (!target) return fail("Kh\xF4ng t\xECm th\u1EA5y h\u1ED3 s\u01A1 ng\u01B0\u1EDDi ch\u01A1i.", 404);
      return json({ user: publicUser(target), isSelf: target.id === user.id });
    }
    if (method === "POST" && params[0] === "users" && params[2] === "report" && params.length === 3) {
      const required = this.needUser(user);
      if (required) return required;
      const target = this.db.users.find((item) => item.id === params[1] && !item.banned);
      if (!target || target.id === user.id) return fail("Kh\xF4ng t\xECm th\u1EA5y ng\u01B0\u1EDDi ch\u01A1i \u0111\u1EC3 b\xE1o c\xE1o.", 404);
      if (!this.userRate(user, "report", 6, 36e5)) return fail("B\u1EA1n \u0111\xE3 g\u1EEDi qu\xE1 nhi\u1EC1u b\xE1o c\xE1o trong m\u1ED9t gi\u1EDD. H\xE3y th\u1EED l\u1EA1i sau.", 429);
      const reason = asText(body.reason, 60), details = asText(body.details, 800);
      if (!["cheating", "abuse", "spam", "impersonation", "other"].includes(reason)) return fail("H\xE3y ch\u1ECDn l\xFD do b\xE1o c\xE1o h\u1EE3p l\u1EC7.");
      const recent = this.db.userReports.find((item) => item.reporterId === user.id && item.targetUserId === target.id && item.status === "pending" && Date.now() - Date.parse(item.createdAt || "") < 864e5);
      if (recent) return fail("B\u1EA1n \u0111\xE3 g\u1EEDi b\xE1o c\xE1o \u0111ang ch\u1EDD x\u1EED l\xFD cho ng\u01B0\u1EDDi ch\u01A1i n\xE0y.", 409);
      const report = { id: crypto.randomUUID(), reporterId: user.id, targetUserId: target.id, reason, details, status: "pending", createdAt: nowIso(), reviewedAt: null, reviewedBy: null };
      this.db.userReports.push(report);
      this.db.userReports = this.db.userReports.slice(-1e4);
      audit(this.db, user.id, "user_report_submitted", target.id, reason);
      return json({ report: { id: report.id, status: report.status }, message: "\u0110\xE3 g\u1EEDi b\xE1o c\xE1o. Qu\u1EA3n tr\u1ECB vi\xEAn s\u1EBD xem x\xE9t; b\xE1o c\xE1o kh\xF4ng t\u1EF1 \u0111\u1ED9ng kh\xF3a t\xE0i kho\u1EA3n." }, 201);
    }
    if (method === "GET" && path === "/messages/conversations") {
      const required = this.needUser(user);
      if (required) return required;
      const grouped = /* @__PURE__ */ new Map();
      for (const message of this.db.directMessages) {
        if (message.from !== user.id && message.to !== user.id) continue;
        const otherId = message.from === user.id ? message.to : message.from;
        const other = this.db.users.find((item) => item.id === otherId && !item.banned);
        if (!other) continue;
        let row = grouped.get(otherId);
        if (!row) {
          row = { user: publicUser(other), lastMessage: message, unread: 0 };
          grouped.set(otherId, row);
        } else if (String(message.createdAt) > String(row.lastMessage.createdAt)) row.lastMessage = message;
        if (message.to === user.id && !message.readAt) row.unread += 1;
      }
      const conversations = [...grouped.values()].sort((a, b) => String(b.lastMessage.createdAt).localeCompare(String(a.lastMessage.createdAt))).slice(0, 100).map((row) => ({ user: row.user, unread: row.unread, lastMessage: { id: row.lastMessage.id, from: row.lastMessage.from, text: row.lastMessage.text, createdAt: row.lastMessage.createdAt } }));
      return json({ conversations });
    }
    if (params[0] === "messages" && params.length === 2 && params[1] !== "conversations" && method === "GET") {
      const required = this.needUser(user);
      if (required) return required;
      const target = this.db.users.find((item) => item.id === params[1] && !item.banned);
      if (!target || target.id === user.id) return fail("Kh\xF4ng t\xECm th\u1EA5y ng\u01B0\u1EDDi nh\u1EADn.", 404);
      const messages = this.db.directMessages.filter((item) => item.from === user.id && item.to === target.id || item.from === target.id && item.to === user.id).slice(-100);
      for (const message of messages) if (message.to === user.id && !message.readAt) message.readAt = nowIso();
      return json({ user: publicUser(target), messages: messages.map((item) => ({ id: item.id, from: item.from, to: item.to, text: item.text, createdAt: item.createdAt, readAt: item.readAt || null, fromMe: item.from === user.id })) });
    }
    if (params[0] === "messages" && params.length === 2 && method === "POST") {
      const required = this.needUser(user);
      if (required) return required;
      const target = this.db.users.find((item) => item.id === params[1] && !item.banned);
      if (!target || target.id === user.id) return fail("Kh\xF4ng t\xECm th\u1EA5y ng\u01B0\u1EDDi nh\u1EADn.", 404);
      if (user.role !== "admin") {
        if (target.role !== "admin") {
          const muted = this.muteGuard(user);
          if (muted) return muted;
        }
        if (!this.userRate(user, "dm", 30, 6e4)) {
          this.addStrike(user, "message_flood");
          return fail("B\u1EA1n g\u1EEDi tin nh\u1EAFn qu\xE1 nhanh. H\xE3y ch\u1EADm l\u1EA1i m\u1ED9t ch\xFAt.", 429);
        }
      }
      const text2 = asText(body.text, 1e3).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
      if (!text2) return fail("Tin nh\u1EAFn kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng.");
      const message = { id: crypto.randomUUID(), from: user.id, to: target.id, text: text2, createdAt: nowIso(), readAt: null };
      this.db.directMessages.push(message);
      if (target.role === "admin" && !(target.lastSeenAt && Date.now() - Date.parse(target.lastSeenAt) < 9e4)) {
        const hourAgo = Date.now() - 36e5;
        const recentBot = this.db.directMessages.slice(-3e3).some((item) => item.from === target.id && item.to === user.id && item.text.startsWith(SUPPORT_BOT_PREFIX) && Date.parse(item.createdAt) > hourAgo);
        if (!recentBot) this.db.directMessages.push({ id: crypto.randomUUID(), from: target.id, to: user.id, text: `${SUPPORT_BOT_PREFIX} Admin \u0111ang ngo\u1EA1i tuy\u1EBFn n\xEAn ch\u01B0a xem tin nh\u1EAFn c\u1EE7a b\u1EA1n. Tin \u0111\xE3 \u0111\u01B0\u1EE3c l\u01B0u v\xE0 admin s\u1EBD tr\u1EA3 l\u1EDDi khi online. Mu\u1ED1n mua Pro/Premium: v\xE0o trang G\xF3i v\xE0 g\u1EEDi y\xEAu c\u1EA7u \u0111\u1EC3 v\xE0o h\xE0ng ch\u1EDD. Bot kh\xF4ng t\u1EF1 c\u1EA5p g\xF3i.`, createdAt: nowIso(), readAt: null });
      }
      this.db.directMessages = this.db.directMessages.slice(-1e5);
      audit(this.db, user.id, "direct_message_sent", target.id, `length=${text2.length}`);
      return json({ message: { ...message, fromMe: true }, user: publicUser(target) }, 201);
    }
    if (method === "GET" && path === "/support/admin") {
      const required = this.needUser(user);
      if (required) return required;
      const admin = findSupportAdmin(this.db);
      if (!admin) return fail("Ch\u01B0a c\xF3 admin n\xE0o \u0111ang ho\u1EA1t \u0111\u1ED9ng. Vui l\xF2ng th\u1EED l\u1EA1i sau.", 503);
      const adminsOnline = adminsOnlineCount(this.db);
      const pending = this.db.purchaseRequests.filter((item) => item.status === "pending");
      const mine = pending.filter((item) => item.userId === user.id).map((item) => ({ id: item.id, plan: item.plan, amountVnd: item.amountVnd, createdAt: item.createdAt, position: pending.findIndex((other) => other.id === item.id) + 1 }));
      return json({ admin: publicUser(admin), adminsOnline, isSelf: admin.id === user.id, assistant: { active: adminsOnline === 0, canGrantPlans: false, pendingRequests: pending.length, yourPending: mine, adminLastSeenAt: admin.lastSeenAt || null } });
    }
    if (method === "POST" && path === "/me/purchase-requests") {
      const required = this.needUser(user);
      if (required) return required;
      const plan = asText(body.plan, 16).toLowerCase();
      const amountVnd = Number(body.amountVnd);
      if (!["pro", "premium", "diamond"].includes(plan)) return fail("G\xF3i y\xEAu c\u1EA7u kh\xF4ng h\u1EE3p l\u1EC7.");
      if (plan === "pro" && amountVnd !== 1e3) return fail("G\xF3i Pro d\xF9ng th\u1EED c\xF3 m\u1EE9c c\u1ED1 \u0111\u1ECBnh 1.000\u0111 cho 3 gi\u1EDD.");
      if (plan === "diamond" && amountVnd !== DIAMOND_PRICE_VND) return fail(`G\xF3i Kim C\u01B0\u01A1ng 1 n\u0103m c\xF3 m\u1EE9c c\u1ED1 \u0111\u1ECBnh ${DIAMOND_PRICE_VND.toLocaleString("vi-VN")}\u0111.`);
      if (plan === "premium" && (!Number.isInteger(amountVnd) || amountVnd < 1e3 || amountVnd > 1e5 || amountVnd % 1e3 !== 0)) return fail("M\u1EE9c \u0111\u1EC1 ngh\u1ECB Premium ph\u1EA3i t\u1EEB 1.000\u0111 \u0111\u1EBFn 100.000\u0111, theo b\u1EADc 1.000\u0111.");
      const admin = findSupportAdmin(this.db);
      if (!admin) return fail("M\xE1y ch\u1EE7 ch\u01B0a c\u1EA5u h\xECnh t\xE0i kho\u1EA3n admin \u0111\u1EC3 nh\u1EADn y\xEAu c\u1EA7u.", 503);
      const existing = this.db.purchaseRequests.find((item) => item.userId === user.id && item.plan === plan && item.status === "pending");
      if (existing) return json({ request: { id: existing.id, plan: existing.plan, amountVnd: existing.amountVnd, status: existing.status, createdAt: existing.createdAt }, admin: publicUser(admin), duplicate: true, message: "B\u1EA1n \u0111\xE3 c\xF3 y\xEAu c\u1EA7u \u0111ang ch\u1EDD admin x\u1EED l\xFD; kh\xF4ng t\u1EA1o y\xEAu c\u1EA7u tr\xF9ng." });
      const isPremiumInquiry = plan === "premium";
      const isDiamond = plan === "diamond";
      const request = { id: crypto.randomUUID(), userId: user.id, plan, amountVnd, status: "pending", kind: isPremiumInquiry ? "premium_inquiry" : isDiamond ? "diamond_1y" : "pro_3h", createdAt: nowIso(), reviewedAt: null, reviewedBy: null };
      this.db.purchaseRequests.push(request);
      this.db.purchaseRequests = this.db.purchaseRequests.slice(-5e3);
      const detail = isPremiumInquiry ? `\u0110\u1EC0 NGH\u1ECA PREMIUM \xB7 ${amountVnd.toLocaleString("vi-VN")}\u0111 (kh\xF4ng ph\u1EA3i thanh to\xE1n; Premium hi\u1EC7n kh\xF4ng b\xE1n t\u1EF1 \u0111\u1ED9ng). M\xE3: ${request.id}` : isDiamond ? `Y\xCAU C\u1EA6U KIM C\u01AF\u01A0NG 1 N\u0102M \xB7 ${amountVnd.toLocaleString("vi-VN")}\u0111. Ch\u1EC9 c\u1EA5p sau khi admin x\xE1c nh\u1EADn \u0111\xE3 nh\u1EADn ti\u1EC1n. M\xE3: ${request.id}` : `Y\xCAU C\u1EA6U PRO 3 GI\u1EDC \xB7 1.000\u0111. Ch\u1EC9 c\u1EA5p sau khi admin x\xE1c nh\u1EADn \u0111\xE3 nh\u1EADn ti\u1EC1n. M\xE3: ${request.id}`;
      const now = nowIso();
      this.db.directMessages.push({ id: crypto.randomUUID(), from: user.id, to: admin.id, text: detail, createdAt: now, readAt: null });
      this.db.directMessages.push({ id: crypto.randomUUID(), from: admin.id, to: user.id, text: isPremiumInquiry ? `VILA Admin \xB7 tr\u1EE3 l\xFD: \u0110\xE3 ghi nh\u1EADn \u0111\u1EC1 ngh\u1ECB Premium ${amountVnd.toLocaleString("vi-VN")}\u0111. Premium hi\u1EC7n kh\xF4ng b\xE1n t\u1EF1 \u0111\u1ED9ng v\xE0 \u0111\u1EC1 ngh\u1ECB n\xE0y kh\xF4ng k\xEDch ho\u1EA1t g\xF3i. Admin s\u1EBD ph\u1EA3n h\u1ED3i t\u1EA1i cu\u1ED9c tr\xF2 chuy\u1EC7n n\xE0y.` : isDiamond ? `VILA Admin \xB7 tr\u1EE3 l\xFD: \u0110\xE3 nh\u1EADn y\xEAu c\u1EA7u Kim C\u01B0\u01A1ng 1 n\u0103m (${amountVnd.toLocaleString("vi-VN")}\u0111). G\xF3i ch\u01B0a \u0111\u01B0\u1EE3c k\xEDch ho\u1EA1t; admin c\u1EA7n x\xE1c nh\u1EADn \u0111\xE3 nh\u1EADn thanh to\xE1n trong b\u1EA3ng qu\u1EA3n tr\u1ECB.` : "VILA Admin \xB7 tr\u1EE3 l\xFD: \u0110\xE3 nh\u1EADn y\xEAu c\u1EA7u Pro 3 gi\u1EDD (1.000\u0111). G\xF3i ch\u01B0a \u0111\u01B0\u1EE3c k\xEDch ho\u1EA1t; admin c\u1EA7n x\xE1c nh\u1EADn \u0111\xE3 nh\u1EADn thanh to\xE1n trong b\u1EA3ng qu\u1EA3n tr\u1ECB.", createdAt: now, readAt: null });
      this.db.directMessages = this.db.directMessages.slice(-1e5);
      audit(this.db, user.id, "purchase_request_created", request.id, `${plan};amountVnd=${amountVnd}`);
      return json({ request: { id: request.id, plan, amountVnd, status: request.status, createdAt: request.createdAt }, admin: publicUser(admin), duplicate: false, message: isPremiumInquiry ? "\u0110\u1EC1 ngh\u1ECB \u0111\xE3 g\u1EEDi \u0111\u1EBFn admin; Premium kh\xF4ng t\u1EF1 b\xE1n ho\u1EB7c t\u1EF1 k\xEDch ho\u1EA1t." : isDiamond ? "Y\xEAu c\u1EA7u Kim C\u01B0\u01A1ng \u0111\xE3 g\u1EEDi \u0111\u1EBFn admin. G\xF3i c\xF3 hi\u1EC7u l\u1EF1c 365 ng\xE0y sau khi admin x\xE1c nh\u1EADn thanh to\xE1n." : "Y\xEAu c\u1EA7u \u0111\xE3 g\u1EEDi \u0111\u1EBFn admin. Pro ch\u1EC9 c\xF3 hi\u1EC7u l\u1EF1c 3 gi\u1EDD sau khi admin x\xE1c nh\u1EADn thanh to\xE1n." }, 201);
    }
    if (method === "GET" && path === "/friends") {
      const required = this.needUser(user);
      if (required) return required;
      const items = this.db.friendRequests;
      const incoming = items.filter((item) => item.status === "pending" && item.to === user.id).map((item) => ({ id: item.id, createdAt: item.createdAt, user: publicUser(this.db.users.find((candidate) => candidate.id === item.from) || {}) }));
      const outgoing = items.filter((item) => item.status === "pending" && item.from === user.id).map((item) => ({ id: item.id, createdAt: item.createdAt, user: publicUser(this.db.users.find((candidate) => candidate.id === item.to) || {}) }));
      const friends = items.filter((item) => item.status === "accepted" && (item.from === user.id || item.to === user.id)).map((item) => this.db.users.find((candidate) => candidate.id === (item.from === user.id ? item.to : item.from))).filter((candidate) => candidate && !candidate.banned).map(publicUser).sort((a, b) => Number(b.online) - Number(a.online) || a.displayName.localeCompare(b.displayName));
      return json({ friends, incoming, outgoing });
    }
    if (method === "POST" && path === "/friends/request") {
      const required = this.needUser(user);
      if (required) return required;
      const username = asText(body.username, 24).toLowerCase();
      const target = this.db.users.find((item) => item.username.toLowerCase() === username && !item.banned);
      if (!target) return fail("Kh\xF4ng t\xECm th\u1EA5y ng\u01B0\u1EDDi ch\u01A1i n\xE0y.", 404);
      if (target.id === user.id) return fail("B\u1EA1n kh\xF4ng th\u1EC3 t\u1EF1 k\u1EBFt b\u1EA1n v\u1EDBi m\xECnh.");
      if (user.role !== "admin") {
        const muted = this.muteGuard(user);
        if (muted) return muted;
        if (!this.userRate(user, "friend-request", 20, 36e5)) {
          this.addStrike(user, "friend_request_flood");
          return fail("B\u1EA1n g\u1EEDi qu\xE1 nhi\u1EC1u l\u1EDDi m\u1EDDi k\u1EBFt b\u1EA1n. H\xE3y th\u1EED l\u1EA1i sau.", 429);
        }
      }
      let existing = this.db.friendRequests.find((item) => item.from === user.id && item.to === target.id || item.from === target.id && item.to === user.id);
      if (existing?.status === "accepted") return fail("Hai b\u1EA1n \u0111\xE3 l\xE0 b\u1EA1n b\xE8.", 409);
      if (existing?.status === "pending" && existing.from === target.id) {
        existing.status = "accepted";
        existing.updatedAt = nowIso();
        return json({ message: "\u0110\xE3 ch\u1EA5p nh\u1EADn l\u1EDDi m\u1EDDi \u0111ang ch\u1EDD; hai b\u1EA1n \u0111\xE3 l\xE0 b\u1EA1n b\xE8." });
      }
      if (existing?.status === "pending") return fail("L\u1EDDi m\u1EDDi k\u1EBFt b\u1EA1n \u0111\xE3 \u0111\u01B0\u1EE3c g\u1EEDi.", 409);
      existing = { id: crypto.randomUUID(), from: user.id, to: target.id, status: "pending", createdAt: nowIso(), updatedAt: null };
      this.db.friendRequests.push(existing);
      audit(this.db, user.id, "friend_request_sent", target.id, "pending");
      return json({ message: `\u0110\xE3 g\u1EEDi l\u1EDDi m\u1EDDi k\u1EBFt b\u1EA1n t\u1EDBi @${target.username}.` }, 201);
    }
    if (method === "POST" && params[0] === "friends" && params[2] === "accept" && params.length === 3) {
      const required = this.needUser(user);
      if (required) return required;
      const item = this.db.friendRequests.find((entry) => entry.id === params[1] && entry.to === user.id && entry.status === "pending");
      if (!item) return fail("Kh\xF4ng t\xECm th\u1EA5y l\u1EDDi m\u1EDDi \u0111ang ch\u1EDD.", 404);
      item.status = "accepted";
      item.updatedAt = nowIso();
      audit(this.db, user.id, "friend_request_accepted", item.from, "accepted");
      return json({ message: "\u0110\xE3 th\xEAm b\u1EA1n b\xE8." });
    }
    if (method === "DELETE" && params[0] === "friends" && params.length === 2) {
      const required = this.needUser(user);
      if (required) return required;
      const before = this.db.friendRequests.length;
      this.db.friendRequests = this.db.friendRequests.filter((item) => !(item.from === user.id && item.to === params[1] || item.to === user.id && item.from === params[1] || item.id === params[1] && (item.from === user.id || item.to === user.id)));
      if (before === this.db.friendRequests.length) return fail("Kh\xF4ng t\xECm th\u1EA5y b\u1EA1n b\xE8/l\u1EDDi m\u1EDDi t\u01B0\u01A1ng \u1EE9ng.", 404);
      return json({ message: "\u0110\xE3 c\u1EADp nh\u1EADt danh s\xE1ch b\u1EA1n b\xE8." });
    }
    if (method === "GET" && path === "/me/license") {
      const required = this.needUser(user);
      if (required) return required;
      return json({ license: normalizeLicense(user.license) });
    }
    if (method === "POST" && path === "/me/license") {
      const required = this.needUser(user);
      if (required) return required;
      const result = submitLicense(user, body);
      if (!result.ok) return fail(result.error, result.status);
      audit(this.db, user.id, "license_submitted", user.id, "pending");
      return json({ license: result.license, message: "\u0110\xE3 g\u1EEDi h\u1ED3 s\u01A1 gi\u1EA5y ph\xE9p. Admin s\u1EBD duy\u1EC7t tr\u01B0\u1EDBc khi b\u1EA1n xu\u1EA5t hi\u1EC7n tr\xEAn b\u1EA3ng x\u1EBFp h\u1EA1ng." }, 201);
    }
    if (method === "GET" && path === "/admin/licenses") {
      const required = this.needUser(user);
      if (required) return required;
      if (user.role !== "admin") return fail("B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n qu\u1EA3n tr\u1ECB.", 403);
      const status = ["pending", "approved", "rejected", "revoked", "all"].includes(String(query.get("status") || "pending")) ? String(query.get("status") || "pending") : "pending";
      const rows = this.db.users.map((item) => ({ item, license: normalizeLicense(item.license) })).filter((row) => row.license.status !== "none" && (status === "all" || row.license.status === status)).sort((a, b) => String(b.license.submittedAt).localeCompare(String(a.license.submittedAt))).slice(0, 300).map((row) => ({ user: publicUser(row.item), license: row.license }));
      return json({ licenses: rows, pending: this.db.users.filter((item) => normalizeLicense(item.license).status === "pending").length });
    }
    if (method === "POST" && params[0] === "admin" && params[1] === "licenses" && params[3] === "decision" && params.length === 4) {
      const required = this.needUser(user);
      if (required) return required;
      if (user.role !== "admin") return fail("B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n qu\u1EA3n tr\u1ECB.", 403);
      const target = this.db.users.find((item) => item.id === params[2]);
      if (!target) return fail("Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n.", 404);
      if (target.id === user.id) return fail("Admin kh\xF4ng th\u1EC3 t\u1EF1 duy\u1EC7t gi\u1EA5y ph\xE9p c\u1EE7a ch\xEDnh m\xECnh.", 403);
      const result = decideLicense(target, asText(body.decision, 12), user.id, asText(body.reason, 200));
      if (!result.ok) return fail(result.error, result.status);
      audit(this.db, user.id, `license_${result.license.status}`, target.id, result.license.reason);
      return json({ license: result.license, user: publicUser(target), message: result.license.status === "approved" ? "\u0110\xE3 c\u1EA5p gi\u1EA5y ph\xE9p: ng\u01B0\u1EDDi ch\u01A1i s\u1EBD xu\u1EA5t hi\u1EC7n tr\xEAn b\u1EA3ng x\u1EBFp h\u1EA1ng." : "\u0110\xE3 c\u1EADp nh\u1EADt gi\u1EA5y ph\xE9p." });
    }
    if (method === "GET" && path === "/tournaments/current") {
      const tournament = ensureCurrentTournament(this.db);
      const userOf = (id) => {
        const found = this.db.users.find((item) => item.id === id);
        return found ? publicUser(found) : null;
      };
      return json({ tournament: tournamentView(tournament, { userId: user?.id || "", userOf }), history: tournamentHistory(this.db, { userOf }), serverNow: Date.now() });
    }
    if (method === "POST" && path === "/tournaments/current/join") {
      const required = this.needUser(user);
      if (required) return required;
      if (user.banned) return fail("T\xE0i kho\u1EA3n \u0111ang b\u1ECB kh\xF3a.", 403);
      const tournament = ensureCurrentTournament(this.db);
      const result = joinTournament(tournament, user.id);
      if (!result.ok) return fail(result.error, result.status);
      audit(this.db, user.id, "tournament_joined", tournament.id, "");
      const userOf = (id) => {
        const found = this.db.users.find((item) => item.id === id);
        return found ? publicUser(found) : null;
      };
      return json({ tournament: tournamentView(tournament, { userId: user.id, userOf }), message: "\u0110\xE3 \u0111\u0103ng k\xFD \u0111\u1EA5u tr\u01B0\u1EDDng Ch\u1EE7 nh\u1EADt." }, 201);
    }
    if (method === "POST" && path === "/tournaments/current/leave") {
      const required = this.needUser(user);
      if (required) return required;
      const tournament = ensureCurrentTournament(this.db);
      const result = leaveTournament(tournament, user.id);
      if (!result.ok) return fail(result.error, result.status);
      audit(this.db, user.id, "tournament_left", tournament.id, "");
      const userOf = (id) => {
        const found = this.db.users.find((item) => item.id === id);
        return found ? publicUser(found) : null;
      };
      return json({ tournament: tournamentView(tournament, { userId: user.id, userOf }), message: "\u0110\xE3 h\u1EE7y \u0111\u0103ng k\xFD." });
    }
    if (method === "POST" && path === "/admin/tournaments/current/prize") {
      const required = this.needUser(user);
      if (required) return required;
      if (user.role !== "admin") return fail("B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n qu\u1EA3n tr\u1ECB.", 403);
      const prize = asText(body.prize, 200);
      if (prize.length < 3) return fail("Nh\u1EADp m\xF4 t\u1EA3 gi\u1EA3i th\u01B0\u1EDFng (\xEDt nh\u1EA5t 3 k\xFD t\u1EF1).");
      const tournament = ensureCurrentTournament(this.db);
      tournament.prize = prize;
      audit(this.db, user.id, "tournament_prize_set", tournament.id, prize.slice(0, 120));
      return json({ ok: true, prize });
    }
    if (method === "GET" && path === "/leaderboard") {
      const limit = clamp(Number(query.get("limit")) || 100, 1, 100);
      const users = this.db.users.filter((item) => isLicensed(item)).map(publicUser).sort((a, b) => b.elo - a.elo || b.games - a.games || String(a.createdAt).localeCompare(String(b.createdAt)));
      return json({ users: users.slice(0, limit).map((item, index) => ({ rank: index + 1, ...item })), totalPlayers: users.length, generatedAt: nowIso(), source: "server" });
    }
    if (method === "GET" && path === "/inbox") {
      const required = this.needUser(user);
      if (required) return required;
      const reads = new Set(Array.isArray(this.db.announcementReads[user.id]) ? this.db.announcementReads[user.id] : []);
      const announcements = this.db.announcements.slice(-100).reverse().map((item) => ({ ...item, read: reads.has(item.id) }));
      return json({ announcements, unread: announcements.filter((item) => !item.read).length });
    }
    if (method === "POST" && params[0] === "inbox" && params[1] && params[2] === "read") {
      const required = this.needUser(user);
      if (required) return required;
      if (!this.db.announcements.some((item) => item.id === params[1])) return fail("Kh\xF4ng t\xECm th\u1EA5y th\xF4ng b\xE1o.", 404);
      const reads = Array.isArray(this.db.announcementReads[user.id]) ? this.db.announcementReads[user.id] : [];
      if (!reads.includes(params[1])) reads.push(params[1]);
      this.db.announcementReads[user.id] = reads.slice(-500);
      return json({ ok: true });
    }
    if (method === "POST" && path === "/inbox/read-all") {
      const required = this.needUser(user);
      if (required) return required;
      this.db.announcementReads[user.id] = this.db.announcements.slice(-500).map((item) => item.id);
      return json({ ok: true });
    }
    if (method === "POST" && path === "/history/sync") {
      const required = this.needUser(user);
      if (required) return required;
      const clientGames = Array.isArray(body.games) ? body.games.slice(0, 150) : [];
      const existing = Array.isArray(this.db.userHistory[user.id]) ? this.db.userHistory[user.id] : [];
      const signatures = new Set(existing.map((game) => game.signature || game.id));
      for (const game of clientGames) {
        if (!game || typeof game !== "object") continue;
        if (game.ownerId && String(game.ownerId) !== String(user.id)) continue;
        const key = game.signature || game.id;
        if (!key || signatures.has(key)) continue;
        signatures.add(key);
        existing.push(game);
      }
      existing.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      this.db.userHistory[user.id] = existing.slice(0, 150);
      return json({ ok: true, syncedCount: this.db.userHistory[user.id].length, games: this.db.userHistory[user.id] });
    }
    if (method === "GET" && path === "/history") {
      const required = this.needUser(user);
      if (required) return required;
      return json({ ok: true, games: Array.isArray(this.db.userHistory[user.id]) ? this.db.userHistory[user.id] : [] });
    }
    if (method === "POST" && path === "/ranked/queue") return this.rankedQueue(user, body);
    if (method === "GET" && path === "/ranked/status") return this.rankedStatus(user);
    if (method === "POST" && path === "/ranked/cancel-queue") {
      const required = this.needUser(user);
      if (required) return required;
      const length = this.db.rankedQueue.length;
      this.db.rankedQueue = this.db.rankedQueue.filter((entry) => entry.userId !== user.id);
      return json({ queued: false, cancelled: length !== this.db.rankedQueue.length });
    }
    if (["POST"].includes(method) && params[0] === "ranked" && params[1] === "matches" && params[3] === "move") return this.rankedMove(user, params[2], body);
    if (["POST"].includes(method) && params[0] === "ranked" && params[1] === "matches" && ["resign", "abandon"].includes(params[3])) return this.rankedFinish(user, params[2], params[3]);
    if (method === "GET" && path === "/admin/fair-play") {
      const required = await this.requireUser(user);
      if (required) return required;
      if (user.role !== "admin") return fail("B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n qu\u1EA3n tr\u1ECB.", 403);
      const matches = this.db.matches.filter((match) => match?.ranked === true && match.fairPlayEvents?.length).map((match) => ({
        matchId: match.id,
        status: match.status,
        timeCategory: match.timeCategory,
        timeControl: match.timeControl,
        players: Object.fromEntries(["w", "b"].map((color) => {
          const id = match.players?.[color];
          const target = this.db.users.find((item) => item.id === id);
          return [color, { id, username: target?.username || "unknown", signals: match.fairPlaySignals?.[id] || { signals: 0, ultraFastMoves: 0, level: "review" } }];
        })),
        events: match.fairPlayEvents.slice(-30)
      })).slice(-100).reverse();
      return json({ matches, note: "C\xE1c t\xEDn hi\u1EC7u ch\u1EC9 h\u1ED7 tr\u1EE3 r\xE0 so\xE1t th\u1EE7 c\xF4ng; kh\xF4ng ph\u1EA3i b\u1EB1ng ch\u1EE9ng ch\u1EAFc ch\u1EAFn v\u1EC1 gian l\u1EADn v\xE0 kh\xF4ng t\u1EF1 \u0111\u1ED9ng kh\xF3a t\xE0i kho\u1EA3n." });
    }
    if (method === "GET" && path === "/admin/purchase-requests") {
      const required = this.needUser(user);
      if (required) return required;
      if (user.role !== "admin") return fail("B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n qu\u1EA3n tr\u1ECB.", 403);
      const status = ["pending", "approved", "contacted", "rejected", "all"].includes(String(query.get("status") || "pending")) ? String(query.get("status") || "pending") : "pending";
      const requests = this.db.purchaseRequests.filter((item) => status === "all" || item.status === status).slice(-300).reverse().map((item) => ({
        id: item.id,
        plan: item.plan,
        amountVnd: item.amountVnd,
        kind: item.kind,
        status: item.status,
        createdAt: item.createdAt,
        reviewedAt: item.reviewedAt,
        user: publicUser(this.db.users.find((candidate) => candidate.id === item.userId) || { id: item.userId, username: "deleted", displayName: "T\xE0i kho\u1EA3n kh\xF4ng t\u1ED3n t\u1EA1i" })
      }));
      return json({ requests, pending: this.db.purchaseRequests.filter((item) => item.status === "pending").length });
    }
    if (method === "POST" && params[0] === "admin" && params[1] === "purchase-requests" && params[3] === "decision" && params.length === 4) {
      const required = this.needUser(user);
      if (required) return required;
      if (user.role !== "admin") return fail("B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n qu\u1EA3n tr\u1ECB.", 403);
      const request = this.db.purchaseRequests.find((item) => item.id === params[2]);
      if (!request) return fail("Kh\xF4ng t\xECm th\u1EA5y y\xEAu c\u1EA7u g\xF3i.", 404);
      if (request.status !== "pending") return fail("Y\xEAu c\u1EA7u n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c x\u1EED l\xFD.", 409);
      const action = asText(body.action, 24);
      const target = this.db.users.find((item) => item.id === request.userId);
      if (!target || target.banned) return fail("T\xE0i kho\u1EA3n y\xEAu c\u1EA7u kh\xF4ng c\xF2n ho\u1EA1t \u0111\u1ED9ng.", 409);
      let responseText = "";
      if (action === "confirm-pro") {
        if (request.plan !== "pro") return fail("Ch\u1EC9 y\xEAu c\u1EA7u Pro 3 gi\u1EDD m\u1EDBi c\xF3 th\u1EC3 \u0111\u01B0\u1EE3c c\u1EA5p t\u1EEB panel n\xE0y.");
        target.entitlement = grantProTrial(normalizeEntitlement(target.entitlement));
        request.status = "approved";
        responseText = `Admin \u0111\xE3 x\xE1c nh\u1EADn thanh to\xE1n v\xE0 c\u1EA5p Pro d\xF9ng th\u1EED 3 gi\u1EDD. H\u1EBFt h\u1EA1n d\u1EF1 ki\u1EBFn: ${new Date(target.entitlement.proExpiresAt).toLocaleString("vi-VN")}.`;
        audit(this.db, user.id, "purchase_request_pro_approved", target.id, `request=${request.id}; amountVnd=${request.amountVnd}; durationMs=10800000`);
      } else if (action === "confirm-diamond") {
        if (request.plan !== "diamond") return fail("Ch\u1EC9 y\xEAu c\u1EA7u Kim C\u01B0\u01A1ng m\u1EDBi c\xF3 th\u1EC3 \u0111\u01B0\u1EE3c c\u1EA5p Kim C\u01B0\u01A1ng t\u1EEB panel n\xE0y.");
        target.entitlement = grantPlan(normalizeEntitlement(target.entitlement), "diamond");
        request.status = "approved";
        responseText = `Admin \u0111\xE3 x\xE1c nh\u1EADn thanh to\xE1n v\xE0 c\u1EA5p g\xF3i Kim C\u01B0\u01A1ng 365 ng\xE0y. H\u1EBFt h\u1EA1n d\u1EF1 ki\u1EBFn: ${new Date(target.entitlement.diamondExpiresAt).toLocaleString("vi-VN")}.`;
        audit(this.db, user.id, "purchase_request_diamond_approved", target.id, `request=${request.id}; amountVnd=${request.amountVnd}; days=365`);
      } else if (action === "grant-premium") {
        if (request.plan !== "premium") return fail("Ch\u1EC9 \u0111\u1EC1 ngh\u1ECB Premium m\u1EDBi c\xF3 th\u1EC3 \u0111\u01B0\u1EE3c c\u1EA5p Premium t\u1EEB panel n\xE0y.");
        target.entitlement = grantPlan(normalizeEntitlement(target.entitlement), "premium");
        request.status = "approved";
        responseText = "Admin \u0111\xE3 x\xE1c nh\u1EADn v\xE0 c\u1EA5p Premium cho t\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n.";
        audit(this.db, user.id, "purchase_request_premium_granted", target.id, `request=${request.id}; amountVnd=${request.amountVnd}`);
      } else if (action === "contacted") {
        if (request.plan !== "premium") return fail("H\xE0nh \u0111\u1ED9ng li\xEAn h\u1EC7 n\xE0y ch\u1EC9 \xE1p d\u1EE5ng cho \u0111\u1EC1 ngh\u1ECB Premium.");
        request.status = "contacted";
        responseText = "Admin \u0111\xE3 xem \u0111\u1EC1 ngh\u1ECB Premium c\u1EE7a b\u1EA1n v\xE0 s\u1EBD trao \u0111\u1ED5i tr\u1EF1c ti\u1EBFp. Premium hi\u1EC7n kh\xF4ng b\xE1n t\u1EF1 \u0111\u1ED9ng; quy\u1EC1n Premium ch\u01B0a \u0111\u01B0\u1EE3c c\u1EA5p.";
        audit(this.db, user.id, "purchase_request_premium_contacted", target.id, `request=${request.id}; amountVnd=${request.amountVnd}`);
      } else if (action === "reject") {
        request.status = "rejected";
        responseText = "Admin \u0111\xE3 \u0111\xF3ng y\xEAu c\u1EA7u g\xF3i n\xE0y. N\u1EBFu b\u1EA1n cho r\u1EB1ng c\xF3 nh\u1EA7m l\u1EABn, h\xE3y g\u1EEDi tin nh\u1EAFn trong cu\u1ED9c tr\xF2 chuy\u1EC7n admin.";
        audit(this.db, user.id, "purchase_request_rejected", target.id, `request=${request.id}; plan=${request.plan}`);
      } else return fail("H\xE0nh \u0111\u1ED9ng ch\u1EC9 \u0111\u01B0\u1EE3c l\xE0 confirm-pro, confirm-diamond, grant-premium, contacted ho\u1EB7c reject.");
      request.reviewedAt = nowIso();
      request.reviewedBy = user.id;
      this.db.directMessages.push({ id: crypto.randomUUID(), from: user.id, to: target.id, text: `VILA Admin: ${responseText}`, createdAt: request.reviewedAt, readAt: null });
      this.db.directMessages = this.db.directMessages.slice(-1e5);
      return json({ request: { id: request.id, plan: request.plan, amountVnd: request.amountVnd, status: request.status, reviewedAt: request.reviewedAt }, user: { ...publicUser(target), entitlement: entitlementForClient(target.entitlement) }, message: responseText });
    }
    if (method === "GET" && path === "/admin/revenue") {
      const required = this.needUser(user);
      if (required) return required;
      if (user.role !== "admin") return fail("B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n qu\u1EA3n tr\u1ECB.", 403);
      const requests = this.db.purchaseRequests || [];
      const approved = requests.filter((item) => item.status === "approved");
      const stamp = (item) => Date.parse(item.reviewedAt || item.createdAt) || 0;
      const vnd = (item) => Math.max(0, Number(item.amountVnd) || 0);
      const sum = (items) => items.reduce((total, item) => total + vnd(item), 0);
      const now = Date.now();
      const within = (ms) => approved.filter((item) => now - stamp(item) < ms);
      const byDay = [];
      for (let offset = 13; offset >= 0; offset -= 1) {
        const day = new Date(now - offset * DAY_MS).toISOString().slice(0, 10);
        const items = approved.filter((item) => new Date(stamp(item)).toISOString().slice(0, 10) === day);
        byDay.push({ date: day, vnd: sum(items), count: items.length });
      }
      const byPlan = {};
      for (const item of approved) {
        const key = item.plan || "other";
        byPlan[key] = byPlan[key] || { count: 0, vnd: 0 };
        byPlan[key].count += 1;
        byPlan[key].vnd += vnd(item);
      }
      const play = (this.db.purchases || []).filter((item) => item.status === "granted");
      const playByPlan = {};
      for (const item of play) {
        const key = item.plan || "other";
        playByPlan[key] = (playByPlan[key] || 0) + 1;
      }
      const playPrice = { pro: Number(this.env?.PLAY_PRICE_VND_PRO) || 0, premium: Number(this.env?.PLAY_PRICE_VND_PREMIUM) || 0, diamond: Number(this.env?.PLAY_PRICE_VND_DIAMOND) || 0 };
      const playEstimateVnd = play.reduce((total, item) => total + (Number(item.priceVnd) || playPrice[item.plan] || 0), 0);
      const pending = requests.filter((item) => item.status === "pending" && item.kind !== "premium_inquiry");
      return json({
        currency: "VND",
        totals: { today: sum(within(DAY_MS)), week: sum(within(7 * DAY_MS)), month: sum(within(30 * DAY_MS)), all: sum(approved) },
        counts: { approved: approved.length, payingUsers: new Set(approved.map((item) => item.userId)).size, pending: pending.length, pendingVnd: sum(pending) },
        byPlan,
        byDay,
        googlePlay: { purchases: play.length, byPlan: playByPlan, estimateVnd: playEstimateVnd, priceConfigured: playEstimateVnd > 0 || !play.length && (playPrice.pro > 0 || playPrice.premium > 0 || playPrice.diamond > 0) },
        note: "Doanh thu th\u1EE7 c\xF4ng = c\xE1c y\xEAu c\u1EA7u admin \u0111\xE3 x\xE1c nh\u1EADn. Google Play ch\u1EC9 \u01B0\u1EDBc t\xEDnh khi \u0111\u1EB7t bi\u1EBFn PLAY_PRICE_VND_PRO / PLAY_PRICE_VND_PREMIUM / PLAY_PRICE_VND_DIAMOND."
      });
    }
    if (method === "GET" && path === "/admin/overview") {
      const required = this.needUser(user);
      if (required) return required;
      if (user.role !== "admin") return fail("B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n qu\u1EA3n tr\u1ECB.", 403);
      return json({ users: this.db.users.length, activeUsers: this.db.users.filter((item) => !item.banned && item.lastSeenAt && Date.now() - Date.parse(item.lastSeenAt) < 9e4).length, bannedUsers: this.db.users.filter((item) => item.banned).length, mutedUsers: this.db.users.filter((item) => untilActive(item.mutedUntil)).length, admins: this.db.users.filter((item) => item.role === "admin" && !item.banned).length, pendingFriendRequests: this.db.friendRequests.filter((item) => item.status === "pending").length, pendingReports: this.db.userReports.filter((item) => item.status === "pending").length, uptimeSeconds: 0, node: "Cloudflare Workers", platform: "cloudflare", arch: "managed", cpus: 1, loadAverage: [], memory: {}, db: { users: this.db.users.length, friendRequests: this.db.friendRequests.length, auditEvents: this.db.audit.length } });
    }
    if (method === "GET" && path === "/admin/users") {
      const required = this.needUser(user);
      if (required) return required;
      if (user.role !== "admin") return fail("B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n qu\u1EA3n tr\u1ECB.", 403);
      const q = asText(query.get("q"), 80).toLowerCase();
      const users = this.db.users.filter((item) => !q || item.username.toLowerCase().includes(q) || item.displayName.toLowerCase().includes(q) || String(item.email || "").toLowerCase().includes(q)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 200).map((item) => ({ ...publicUser(item), email: item.email || "", banReason: item.banReason || "", bannedUntil: item.bannedUntil || null, mutedUntil: untilActive(item.mutedUntil) ? item.mutedUntil : null, muteReason: item.muteReason || "", lastLoginAt: item.lastLoginAt || null, entitlement: entitlementForClient(item.role === "admin" ? { premium: true } : item.entitlement) }));
      return json({ users, total: this.db.users.length });
    }
    if (method === "GET" && path === "/admin/reports") {
      const required = this.needUser(user);
      if (required) return required;
      if (user.role !== "admin") return fail("B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n qu\u1EA3n tr\u1ECB.", 403);
      const status = ["pending", "actioned", "dismissed"].includes(String(query.get("status") || "pending")) ? String(query.get("status") || "pending") : "pending";
      const reports = this.db.userReports.filter((item) => item.status === status).slice(-200).reverse().map((item) => ({
        id: item.id,
        reason: item.reason,
        details: item.details || "",
        status: item.status,
        createdAt: item.createdAt,
        reporter: publicUser(this.db.users.find((candidate) => candidate.id === item.reporterId) || { id: "", username: "unknown", displayName: "T\xE0i kho\u1EA3n kh\xF4ng t\u1ED3n t\u1EA1i" }),
        target: publicUser(this.db.users.find((candidate) => candidate.id === item.targetUserId) || { id: "", username: "deleted", displayName: "T\xE0i kho\u1EA3n kh\xF4ng t\u1ED3n t\u1EA1i" })
      }));
      return json({ reports, totalPending: this.db.userReports.filter((item) => item.status === "pending").length });
    }
    if (method === "PATCH" && params[0] === "admin" && params[1] === "reports" && params.length === 3) {
      const required = this.needUser(user);
      if (required) return required;
      if (user.role !== "admin") return fail("B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n qu\u1EA3n tr\u1ECB.", 403);
      const report = this.db.userReports.find((item) => item.id === params[2]);
      if (!report) return fail("Kh\xF4ng t\xECm th\u1EA5y b\xE1o c\xE1o.", 404);
      if (report.status !== "pending") return fail("B\xE1o c\xE1o \u0111\xE3 \u0111\u01B0\u1EE3c x\u1EED l\xFD.", 409);
      const action = asText(body.action, 20), target = this.db.users.find((item) => item.id === report.targetUserId);
      if (action === "dismiss") report.status = "dismissed";
      else if (action === "ban") {
        if (!target) return fail("Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n b\u1ECB b\xE1o c\xE1o.", 404);
        if (target.id === user.id || target.role === "admin") return fail("Kh\xF4ng th\u1EC3 kh\xF3a t\xE0i kho\u1EA3n admin qua x\u1EED l\xFD b\xE1o c\xE1o.", 403);
        target.sessionVersion = (Number(target.sessionVersion) || 0) + 1;
        target.banned = true;
        target.banReason = asText(body.reason || `B\xE1o c\xE1o \u0111\xE3 x\xE1c minh: ${report.reason}`, 180);
        target.bannedAt = nowIso();
        report.status = "actioned";
      } else return fail("H\xE0nh \u0111\u1ED9ng ph\u1EA3i l\xE0 ban ho\u1EB7c dismiss.");
      report.reviewedAt = nowIso();
      report.reviewedBy = user.id;
      audit(this.db, user.id, action === "ban" ? "report_action_ban" : "report_dismissed", report.targetUserId, `report=${report.id}; reason=${report.reason}`);
      return json({ report: { id: report.id, status: report.status }, message: action === "ban" ? "\u0110\xE3 kh\xF3a t\xE0i kho\u1EA3n theo b\xE1o c\xE1o." : "\u0110\xE3 \u0111\xF3ng b\xE1o c\xE1o." });
    }
    if (method === "GET" && params[0] === "admin" && params[1] === "users" && params.length === 3) {
      const required = this.needUser(user);
      if (required) return required;
      if (user.role !== "admin") return fail("B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n qu\u1EA3n tr\u1ECB.", 403);
      const target = this.db.users.find((item) => item.id === params[2]);
      if (!target) return fail("Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n.", 404);
      const against = this.db.userReports.filter((item) => item.targetUserId === target.id);
      const trail = this.db.audit.filter((item) => item.actor === target.id || item.target === target.id).slice(-40).reverse();
      return json({
        user: { ...publicUser(target), email: target.email || "", banReason: target.banReason || "", bannedUntil: target.bannedUntil || null, mutedUntil: untilActive(target.mutedUntil) ? target.mutedUntil : null, muteReason: target.muteReason || "", lastLoginAt: target.lastLoginAt || null, entitlement: entitlementForClient(target.role === "admin" ? { premium: true } : target.entitlement) },
        devices: (Array.isArray(target.knownDevices) ? target.knownDevices : []).map((item) => ({ label: item.label, country: item.country || "", firstSeenAt: item.firstSeenAt, lastSeenAt: item.lastSeenAt })),
        reports: { against: against.length, pendingAgainst: against.filter((item) => item.status === "pending").length, filed: this.db.userReports.filter((item) => item.reporterId === target.id).length },
        strikes: Array.isArray(target.abuseStrikes) ? target.abuseStrikes.length : 0,
        recentActivity: trail.map((item) => ({ at: item.at, action: item.action, byAdmin: item.actor !== target.id && item.actor !== "system", detail: item.detail }))
      });
    }
    if (method === "PATCH" && params[0] === "admin" && params[1] === "users" && params.length === 3) {
      const required = this.needUser(user);
      if (required) return required;
      if (user.role !== "admin") return fail("B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n qu\u1EA3n tr\u1ECB.", 403);
      const target = this.db.users.find((item) => item.id === params[2]);
      if (!target) return fail("Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n.", 404);
      if (target.id === user.id || target.role === "admin") return fail("Kh\xF4ng th\u1EC3 t\xE1c \u0111\u1ED9ng t\xE0i kho\u1EA3n qu\u1EA3n tr\u1ECB vi\xEAn n\xE0y.", 403);
      const action = asText(body.action, 20);
      const reason = asText(body.reason, 180);
      const hours = body.hours == null || body.hours === "" ? null : Number(body.hours);
      if (hours != null && (!Number.isInteger(hours) || hours < 1 || hours > MAX_SANCTION_HOURS)) return fail(`Th\u1EDDi h\u1EA1n ph\u1EA3i l\xE0 s\u1ED1 gi\u1EDD nguy\xEAn t\u1EEB 1 \u0111\u1EBFn ${MAX_SANCTION_HOURS}.`);
      let message = "";
      if (action === "ban") {
        target.sessionVersion = (Number(target.sessionVersion) || 0) + 1;
        target.banned = true;
        target.banReason = reason || "Vi ph\u1EA1m quy \u0111\u1ECBnh c\u1ED9ng \u0111\u1ED3ng";
        target.bannedAt = nowIso();
        target.bannedUntil = hours == null ? null : new Date(Date.now() + hours * 36e5).toISOString();
        message = hours == null ? "\u0110\xE3 kh\xF3a t\xE0i kho\u1EA3n." : `\u0110\xE3 kh\xF3a t\xE0i kho\u1EA3n ${hours} gi\u1EDD.`;
      } else if (action === "unban") {
        target.banned = false;
        target.banReason = "";
        target.bannedAt = null;
        target.bannedUntil = null;
        message = "\u0110\xE3 m\u1EDF kh\xF3a t\xE0i kho\u1EA3n.";
      } else if (action === "mute") {
        const muteHours = hours ?? 24;
        target.mutedUntil = new Date(Date.now() + muteHours * 36e5).toISOString();
        target.muteReason = reason || "Vi ph\u1EA1m quy \u0111\u1ECBnh c\u1ED9ng \u0111\u1ED3ng";
        message = `\u0110\xE3 c\u1EA5m nh\u1EAFn tin v\xE0 k\u1EBFt b\u1EA1n ${muteHours} gi\u1EDD.`;
      } else if (action === "unmute") {
        target.mutedUntil = null;
        target.muteReason = "";
        message = "\u0110\xE3 b\u1ECF c\u1EA5m nh\u1EAFn tin v\xE0 k\u1EBFt b\u1EA1n.";
      } else if (action === "logout") {
        target.sessionVersion = (Number(target.sessionVersion) || 0) + 1;
        message = "\u0110\xE3 \u0111\u0103ng xu\u1EA5t m\u1ECDi thi\u1EBFt b\u1ECB c\u1EE7a t\xE0i kho\u1EA3n.";
      } else if (action === "reset-rating") {
        const base = Number(target.skillTierElo) || 500;
        target.ratingsByCategory = { bullet: base, blitz: base, rapid: base, daily: base };
        target.elo = base;
        message = `\u0110\xE3 \u0111\u1EB7t l\u1EA1i Elo v\u1EC1 ${base}.`;
      } else return fail("H\xE0nh \u0111\u1ED9ng ph\u1EA3i l\xE0 ban, unban, mute, unmute, logout ho\u1EB7c reset-rating.");
      audit(this.db, user.id, `user_${action.replace("-", "_")}`, target.id, [reason, hours != null ? `hours=${hours}` : ""].filter(Boolean).join("; ") || (action === "unban" ? "unbanned" : action));
      return json({ user: { ...publicUser(target), bannedUntil: target.bannedUntil || null, mutedUntil: untilActive(target.mutedUntil) ? target.mutedUntil : null, muteReason: target.muteReason || "", banReason: target.banReason || "" }, message });
    }
    if (method === "POST" && path === "/admin/email/test") {
      const required = this.needUser(user);
      if (required) return required;
      if (user.role !== "admin") return fail("B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n qu\u1EA3n tr\u1ECB.", 403);
      const to = asText(body.to || user.email, 254).toLowerCase();
      if (!EMAIL_RE.test(to)) return fail("Nh\u1EADp \u0111\u1ECBa ch\u1EC9 email h\u1EE3p l\u1EC7 \u0111\u1EC3 g\u1EEDi th\u1EED.");
      if (!mailConfig(this.env)) return fail("Ch\u01B0a c\u1EA5u h\xECnh g\u1EEDi email. C\u1EA7n secret RESEND_API_KEY v\xE0 MAIL_FROM (ho\u1EB7c RESET_EMAIL_FROM).", 503);
      if (!this.userRate(user, "mail-test", 5, 36e5)) return fail("G\u1EEDi th\u1EED qu\xE1 nhi\u1EC1u l\u1EA7n. H\xE3y th\u1EED l\u1EA1i sau.", 429);
      const result = await deliverMail(this.env, buildAccountMail({ to, kind: "test", subject: "C\u1EDD Vua ViLa \u2014 email th\u1EED nghi\u1EC7m", heading: "Email th\u1EED nghi\u1EC7m", footer: "ignore", lines: ["C\u1EA5u h\xECnh g\u1EEDi email c\u1EE7a m\xE1y ch\u1EE7 ViLa \u0111ang ho\u1EA1t \u0111\u1ED9ng.", `Th\u1EDDi \u0111i\u1EC3m: ${mailTime()}`] }));
      audit(this.db, user.id, result.ok ? "email_test_sent" : "email_test_failed", maskEmail(to), result.reason || "ok");
      return result.ok ? json({ ok: true, message: `\u0110\xE3 g\u1EEDi email th\u1EED t\u1EDBi ${maskEmail(to)}.` }) : fail(`G\u1EEDi email th\u1EA5t b\u1EA1i (${result.reason}).`, 502);
    }
    if (method === "GET" && path === "/team/info") {
      const required = this.needUser(user);
      if (required) return required;
      const tier = user.role === "admin" ? "admin" : tierOf(user);
      const limit = dailyLimitFor(tier);
      const used = user.teamUsage && user.teamUsage.day === utcDay() ? Number(user.teamUsage.count) || 0 : 0;
      return json({ enabled: Boolean(this.env?.AI), tier, limit, used, remaining: Math.max(0, limit - used), specialists: SPECIALISTS.map(({ id, name, icon }) => ({ id, name, icon })) });
    }
    if (method === "POST" && path === "/team/ask") {
      const required = this.needUser(user);
      if (required) return required;
      if (!this.env?.AI) return fail("\u0110\u1ED9i chuy\xEAn gia ch\u01B0a \u0111\u01B0\u1EE3c b\u1EADt tr\xEAn m\xE1y ch\u1EE7.", 503);
      let request;
      try {
        request = parseTeamRequest(body, { Chess });
      } catch (error) {
        if (error instanceof TeamInputError) return fail(error.message, 400);
        throw error;
      }
      const tier = user.role === "admin" ? "admin" : tierOf(user);
      const quota = consumeDailyQuestion(user, tier);
      if (!quota.allowed) return json({ error: `B\u1EA1n \u0111\xE3 d\xF9ng h\u1EBFt ${quota.limit} c\xE2u h\u1ECFi h\xF4m nay. L\u01B0\u1EE3t m\u1EDBi c\xF3 l\xFAc 7 gi\u1EDD s\xE1ng mai (gi\u1EDD Vi\u1EC7t Nam).`, limit: quota.limit, remaining: 0, resetsAt: quota.resetsAt }, 429);
      const specialists = pickSpecialists(request);
      try {
        const team = await runTeam({ ai: this.env.AI, model: String(this.env.TEAM_MODEL || DEFAULT_TEAM_MODEL), request, specialists });
        return json({ answers: team.answers, failed: team.failed, combined: team.combined, usage: { limit: quota.limit, used: quota.used, remaining: quota.remaining, resetsAt: quota.resetsAt } });
      } catch (error) {
        refundDailyQuestion(user);
        if (error instanceof TeamUnavailableError) return json({ error: error.message, quota: error.quota }, 503);
        console.error("[VILA team] Workers AI error:", String(error?.message || error).slice(0, 200));
        return fail("\u0110\u1ED9i chuy\xEAn gia g\u1EB7p l\u1ED7i. H\xE3y th\u1EED l\u1EA1i sau.", 502);
      }
    }
    if (method === "POST" && path === "/me/review-access") {
      const required = this.needUser(user);
      if (required) return required;
      const gameId = asText(body.gameId, 120);
      if (user.role === "admin") return json({ allowed: true, reason: "admin", entitlement: entitlementForClient({ premium: true }) });
      const access = reviewAccess(user.entitlement, gameId);
      if (access.allowed && access.consumesFree) {
        user.entitlement = consumeFreeReview(user.entitlement, gameId || `game-${Date.now()}`);
        audit(this.db, user.id, "free_review_used", gameId, "");
      }
      return json({ allowed: access.allowed, reason: access.reason, entitlement: entitlementForClient(user.entitlement) }, access.allowed ? 200 : 402);
    }
    if (method === "POST" && path === "/me/redeem-code") {
      const required = this.needUser(user);
      if (required) return required;
      const code = asText(body.code, 80).toLowerCase();
      if (!/^[a-z0-9-]{4,80}$/.test(code)) return fail("Nh\u1EADp m\xE3 k\xEDch ho\u1EA1t h\u1EE3p l\u1EC7.");
      const secret = String(this.env.VILA_TRIAL_CODE_SECRET || "");
      const proHash = String(this.env.VILA_PRO_TRIAL_CODE_HMAC || "").toLowerCase();
      const premiumHash = String(this.env.VILA_PREMIUM_TRIAL_CODE_HMAC || "").toLowerCase();
      if (new TextEncoder().encode(secret).length < 32 || !/^[a-f0-9]{64}$/.test(proHash) || !/^[a-f0-9]{64}$/.test(premiumHash)) return fail("M\xE1y ch\u1EE7 ch\u01B0a c\u1EA5u h\xECnh kho m\xE3 d\xF9ng th\u1EED an to\xE0n. Ch\u1EE7 d\u1EF1 \xE1n c\u1EA7n thi\u1EBFt l\u1EADp ba bi\u1EBFn b\xED m\u1EADt VILA_TRIAL_CODE_*.", 503);
      const digest = await hmacHex(secret, code);
      const type = constantTimeEqual(digest, proHash) ? "pro-5d" : constantTimeEqual(digest, premiumHash) ? "premium-1m" : "";
      if (!type) {
        audit(this.db, user.id, "trial_code_invalid", user.id, "");
        return fail("M\xE3 kh\xF4ng \u0111\xFAng ho\u1EB7c \u0111\xE3 b\u1ECB thu h\u1ED3i.");
      }
      if (user.role === "admin") return fail("T\xE0i kho\u1EA3n admin \u0111\xE3 c\xF3 quy\u1EC1n qu\u1EA3n tr\u1ECB, kh\xF4ng c\u1EA7n d\xF9ng m\xE3 th\u1EED.", 409);
      const prior = Array.isArray(user.trialCodeRedemptions) ? user.trialCodeRedemptions : [];
      if (prior.some((item) => item?.type === type)) return fail("T\xE0i kho\u1EA3n n\xE0y \u0111\xE3 s\u1EED d\u1EE5ng m\xE3 d\xF9ng th\u1EED t\u01B0\u01A1ng \u1EE9ng r\u1ED3i.", 409);
      const now = Date.now();
      const current = normalizeEntitlement(user.entitlement);
      if (effectivePlan(current, now) === "premium" && current.premiumExpiresAt == null) return fail("T\xE0i kho\u1EA3n \u0111\xE3 c\xF3 Premium tr\u1ECDn \u0111\u1EDDi; m\xE3 d\xF9ng th\u1EED kh\xF4ng l\xE0m thay \u0111\u1ED5i g\xF3i hi\u1EC7n t\u1EA1i.", 409);
      const entitlement = type === "pro-5d" ? grantProCodeTrial(current, now) : grantPremiumCodeTrial(current, now);
      const expiresAt = type === "pro-5d" ? entitlement.proExpiresAt : entitlement.premiumExpiresAt;
      user.entitlement = entitlement;
      user.trialCodeRedemptions = [...prior, { type, redeemedAt: nowIso() }].slice(-10);
      const durationMs = type === "pro-5d" ? PRO_CODE_TRIAL_DURATION_MS : PREMIUM_CODE_TRIAL_DURATION_MS;
      audit(this.db, user.id, "trial_code_redeemed", user.id, `${type};durationMs=${durationMs}`);
      return json({ ok: true, plan: type === "pro-5d" ? "pro" : "premium", trial: true, expiresAt: new Date(expiresAt).toISOString(), user: selfUser(user), message: type === "pro-5d" ? "\u0110\xE3 k\xEDch ho\u1EA1t Pro d\xF9ng th\u1EED 5 ng\xE0y." : "\u0110\xE3 k\xEDch ho\u1EA1t Premium d\xF9ng th\u1EED 1 ph\xFAt." });
    }
    if (method === "PATCH" && params[0] === "admin" && params[1] === "users" && params[3] === "plan" && params.length === 4) {
      const required = this.needUser(user);
      if (required) return required;
      if (user.role !== "admin") return fail("B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n qu\u1EA3n tr\u1ECB.", 403);
      const target = this.db.users.find((item) => item.id === params[2]);
      if (!target) return fail("Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n.", 404);
      const action = asText(body.action, 10), plan = asText(body.plan, 10);
      if (target.banned) return fail("Kh\xF4ng th\u1EC3 \u0111\u1ED5i g\xF3i c\u1EE7a t\xE0i kho\u1EA3n \u0111ang b\u1ECB kh\xF3a.", 409);
      const days = body.days == null ? null : Number(body.days);
      if (days != null && (plan !== "pro" || action !== "grant" || !Number.isInteger(days) || days < 1 || days > 366)) return fail("S\u1ED1 ng\xE0y ch\u1EC9 \xE1p d\u1EE5ng khi c\u1EA5p Pro v\xE0 ph\u1EA3i t\u1EEB 1 \u0111\u1EBFn 366.");
      try {
        if (action === "grant" && plan === "pro" && days != null) {
          const ent = normalizeEntitlement(target.entitlement);
          if (ent.premium && ent.premiumExpiresAt == null) return fail("T\xE0i kho\u1EA3n \u0111\xE3 c\xF3 Premium tr\u1ECDn \u0111\u1EDDi; kh\xF4ng c\u1EA7n c\u1EA5p Pro.", 409);
          const now = Date.now();
          const base = ent.proExpiresAt != null && ent.proExpiresAt > now ? ent.proExpiresAt : now;
          target.entitlement = { ...ent, proExpiresAt: base + days * DAY_MS };
        } else if (action === "grant") target.entitlement = grantPlan(normalizeEntitlement(target.entitlement), plan);
        else if (action === "revoke") target.entitlement = revokePlan(normalizeEntitlement(target.entitlement), plan);
        else return fail("H\xE0nh \u0111\u1ED9ng ch\u1EC9 \u0111\u01B0\u1EE3c l\xE0 grant ho\u1EB7c revoke.");
      } catch (error) {
        return fail(error.message);
      }
      audit(this.db, user.id, `plan_${action}`, target.id, days != null ? `${plan};days=${days}` : plan);
      const planName = plan === "premium" ? "Premium" : plan === "pro" ? "Pro" : plan === "diamond" ? "Kim C\u01B0\u01A1ng" : plan;
      const notice = action === "grant" ? `VILA Admin: B\u1EA1n \u0111\xE3 \u0111\u01B0\u1EE3c c\u1EA5p g\xF3i ${planName}${days != null ? ` (${days} ng\xE0y)` : ""}. Huy hi\u1EC7u ${planName} s\u1EBD hi\u1EC3n th\u1ECB tr\xEAn h\u1ED3 s\u01A1 c\u1EE7a b\u1EA1n.` : `VILA Admin: G\xF3i ${planName} c\u1EE7a b\u1EA1n \u0111\xE3 \u0111\u01B0\u1EE3c thu h\u1ED3i.`;
      this.db.directMessages.push({ id: crypto.randomUUID(), from: user.id, to: target.id, text: notice, createdAt: nowIso(), readAt: null });
      this.db.directMessages = this.db.directMessages.slice(-1e5);
      return json({ user: { ...publicUser(target), entitlement: entitlementForClient(target.entitlement) }, message: action === "grant" ? `\u0110\xE3 c\u1EA5p g\xF3i ${planName}${days != null ? ` ${days} ng\xE0y` : ""}.` : `\u0110\xE3 thu h\u1ED3i g\xF3i ${planName}.` });
    }
    if (method === "GET" && path === "/me/billing-config") {
      const required = this.needUser(user);
      if (required) return required;
      return json({ enabled: billingConfigured(this.env), products: billingProducts(this.env), accountId: await accountBindingId(user.id) });
    }
    if (method === "POST" && path === "/me/purchase/verify") {
      const required = this.needUser(user);
      if (required) return required;
      return this.purchaseVerify(user, body);
    }
    if (method === "POST" && path === "/admin/billing/sync-voided") {
      const required = this.needUser(user);
      if (required) return required;
      if (user.role !== "admin") return fail("B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n qu\u1EA3n tr\u1ECB.", 403);
      try {
        return json(await this.syncVoided());
      } catch (error) {
        return fail(error.message || "Kh\xF4ng \u0111\u1ED3ng b\u1ED9 \u0111\u01B0\u1EE3c ho\xE0n ti\u1EC1n.", error.status || 502);
      }
    }
    if (internal && method === "POST" && path === "/__cron/sync-voided") {
      try {
        return json(await this.syncVoided());
      } catch (error) {
        return fail(error.message || "Kh\xF4ng \u0111\u1ED3ng b\u1ED9 \u0111\u01B0\u1EE3c ho\xE0n ti\u1EC1n.", error.status || 502);
      }
    }
    if (method === "POST" && path === "/admin/announcements") {
      const required = this.needUser(user);
      if (required) return required;
      if (user.role !== "admin") return fail("B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n qu\u1EA3n tr\u1ECB.", 403);
      const title = asText(body.title, 100), message = asText(body.message, 1200);
      if (title.length < 3 || message.length < 5) return fail("Ti\xEAu \u0111\u1EC1 c\u1EA7n \xEDt nh\u1EA5t 3 k\xFD t\u1EF1, n\u1ED9i dung \xEDt nh\u1EA5t 5 k\xFD t\u1EF1.");
      const announcement = { id: crypto.randomUUID(), title, message, author: user.username, createdAt: nowIso() };
      this.db.announcements.push(announcement);
      this.db.announcements = this.db.announcements.slice(-500);
      audit(this.db, user.id, "announcement_published", announcement.id, title);
      return json({ announcement, message: "\u0110\xE3 g\u1EEDi th\xF4ng b\xE1o t\u1EDBi h\u1ED9p th\u01B0 trong app." }, 201);
    }
    if (method === "GET" && path === "/admin/audit") {
      const required = this.needUser(user);
      if (required) return required;
      if (user.role !== "admin") return fail("B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n qu\u1EA3n tr\u1ECB.", 403);
      return json({ events: this.db.audit.slice(-clamp(Number(query.get("limit")) || 100, 1, 200)).reverse() });
    }
    return fail("API ch\u01B0a \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3 trong backend Cloudflare n\xE0y.", 404);
  }
  entitlementPayload(user) {
    return entitlementForClient(user.entitlement);
  }
  async purchaseVerify(user, body) {
    if (!billingConfigured(this.env)) return fail("Thanh to\xE1n ch\u01B0a \u0111\u01B0\u1EE3c b\u1EADt tr\xEAn m\xE1y ch\u1EE7.", 503);
    const productId = asText(body.productId, 80), purchaseToken = asText(body.purchaseToken, 1e3);
    const plan = planForProduct(this.env, productId);
    if (!plan || !purchaseToken) return fail("S\u1EA3n ph\u1EA9m ho\u1EB7c m\xE3 giao d\u1ECBch kh\xF4ng h\u1EE3p l\u1EC7.");
    const id = await sha256Hex(purchaseToken);
    const existing = this.db.purchases.find((item) => item.id === id);
    if (existing) {
      if (existing.userId !== user.id) {
        audit(this.db, user.id, "purchase_token_conflict", id.slice(0, 12), "token belongs to another account");
        return fail("Giao d\u1ECBch n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c d\xF9ng cho t\xE0i kho\u1EA3n kh\xE1c.", 409);
      }
      if (existing.status === "voided") return fail("Giao d\u1ECBch n\xE0y \u0111\xE3 b\u1ECB ho\xE0n ti\u1EC1n.", 409);
      return json({ granted: false, alreadyGranted: true, plan: existing.plan, consume: existing.plan === "pro" || existing.plan === "diamond", entitlement: this.entitlementPayload(user) });
    }
    let info;
    try {
      info = await lookupPurchase(this.env, { productId, purchaseToken });
    } catch (error) {
      if (error instanceof BillingError) return fail(error.message, error.status);
      throw error;
    }
    if (info.state === "pending") return json({ granted: false, pending: true, message: "Giao d\u1ECBch \u0111ang ch\u1EDD x\u1EED l\xFD. G\xF3i s\u1EBD \u0111\u01B0\u1EE3c k\xEDch ho\u1EA1t khi Google x\xE1c nh\u1EADn thanh to\xE1n." }, 202);
    if (info.state !== "purchased") return fail("Giao d\u1ECBch ch\u01B0a ho\xE0n t\u1EA5t ho\u1EB7c \u0111\xE3 b\u1ECB h\u1EE7y.", 402);
    if (!constantTimeEqual(info.accountId, await accountBindingId(user.id))) {
      audit(this.db, user.id, "purchase_account_mismatch", id.slice(0, 12), productId);
      return fail("Giao d\u1ECBch n\xE0y kh\xF4ng thu\u1ED9c t\xE0i kho\u1EA3n \u0111ang \u0111\u0103ng nh\u1EADp.", 403);
    }
    if (info.orderId && this.db.purchases.some((item) => item.orderId === info.orderId)) return fail("Giao d\u1ECBch n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c ghi nh\u1EADn.", 409);
    user.entitlement = grantPlan(normalizeEntitlement(user.entitlement), plan);
    this.db.purchases.push({ id, userId: user.id, productId, plan, orderId: info.orderId, status: "granted", grantedAt: nowIso(), purchaseTimeMillis: info.purchaseTimeMillis, priceVnd: Number(plan === "premium" ? this.env?.PLAY_PRICE_VND_PREMIUM : plan === "diamond" ? this.env?.PLAY_PRICE_VND_DIAMOND : this.env?.PLAY_PRICE_VND_PRO) || 0 });
    audit(this.db, user.id, "purchase_granted", id.slice(0, 12), `${plan}; order=${info.orderId}`);
    if (!info.acknowledged) {
      let acked = false;
      try {
        acked = await acknowledgePurchase(this.env, { productId, purchaseToken }, fetch, info.accessToken);
      } catch {
        acked = false;
      }
      if (!acked) audit(this.db, user.id, "purchase_ack_failed", id.slice(0, 12), "client must acknowledge");
    }
    return json({ granted: true, alreadyGranted: false, plan, consume: plan === "pro" || plan === "diamond", entitlement: this.entitlementPayload(user) }, 201);
  }
  /** Revoke what Google refunded or charged back. Idempotent: a purchase is only voided once. */
  async syncVoided(now = Date.now()) {
    if (!billingConfigured(this.env)) throw new BillingError("Thanh to\xE1n ch\u01B0a \u0111\u01B0\u1EE3c b\u1EADt tr\xEAn m\xE1y ch\u1EE7.", 503);
    const voided = await listVoidedPurchases(this.env, now - 30 * DAY_MS);
    let revoked = 0;
    for (const item of voided) {
      const id = await sha256Hex(item.purchaseToken);
      const record = this.db.purchases.find((entry) => entry.id === id);
      if (!record || record.status !== "granted") continue;
      record.status = "voided";
      record.voidedAt = nowIso();
      const target = this.db.users.find((entry) => entry.id === record.userId);
      if (target) target.entitlement = refundPurchase(target.entitlement, record.plan, now);
      audit(this.db, "system", "purchase_voided", id.slice(0, 12), `${record.plan}; user=${record.userId}`);
      revoked++;
    }
    return { checked: voided.length, revoked };
  }
  chooseAvatarId() {
    const used = new Set(this.db.users.filter((item) => Number.isInteger(item.avatarId)).map((item) => item.avatarId));
    for (let i = 0; i < 1e3; i++) {
      const id = Math.floor(Math.random() * 1e3);
      if (!used.has(id)) return id;
    }
    return Math.floor(Math.random() * 1e3);
  }
  async requireUser(user) {
    return user ? null : fail("B\u1EA1n c\u1EA7n \u0111\u0103ng nh\u1EADp l\u1EA1i \u0111\u1EC3 ti\u1EBFp t\u1EE5c.", 401);
  }
  async rankedQueue(user, body) {
    const required = await this.requireUser(user);
    if (required) return required;
    const active = activeMatchFor(this.db, user.id);
    if (active) return json(joinPayload(this.db, user.id));
    const timeControl = asText(body.timeControl, 16) || "1d";
    const spec = CONTROLS[timeControl];
    if (!spec) return fail("M\u1ED1c th\u1EDDi gian kh\xF4ng \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3.");
    const now = Date.now();
    this.db.rankedQueue = this.db.rankedQueue.filter((entry) => now - Number(entry.joinedAt || 0) < 18e4 && this.db.users.some((candidate2) => candidate2.id === entry.userId && !candidate2.banned) && !activeMatchFor(this.db, entry.userId));
    const self = this.db.rankedQueue.find((entry) => entry.userId === user.id);
    if (self?.timeControl === timeControl) return json(joinPayload(this.db, user.id));
    if (self) this.db.rankedQueue = this.db.rankedQueue.filter((entry) => entry.userId !== user.id);
    const ratings = ensureRatings(user), ownElo = ratings[spec.category];
    const candidates = this.db.rankedQueue.filter((entry) => entry.timeControl === timeControl && entry.timeCategory === spec.category && entry.userId !== user.id && Math.abs(Number(entry.elo) - ownElo) <= matchmakingWindow(now - Number(entry.joinedAt || now)));
    if (!candidates.length) {
      this.db.rankedQueue.push({ userId: user.id, elo: ownElo, timeControl, timeCategory: spec.category, joinedAt: now });
      return json({ ...joinPayload(this.db, user.id), rating: ownElo, timeControl, timeCategory: spec.category }, 202);
    }
    const candidate = candidates[Math.floor(Math.random() * candidates.length)];
    this.db.rankedQueue = this.db.rankedQueue.filter((entry) => entry.userId !== candidate.userId && entry.userId !== user.id);
    const opponent = this.db.users.find((item) => item.id === candidate.userId);
    if (!opponent || opponent.banned || activeMatchFor(this.db, opponent.id)) {
      this.db.rankedQueue.push({ userId: user.id, elo: ownElo, timeControl, timeCategory: spec.category, joinedAt: now });
      return json({ ...joinPayload(this.db, user.id), rating: ownElo, timeControl, timeCategory: spec.category }, 202);
    }
    const ownRating = ensureRatings(user)[spec.category];
    const opponentRating = ensureRatings(opponent)[spec.category];
    const whiteId = crypto.getRandomValues(new Uint8Array(1))[0] % 2 ? user.id : opponent.id;
    const chess = new Chess();
    const otherId = whiteId === user.id ? opponent.id : user.id;
    const match = { id: crypto.randomUUID(), ranked: true, status: "active", players: { w: whiteId, b: otherId }, startFen: chess.fen(), fen: chess.fen(), moves: [], result: null, resultReason: "", createdAt: nowIso(), lastMoveAt: nowIso(), eloChanges: {}, timeControl, timeCategory: spec.category, clockEnabled: true, clockRemainingMs: { w: spec.base, b: spec.base }, clockIncrementMs: spec.increment, clockUpdatedAt: now, turnStartedAt: now, fairPlaySignals: { [whiteId]: createRankedFairPlayState(), [otherId]: createRankedFairPlayState() }, fairPlayEvents: [], presence: { [whiteId]: now, [otherId]: now } };
    this.db.matches.push(match);
    this.db.matches = this.db.matches.slice(-500);
    audit(this.db, user.id, "ranked_match_created", match.id, `versus=${opponent.username}; ${spec.category} ${timeControl}; ratings=${ownRating}:${opponentRating}`);
    return json({ queued: false, ...makeMatchPayload(this.db, match, user.id) }, 201);
  }
  async rankedStatus(user) {
    const required = await this.requireUser(user);
    if (required) return required;
    const now = Date.now();
    this.db.rankedQueue = this.db.rankedQueue.filter((entry2) => now - Number(entry2.joinedAt || 0) < 18e4 && this.db.users.some((candidate) => candidate.id === entry2.userId && !candidate.banned) && !activeMatchFor(this.db, entry2.userId));
    const active = activeMatchFor(this.db, user.id);
    if (active) {
      const chess = new Chess(active.fen || active.startFen || void 0);
      const timedOut = settleClock(active, now, chess.turn());
      if (timedOut) {
        finishMatch(this.db, active, timedOut === "w" ? "0-1" : "1-0", "time_forfeit");
        return json({ queued: false, ...makeMatchPayload(this.db, active, user.id) });
      }
      active.presence = active.presence || {};
      active.presence[user.id] = now;
      const presenceExpired = active.timeCategory === "daily" ? [] : [active.players.w, active.players.b].filter((id) => !id || now - Number(active.presence[id] || Date.parse(active.createdAt) || now) > 9e4).sort((a, b) => Number(active.presence[a]) - Number(active.presence[b]));
      if (presenceExpired.length) {
        const quitter = presenceExpired[0];
        const winner = quitter === active.players.w ? active.players.b : active.players.w;
        finishMatch(this.db, active, winner === active.players.w ? "1-0" : "0-1", "disconnect_timeout", quitter);
        return json({ queued: false, ...makeMatchPayload(this.db, active, user.id) });
      }
      return json({ queued: false, ...makeMatchPayload(this.db, active, user.id) });
    }
    const entry = this.db.rankedQueue.find((item) => item.userId === user.id);
    if (entry) return json(joinPayload(this.db, user.id));
    const recent = this.db.matches.filter((match) => match?.ranked && (match.status === "finished" || match.status === "aborted") && (match.players.w === user.id || match.players.b === user.id) && now - (Date.parse(match.finishedAt || "") || 0) < 15 * 6e4).sort((a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt))[0];
    if (recent) return json({ queued: false, ...makeMatchPayload(this.db, recent, user.id) });
    return json({ queued: false, rating: Number(user.elo) || 1200, ratingsByCategory: ensureRatings(user), waitMs: 0 });
  }
  async rankedMove(user, matchId, body) {
    const required = await this.requireUser(user);
    if (required) return required;
    const match = rankedMatchById(this.db, matchId);
    if (!match || match.status !== "active") return fail("Kh\xF4ng t\xECm th\u1EA5y tr\u1EADn x\u1EBFp h\u1EA1ng \u0111ang ho\u1EA1t \u0111\u1ED9ng.", 404);
    const color = match.players.w === user.id ? "w" : match.players.b === user.id ? "b" : "";
    if (!color) return fail("B\u1EA1n kh\xF4ng thu\u1ED9c tr\u1EADn \u0111\u1EA5u n\xE0y.", 403);
    const chess = new Chess(match.fen);
    const timeout = settleClock(match, Date.now(), chess.turn());
    if (timeout) {
      finishMatch(this.db, match, timeout === "w" ? "0-1" : "1-0", "time_forfeit");
      return fail("H\u1EBFt gi\u1EDD. M\xE1y ch\u1EE7 \u0111\xE3 x\xE1c nh\u1EADn k\u1EBFt qu\u1EA3.", 409);
    }
    match.presence = match.presence || {};
    match.presence[user.id] = Date.now();
    if (Number(body.expectedPly) !== (match.moves || []).length) return json({ error: "B\xE0n c\u1EDD \u0111\xE3 \u0111\u01B0\u1EE3c c\u1EADp nh\u1EADt b\u1EDFi \u0111\u1ED1i th\u1EE7. \u0110ang \u0111\u1ED3ng b\u1ED9 l\u1EA1i.", match: makeMatchPayload(this.db, match, user.id).match }, 409);
    if (chess.turn() !== color) return json({ error: "Ch\u01B0a \u0111\u1EBFn l\u01B0\u1EE3t c\u1EE7a b\u1EA1n.", match: makeMatchPayload(this.db, match, user.id).match }, 409);
    const legalMoveCount = chess.moves().length;
    const from = asText(body.from, 2), to = asText(body.to, 2), promotion = asText(body.promotion, 1).toLowerCase();
    if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to) || promotion && !/^[qrbn]$/.test(promotion)) return fail("N\u01B0\u1EDBc \u0111i kh\xF4ng h\u1EE3p l\u1EC7.");
    let move;
    try {
      move = chess.move({ from, to, ...promotion ? { promotion } : {} });
    } catch {
      move = null;
    }
    if (!move) return fail("N\u01B0\u1EDBc \u0111i kh\xF4ng h\u1EE3p l\u1EC7 theo lu\u1EADt c\u1EDD vua.");
    const moveAt = Date.now();
    const turnDurationMs = Math.max(0, moveAt - (Number(match.turnStartedAt) || Date.parse(match.createdAt) || moveAt));
    match.fairPlaySignals = match.fairPlaySignals && typeof match.fairPlaySignals === "object" ? match.fairPlaySignals : {};
    const signal = match.fairPlaySignals[user.id] || (match.fairPlaySignals[user.id] = createRankedFairPlayState());
    const fairPlay = assessRankedFairPlayMove(signal, { userId: user.id, turnDurationMs, legalMoveCount, ply: (match.moves || []).length, now: moveAt });
    const focusCheck = assessRankedFocusSignal(fairPlay.state, { userId: user.id, focusLostMs: body.focusLostMs, focusCount: body.focusCount, turnDurationMs, legalMoveCount, ply: (match.moves || []).length, now: moveAt });
    match.fairPlaySignals[user.id] = focusCheck.state;
    fairPlay.events.push(...focusCheck.events);
    match.fairPlayEvents = Array.isArray(match.fairPlayEvents) ? match.fairPlayEvents : [];
    for (const event of fairPlay.events) {
      if (match.fairPlayEvents.length < 100) match.fairPlayEvents.push(event);
      audit(this.db, "system", "ranked_fair_play_signal", match.id, `user=${user.id}; ${event.type}; manual review only`);
    }
    match.moves.push({ from: move.from, to: move.to, promotion: move.promotion || "", san: move.san, flags: move.flags, turnDurationMs, legalMoveCount });
    match.fen = chess.fen();
    match.lastMoveAt = nowIso();
    if (match.clockEnabled && match.clockRemainingMs) {
      if (match.timeCategory === "daily") match.clockRemainingMs[color] = CONTROLS[match.timeControl]?.base || 864e5;
      else match.clockRemainingMs[color] = Math.max(0, Number(match.clockRemainingMs[color]) || 0) + Math.max(0, Number(match.clockIncrementMs) || 0);
    }
    match.clockUpdatedAt = Date.now();
    match.turnStartedAt = Date.now();
    const result = ratedResult(chess);
    if (result) finishMatch(this.db, match, result, chess.isCheckmate() ? "checkmate" : "draw");
    return json(makeMatchPayload(this.db, match, user.id));
  }
  async rankedFinish(user, matchId, action) {
    const required = await this.requireUser(user);
    if (required) return required;
    const match = rankedMatchById(this.db, matchId);
    if (action === "abandon" && (!match || match.status !== "active")) return json({ abandoned: false });
    if (!match || match.status !== "active") return fail("Tr\u1EADn \u0111\u1EA5u \u0111\xE3 k\u1EBFt th\xFAc ho\u1EB7c kh\xF4ng t\u1ED3n t\u1EA1i.", 404);
    const color = match.players.w === user.id ? "w" : match.players.b === user.id ? "b" : "";
    if (!color) return fail("B\u1EA1n kh\xF4ng thu\u1ED9c tr\u1EADn \u0111\u1EA5u n\xE0y.", 403);
    finishMatch(this.db, match, color === "w" ? "0-1" : "1-0", action === "resign" ? "resignation" : "abandoned", user.id);
    audit(this.db, user.id, action === "resign" ? "ranked_match_resigned" : "ranked_match_abandoned", match.id, match.status === "aborted" ? "aborted before both players moved; no rating change" : "rating penalty applied");
    return json(action === "abandon" ? { abandoned: true, ...makeMatchPayload(this.db, match, user.id) } : makeMatchPayload(this.db, match, user.id));
  }
};
export {
  ChessState,
  index_default as default
};
