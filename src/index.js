import { Chess } from 'chess.js';
import { entitlementForClient, normalizeEntitlement, reviewAccess, consumeFreeReview, grantPlan, grantProTrial, grantProCodeTrial, grantPremiumCodeTrial, effectivePlan, revokePlan, refundPurchase, DAY_MS, PRO_CODE_TRIAL_DURATION_MS, PREMIUM_CODE_TRIAL_DURATION_MS } from './plans.js';
import { RANKED_CLOCK_PRESETS } from './clock.js';
import { createRankedFairPlayState, assessRankedFairPlayMove, assessRankedFocusSignal } from './ranked-fair-play.js';
import { BillingError, billingConfigured, billingProducts, planForProduct, accountBindingId, sha256Hex, lookupPurchase, acknowledgePurchase, listVoidedPurchases } from './billing.js';

const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const TOKEN_REFRESH_AFTER_SECONDS = 7 * 24 * 60 * 60;
const MIN_PASSWORD_LENGTH = 8;
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,24}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_JSON_BODY_BYTES = 65_536;
const DEFAULT_ALLOWED_ORIGINS = Object.freeze([
  'https://localhost', 'capacitor://localhost', 'ionic://localhost'
]);
// Best-effort per-isolate throttling for proxy routes. Durable social endpoints also
// have persistent rate limits in ChessState; production should add Cloudflare WAF rules.
const edgeRateBuckets = new Map();
const SECURITY_HEADERS = Object.freeze({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
});
function corsPolicy(request, env = {}) {
  const configured = typeof env.CORS_ORIGINS === 'string' ? env.CORS_ORIGINS.split(',').map(value => value.trim()).filter(Boolean) : [];
  const allowed = new Set([...DEFAULT_ALLOWED_ORIGINS, ...configured]);
  const origin = request.headers.get('Origin') || '';
  const headers = { Vary: 'Origin' };
  if (!origin) return { allowed: true, headers };
  if (!allowed.has(origin)) return { allowed: false, headers };
  Object.assign(headers, {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Max-Age': '600'
  });
  return { allowed: true, headers };
}
function secureResponse(response, corsHeaders = {}, request = null) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value);
  headers.set('Cache-Control', headers.get('Cache-Control') || 'no-store');
  for (const [key, value] of Object.entries(corsHeaders)) headers.set(key, value);
  try { if (request && new URL(request.url).protocol === 'https:') headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains'); } catch {}
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
function edgeRateLimit(request, path) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const policy = path.startsWith('/api/lichess/') ? ['lichess-proxy', 20, 60_000]
    : path === '/api/openings/explorer' ? ['opening-proxy', 30, 60_000]
    : path.startsWith('/api/puzzles/') ? ['puzzle-proxy', 30, 60_000] : ['external-proxy', 80, 60_000];
  const [name, maximum, windowMs] = policy;
  const key = `${name}:${ip}`;
  const now = Date.now();
  const recent = (edgeRateBuckets.get(key) || []).filter(timestamp => now - timestamp < windowMs);
  if (recent.length >= maximum) return Math.max(1, Math.ceil((windowMs - (now - recent[0])) / 1000));
  recent.push(now);
  edgeRateBuckets.set(key, recent);
  if (edgeRateBuckets.size > 5000) {
    for (const [bucket, hits] of edgeRateBuckets) if (!hits.length || now - hits[hits.length - 1] > 3_600_000) edgeRateBuckets.delete(bucket);
    while (edgeRateBuckets.size > 5000) edgeRateBuckets.delete(edgeRateBuckets.keys().next().value);
  }
  return 0;
}
// One canonical clock catalogue shared with the UI and Node backend so no
// visible preset can be offered by the client and rejected by the Worker.
const CONTROLS = Object.freeze(Object.fromEntries(RANKED_CLOCK_PRESETS.map(preset => [preset.value, {
  category: preset.category,
  base: preset.baseSeconds * 1000,
  increment: preset.incrementSeconds * 1000
}])));
const nowIso = () => new Date().toISOString();
const asText = (value, max = 120) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const defaultDb = () => ({ users: [], friendRequests: [], directMessages: [], userReports: [], purchaseRequests: [], audit: [], matches: [], rankedQueue: [], announcements: [], announcementReads: {}, userHistory: {}, rateLimits: {}, purchases: [], tokenSecret: '' });

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extraHeaders } });
}
function fail(message, status = 400) { return json({ error: message }, status); }
function b64url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function decodeB64url(value) {
  const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}
function utf8(value) { return new TextEncoder().encode(value); }
function fromUtf8(bytes) { return new TextDecoder().decode(bytes); }
function hex(bytes) { return [...bytes].map(n => n.toString(16).padStart(2, '0')).join(''); }
function fromHex(text) { const out = new Uint8Array(Math.floor(text.length / 2)); for (let i = 0; i < out.length; i++) out[i] = parseInt(text.slice(i * 2, i * 2 + 2), 16); return out; }
function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}
async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey('raw', utf8(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(new Uint8Array(await crypto.subtle.sign('HMAC', key, utf8(message))));
}
// Cloudflare Workers' WebCrypto rejects PBKDF2 above 100,000 iterations (it throws), so this is the maximum.
// Do not raise it: existing accounts were hashed with exactly this value.
const PBKDF2_ITERATIONS = 100_000;
async function passwordHash(password, saltHex) {
  const key = await crypto.subtle.importKey('raw', utf8(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations: PBKDF2_ITERATIONS }, key, 256);
  return hex(new Uint8Array(bits));
}
async function signToken(db, user) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = { sub: user.id, sv: Number(user.sessionVersion) || 0, iat: issuedAt, exp: issuedAt + TOKEN_TTL_SECONDS };
  const body = b64url(utf8(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey('raw', decodeB64url(db.tokenSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, utf8(body));
  return `${body}.${b64url(new Uint8Array(sig))}`;
}
async function verifyToken(db, token) {
  try {
    const tokenText = String(token || '');
    if (!tokenText || tokenText.length > 4096) return null;
    const parts = tokenText.split('.');
    if (parts.length !== 2) return null;
    const key = await crypto.subtle.importKey('raw', decodeB64url(db.tokenSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify('HMAC', key, decodeB64url(parts[1]), utf8(parts[0]));
    if (!valid) return null;
    const payload = JSON.parse(fromUtf8(decodeB64url(parts[0])));
    if (!payload.sub || !Number.isFinite(payload.exp) || payload.exp <= Date.now() / 1000) return null;
    const user = db.users.find(item => item.id === payload.sub);
    if (!user || user.banned || Number(payload.sv) !== (Number(user.sessionVersion) || 0)) return null;
    return { user, payload };
  } catch { return null; }
}
function ensureRatings(user) {
  const fallback = clamp(Math.round(Number(user?.elo) || 1200), 100, 4000);
  const existing = user?.ratingsByCategory && typeof user.ratingsByCategory === 'object' ? user.ratingsByCategory : {};
  const ratings = {};
  for (const category of ['bullet', 'blitz', 'rapid', 'daily']) {
    const n = Number(existing[category]);
    ratings[category] = Number.isFinite(n) && n >= 100 && n <= 4000 ? Math.round(n) : fallback;
  }
  if (user) user.ratingsByCategory = ratings;
  return ratings;
}
function stableAvatarId(user) {
  // Deterministic FNV-1a hash: the same account gets the same avatar across
  // Worker isolates/restarts without awaiting WebCrypto in a sync mapper.
  const input = String(user?.id || user?.username || 'vila');
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) hash = Math.imul(hash ^ input.charCodeAt(i), 0x01000193) >>> 0;
  return hash % 1000;
}
function publicUser(user) {
  if (!user || typeof user !== 'object') return null;
  const ratingsByCategory = ensureRatings(user);
  const avatarId = Number.isInteger(user.avatarId) && user.avatarId >= 0 && user.avatarId < 1000 ? user.avatarId : stableAvatarId(user);
  user.avatarId = avatarId;
  return {
    id: user.id, username: user.username, displayName: user.displayName, avatarId,
    bio: user.bio || '', role: user.role === 'admin' ? 'admin' : 'player',
    elo: Math.round((ratingsByCategory.bullet + ratingsByCategory.blitz + ratingsByCategory.rapid) / 3),
    ratingsByCategory, games: Number(user.games) || 0, wins: Number(user.wins) || 0,
    draws: Number(user.draws) || 0, losses: Number(user.losses) || 0, createdAt: user.createdAt,
    lastSeenAt: user.lastSeenAt || null,
    online: Boolean(user.lastSeenAt && Date.now() - Date.parse(user.lastSeenAt) < 90_000),
    banned: Boolean(user.banned),
    // Public badge only (never exposes payment data). Admins always show the Premium tier; expired plans fall back to 'free'.
    tier: tierOf(user)
  };
}
function tierOf(user) {
  if (!user || typeof user !== 'object') return 'free';
  if (user.role === 'admin') return 'premium';
  try { return effectivePlan(normalizeEntitlement(user.entitlement)); } catch { return 'free'; }
}
/** Pick the admin players should be sent to: online first, then most recently seen. Banned admins are never chosen. */
const SUPPORT_BOT_PREFIX = 'VILA Trợ lý (bot):';
function adminsOnlineCount(db) {
  return db.users.filter(item => item.role === 'admin' && !item.banned && item.lastSeenAt && Date.now() - Date.parse(item.lastSeenAt) < 90_000).length;
}
function findSupportAdmin(db) {
  const admins = db.users.filter(item => item.role === 'admin' && !item.banned);
  if (!admins.length) return null;
  const seen = item => Date.parse(item.lastSeenAt || '') || 0;
  const online = item => Boolean(item.lastSeenAt && Date.now() - seen(item) < 90_000);
  return admins.slice().sort((a, b) => Number(online(b)) - Number(online(a)) || seen(b) - seen(a) || String(a.createdAt).localeCompare(String(b.createdAt)))[0];
}
/** The signed-in player's own view: includes the linked email, which is never exposed to other players. */
function selfUser(user) {
  const base = publicUser(user);
  if (!base) return base;
  // Admins receive premium entitlements from their server-controlled role, not from client input.
  const entitlement = user.role === 'admin' ? entitlementForClient({ premium: true }) : entitlementForClient(user.entitlement);
  return { ...base, email: String(user.email || ''), entitlement };
}
function controlCategory(value) { return CONTROLS[value]?.category || ''; }
function eloDelta(playerElo, opponentElo, score, k = 24) {
  const player = clamp(Math.round(Number(playerElo) || 1200), 100, 4000);
  const opponent = clamp(Math.round(Number(opponentElo) || 1200), 100, 4000);
  const expected = 1 / (1 + 10 ** ((opponent - player) / 400));
  const after = clamp(player + Math.round(clamp(k, 16, 40) * (score - expected)), 100, 4000);
  return { before: player, after, delta: after - player };
}
function matchmakingWindow(waitMs) { return Math.min(500, 100 + Math.floor(Math.max(0, waitMs) / 10_000) * 50); }
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
  if (chess.isCheckmate()) return chess.turn() === 'w' ? '0-1' : '1-0';
  return '1/2-1/2';
}
function rankedMatchById(db, id) { return db.matches.find(match => match?.ranked === true && match.id === id); }
function activeMatchFor(db, userId) { return db.matches.find(match => match?.ranked === true && match.status === 'active' && (match.players?.w === userId || match.players?.b === userId)); }
function makeMatchPayload(db, match, userId) {
  const color = match.players?.w === userId ? 'w' : 'b';
  const opponentId = color === 'w' ? match.players.b : match.players.w;
  return { match: {
    id: match.id, ranked: true, status: match.status, startFen: match.startFen, fen: match.fen,
    moves: match.moves || [], currentPly: (match.moves || []).length,
    players: { w: publicUser(db.users.find(u => u.id === match.players.w)), b: publicUser(db.users.find(u => u.id === match.players.b)) },
    color, opponent: publicUser(db.users.find(u => u.id === opponentId)), result: match.result || null,
    resultReason: match.resultReason || '', finishedAt: match.finishedAt || null,
    eloChanges: match.eloChanges?.[userId] || null, lastMoveAt: match.lastMoveAt || match.createdAt,
    timeControl: match.timeControl || '3+2', timeCategory: match.timeCategory || 'blitz',
    clockEnabled: Boolean(match.clockEnabled), clockRemainingMs: match.clockRemainingMs || null,
    clockIncrementMs: Number(match.clockIncrementMs) || 0, clockUpdatedAt: Number(match.clockUpdatedAt) || Date.now(),
    fairPlayNotice: match.fairPlaySignals?.[userId] ? { level: match.fairPlaySignals[userId].level || 'review', signals: match.fairPlaySignals[userId].signals || 0 } : null
  } };
}
function joinPayload(db, userId) {
  const active = activeMatchFor(db, userId);
  if (active) return { queued: false, ...makeMatchPayload(db, active, userId) };
  const entry = db.rankedQueue.find(item => item.userId === userId);
  const user = db.users.find(item => item.id === userId);
  const ratingsByCategory = user ? ensureRatings(user) : null;
  return { queued: Boolean(entry), joinedAt: entry?.joinedAt || null, waitMs: entry ? Math.max(0, Date.now() - entry.joinedAt) : 0, rating: Number(entry?.elo) || Number(user?.elo) || 1200, timeControl: entry?.timeControl || null, timeCategory: entry?.timeCategory || null, ratingsByCategory };
}
function resultScores(result) { return result === '1-0' ? [1, 0] : result === '0-1' ? [0, 1] : [0.5, 0.5]; }
function finishMatch(db, match, result, reason = 'game_over', quitterId = '') {
  if (!match || match.status !== 'active') return;
  const white = db.users.find(user => user.id === match.players.w);
  const black = db.users.find(user => user.id === match.players.b);
  if (!white || !black) { match.status = 'aborted'; match.resultReason = 'player_missing'; match.finishedAt = nowIso(); return; }
  const [whiteScore, blackScore] = resultScores(result);
  const category = ['bullet', 'blitz', 'rapid', 'daily'].includes(match.timeCategory) ? match.timeCategory : 'blitz';
  const wr = ensureRatings(white), br = ensureRatings(black);
  const wb = wr[category], bb = br[category];
  const wc = eloDelta(wb, bb, whiteScore), bc = eloDelta(bb, wb, blackScore);
  wr[category] = Math.max(100, wc.after - (quitterId === white.id ? 15 : 0));
  br[category] = Math.max(100, bc.after - (quitterId === black.id ? 15 : 0));
  white.ratingsByCategory = wr; black.ratingsByCategory = br;
  white.elo = Math.round((wr.bullet + wr.blitz + wr.rapid) / 3); black.elo = Math.round((br.bullet + br.blitz + br.rapid) / 3);
  white.games = (Number(white.games) || 0) + 1; black.games = (Number(black.games) || 0) + 1;
  if (whiteScore === 1) { white.wins = (Number(white.wins) || 0) + 1; black.losses = (Number(black.losses) || 0) + 1; }
  else if (whiteScore === 0) { black.wins = (Number(black.wins) || 0) + 1; white.losses = (Number(white.losses) || 0) + 1; }
  else { white.draws = (Number(white.draws) || 0) + 1; black.draws = (Number(black.draws) || 0) + 1; }
  match.status = 'finished'; match.result = result; match.resultReason = reason; match.finishedAt = nowIso();
  match.eloChanges = {
    [white.id]: { category, before: wb, after: wr[category], delta: wr[category] - wb },
    [black.id]: { category, before: bb, after: br[category], delta: br[category] - bb }
  };
  db.rankedQueue = db.rankedQueue.filter(entry => entry.userId !== white.id && entry.userId !== black.id);
}
function audit(db, actor, action, target = '', detail = '') {
  db.audit.push({ id: crypto.randomUUID(), at: nowIso(), actor: actor || 'system', action, target: String(target).slice(0, 100), detail: String(detail).slice(0, 300), source: 'cloudflare-worker' });
  db.audit = db.audit.slice(-2000);
}
async function readBoundedText(request) {
  const contentLength = request.headers.get('Content-Length');
  const declaredLength = contentLength === null ? NaN : Number(contentLength);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BODY_BYTES) throw new Error('Nội dung yêu cầu quá lớn.');
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      // Cancel as soon as the streamed byte count crosses the cap; do not buffer
      // an unbounded body just because Content-Length is missing or misleading.
      if (total > MAX_JSON_BODY_BYTES) {
        try { await reader.cancel(); } catch {}
        throw new Error('Nội dung yêu cầu quá lớn.');
      }
      chunks.push(value);
    }
  } finally { try { reader.releaseLock(); } catch {} }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}
async function readRouteBody(request) {
  const raw = await readBoundedText(request);
  if (!raw) return {};
  let value;
  try { value = JSON.parse(raw); } catch { throw new Error('Dữ liệu JSON không hợp lệ.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Dữ liệu JSON phải là một đối tượng.');
  return value;
}

function recordsFromDb(db) {
  const records = new Map();
  if (db.tokenSecret) records.set('meta:tokenSecret', db.tokenSecret);
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
    for (const game of (Array.isArray(games) ? games : [])) {
      const gameKey = String(game.signature || game.id || '');
      if (gameKey) records.set(`history:${userId}:${encodeURIComponent(gameKey)}`, JSON.stringify({ userId, gameKey, game }));
    }
  }
  for (const item of db.purchases || []) records.set(`purchase:${item.id}`, JSON.stringify(item));
  for (const [key, hits] of Object.entries(db.rateLimits || {})) records.set(`rate:${encodeURIComponent(key)}`, JSON.stringify(hits));
  return records;
}
function dbFromRecords(rows) {
  const db = defaultDb();
  for (const row of rows) {
    const key = String(row.key || '');
    let value;
    try { value = key === 'meta:tokenSecret' ? row.value : JSON.parse(row.value); }
    catch { continue; } // Ignore one malformed record rather than destroying the rest of the community store.
    if (key === 'meta:tokenSecret') { db.tokenSecret = value; continue; }
    if (key.startsWith('user:')) db.users.push(value);
    else if (key.startsWith('friend:')) db.friendRequests.push(value);
    else if (key.startsWith('message:')) db.directMessages.push(value);
    else if (key.startsWith('report:')) db.userReports.push(value);
    else if (key.startsWith('purchase-request:')) db.purchaseRequests.push(value);
    else if (key.startsWith('audit:')) db.audit.push(value);
    else if (key.startsWith('match:')) db.matches.push(value);
    else if (key.startsWith('queue:')) db.rankedQueue.push(value);
    else if (key.startsWith('announcement:')) db.announcements.push(value);
    else if (key.startsWith('purchase:')) db.purchases.push(value);
    else if (key.startsWith('reads:')) db.announcementReads[key.slice('reads:'.length)] = value;
    else if (key.startsWith('history:')) {
      if (!db.userHistory[value.userId]) db.userHistory[value.userId] = [];
      db.userHistory[value.userId].push(value.game);
    } else if (key.startsWith('rate:')) db.rateLimits[decodeURIComponent(key.slice('rate:'.length))] = value;
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
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Dữ liệu JSON phải là một đối tượng.');
    return value;
  } catch (error) {
    throw new Error(error?.message === 'Nội dung yêu cầu quá lớn.' ? error.message : 'Dữ liệu JSON không hợp lệ.');
  }
}
function withCors(response, cors, request) {
  return secureResponse(response, cors, request);
}
function validUciList(value) {
  const moves = asText(value, 1000).split(',').filter(Boolean).slice(0, 40);
  if (moves.some(move => !/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(move))) return null;
  return moves;
}
async function externalApi(request, url) {
  const path = url.pathname;
  if (path === '/api/openings/explorer' && request.method === 'GET') {
    const moves = validUciList(url.searchParams.get('moves') || '');
    if (!moves) return fail('Danh sách nước UCI không hợp lệ.');
    const upstreamUrl = new URL('https://explorer.lichess.ovh/lichess');
    upstreamUrl.searchParams.set('variant', 'standard');
    upstreamUrl.searchParams.set('speeds[]', 'blitz');
    upstreamUrl.searchParams.set('ratings[]', '1600');
    upstreamUrl.searchParams.set('moves', moves.join(','));
    try {
      const upstream = await fetch(upstreamUrl, { headers: { Accept: 'application/json', 'User-Agent': 'ViLa-Chess/3.68.1' }, signal: AbortSignal.timeout(20_000) });
      const raw = await upstream.text();
      let data = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
      if (!upstream.ok) return fail(data?.error || `Opening Explorer HTTP ${upstream.status}`, upstream.status);
      return json(data, 200, { 'Cache-Control': 'public, max-age=60' });
    } catch (error) { return fail(`Không lấy được dữ liệu khai cuộc: ${String(error?.message || error).slice(0, 220)}`, 502); }
  }

  if (/^\/api\/puzzles\/(next|daily)$/.test(path) && request.method === 'GET') {
    const daily = path.endsWith('/daily');
    const bandValue = url.searchParams.get('difficulty') || 'normal';
    const difficulty = ['easiest', 'easier', 'normal', 'harder', 'hardest'].includes(bandValue) ? bandValue : 'normal';
    const upstreamUrl = daily ? 'https://lichess.org/api/puzzle/daily' : `https://lichess.org/api/puzzle/next?difficulty=${encodeURIComponent(difficulty)}`;
    try {
      const upstream = await fetch(upstreamUrl, { headers: { Accept: 'application/json', 'User-Agent': 'ViLa-Chess/3.68.1 puzzle-proxy' }, signal: AbortSignal.timeout(12_000) });
      const raw = await upstream.text();
      let data = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
      if (!upstream.ok) return fail(data?.error || `Lichess puzzle HTTP ${upstream.status}`, upstream.status);
      if (!data?.puzzle?.id || !data?.game?.pgn || !Array.isArray(data?.puzzle?.solution)) return fail('Lichess trả về dữ liệu câu đố chưa đầy đủ.', 502);
      return json(data, 200, { 'Cache-Control': daily ? 'public, max-age=300' : 'no-store' });
    } catch (error) { return fail(`Không lấy được câu đố Lichess: ${String(error?.message || error).slice(0, 220)}`, 502); }
  }

  if (!path.startsWith('/api/lichess/')) return fail('Không tìm thấy API.', 404);
  if (!['POST'].includes(request.method)) return fail('Phương thức không được hỗ trợ.', 405);
  let body;
  try { body = await readExternalBody(request); }
  catch (error) { return fail(error.message || 'Dữ liệu JSON không hợp lệ.', 400); }
  const token = asText(body.token, 4000);
  if (!token) return fail('Hãy nhập Lichess personal access token trong mục Lichess.', 400);
  const apiMode = body.apiMode === 'bot' ? 'bot' : 'board';
  let pathname = '';
  let form = null;
  let method = 'GET';
  let accept = 'application/json';
  if (path === '/api/lichess/account') pathname = '/api/account';
  else if (path === '/api/lichess/challenge-ai') {
    const level = clamp(Number(body.level || 3), 1, 8);
    const limit = clamp(Number(body.clockLimit || 300), 0, 10_800);
    const increment = clamp(Number(body.clockIncrement || 0), 0, 180);
    form = new URLSearchParams({ level: String(level), 'clock.limit': String(limit), 'clock.increment': String(increment), color: ['white', 'black', 'random'].includes(body.color) ? body.color : 'random' });
    pathname = '/api/challenge/ai'; method = 'POST';
  } else if (path === '/api/lichess/challenge-user') {
    const username = asText(body.username, 80).replace(/^@/, '');
    if (!/^[a-zA-Z0-9_-]{2,30}$/.test(username)) return fail('Tên người chơi Lichess không hợp lệ.');
    const limit = clamp(Number(body.clockLimit || 300), 0, 10_800);
    const increment = clamp(Number(body.clockIncrement || 0), 0, 180);
    form = new URLSearchParams({ rated: 'false', 'clock.limit': String(limit), 'clock.increment': String(increment), color: ['white', 'black', 'random'].includes(body.color) ? body.color : 'random', variant: 'standard' });
    pathname = `/api/challenge/${encodeURIComponent(username)}`; method = 'POST';
  } else if (path === '/api/lichess/move') {
    const gameId = asText(body.gameId, 100), move = asText(body.move, 10);
    if (!/^[a-zA-Z0-9]{8}$/.test(gameId)) return fail('Mã ván Lichess không hợp lệ.');
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(move)) return fail('Nước đi phải ở định dạng UCI, ví dụ e2e4.');
    pathname = apiMode === 'bot' ? `/api/bot/game/${gameId}/move/${move}` : `/api/board/game/${gameId}/move/${move}`;
    method = 'POST'; form = new URLSearchParams();
  } else if (path === '/api/lichess/stream') {
    const gameId = asText(body.gameId, 100);
    if (!/^[a-zA-Z0-9]{8}$/.test(gameId)) return fail('Mã ván Lichess không hợp lệ.');
    pathname = apiMode === 'bot' ? `/api/bot/game/stream/${gameId}` : `/api/board/game/stream/${gameId}`;
    accept = 'application/x-ndjson';
  } else return fail('Không tìm thấy API Lichess.', 404);

  try {
    const upstream = await fetch(`https://lichess.org${pathname}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, Accept: accept, ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
      ...(method === 'POST' ? { body: form.toString() } : {}),
      ...(path === '/api/lichess/stream' ? { signal: request.signal } : { signal: AbortSignal.timeout(25_000) })
    });
    if (path === '/api/lichess/stream') {
      if (!upstream.ok || !upstream.body) {
        const message = (await upstream.text().catch(() => 'Lichess không mở được luồng ván cờ.')).slice(0, 500);
        return fail(message || `Lichess HTTP ${upstream.status}`, upstream.status || 502);
      }
      return new Response(upstream.body, { status: upstream.status, headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    }
    const raw = await upstream.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
    if (!upstream.ok) return fail(data?.error || raw || `Lichess HTTP ${upstream.status}`, upstream.status);
    if (path === '/api/lichess/account') return json({ id: data.id, username: data.username, title: data.title || '', perfs: data.perfs || {} });
    if (path === '/api/lichess/challenge-ai') return json({ id: data.id, url: data.url, color: data.color, status: data.status, raw: data });
    if (path === '/api/lichess/challenge-user') return json({ id: data.challenge?.id || data.id, url: data.challenge?.url || data.url, status: data.challenge?.status || data.status, raw: data });
    return json({ ok: true, response: raw });
  } catch (error) {
    return fail(`Không kết nối được Lichess: ${String(error?.message || error).slice(0, 220)}`, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsPolicyResult = corsPolicy(request, env);
    const cors = corsPolicyResult.headers;
    if (request.method === 'OPTIONS') {
      if (!corsPolicyResult.allowed) return secureResponse(fail('Origin chưa được cho phép.', 403), cors, request);
      return secureResponse(new Response(null, { status: 204 }), cors, request);
    }
    if (request.headers.has('Origin') && !corsPolicyResult.allowed) {
      // Reject disallowed browser origins early. Non-browser clients without Origin remain supported.
      return secureResponse(fail('Origin chưa được cho phép.', 403), cors, request);
    }
    if (url.pathname === '/' || url.pathname === '/api/health') {
      return secureResponse(json({ ok: true, app: 'Cờ Vua ViLa', version: '3.68.1-secure-patch', service: 'cloudflare-durable-object', capabilities: ['ranked-online', 'social-accounts', 'persistent-storage', 'persistent-messenger', 'admin-purchase-queue', 'support-admin-lookup', 'offline-admin-bot', 'plan-tier-badges', 'rate-limited-plan-requests', 'server-authoritative-chess', 'session-revocation', 'security-headers', 'origin-allowlist', 'abuse-rate-limits', 'lichess-proxy', 'opening-explorer', 'puzzle-proxy'] }, 200), cors, request);
    }
    const isExternalProxy = url.pathname.startsWith('/api/lichess/') || url.pathname === '/api/openings/explorer' || /^\/api\/puzzles\/(next|daily)$/.test(url.pathname);
    if (isExternalProxy) {
      const retryAfter = edgeRateLimit(request, url.pathname);
      if (retryAfter) return secureResponse(json({ error: 'Quá nhiều yêu cầu tới dịch vụ tích hợp. Hãy thử lại sau.', retryAfterSeconds: retryAfter }, 429, { 'Retry-After': String(retryAfter) }), cors, request);
      try { return withCors(await externalApi(request, url), cors, request); }
      catch (error) { return withCors(fail('Dịch vụ tích hợp gặp lỗi nội bộ.', 500), cors, request); }
    }
    if (!url.pathname.startsWith('/api/social')) return secureResponse(json({ error: 'Không tìm thấy API.' }, 404), cors, request);
    if (!env?.CHESS_STATE) return secureResponse(json({ error: 'Máy chủ cộng đồng chưa được cấu hình.', code: 'BACKEND_NOT_CONFIGURED' }, 503), cors, request);
    const id = env.CHESS_STATE.idFromName('vila-global-community-v1');
    const stub = env.CHESS_STATE.get(id);
    return withCors(await stub.fetch(request), cors, request);
  },
  /** Cron (see wrangler.toml): revoke plans for purchases Google has refunded. */
  async scheduled(_event, env) {
    if (!billingConfigured(env)) return;
    const stub = env.CHESS_STATE.get(env.CHESS_STATE.idFromName('vila-global-community-v1'));
    await stub.fetch(new Request('https://vila-internal.invalid/__cron/sync-voided', { method: 'POST', body: '{}' }));
  }
};

export class ChessState {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.serial = Promise.resolve();
    this.ready = state.blockConcurrencyWhile(async () => {
      const sql = state.storage.sql;
      sql.exec('CREATE TABLE IF NOT EXISTS vila_records (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)');
      const rows = Array.from(sql.exec('SELECT key, value FROM vila_records'));
      this.db = dbFromRecords(rows);
      for (const [key, fallback] of Object.entries({ users: [], friendRequests: [], directMessages: [], userReports: [], purchaseRequests: [], audit: [], matches: [], rankedQueue: [], announcements: [], announcementReads: {}, userHistory: {}, rateLimits: {}, purchases: [] })) {
        if (this.db[key] === undefined || this.db[key] === null) this.db[key] = fallback;
      }
      const original = new Map(rows.map(row => [String(row.key), String(row.value)]));
      if (!this.db.tokenSecret || decodeB64url(this.db.tokenSecret).length < 32) this.db.tokenSecret = b64url(crypto.getRandomValues(new Uint8Array(48)));
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
      for (const [key, value] of updates) sql.exec('INSERT INTO vila_records (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, value);
      for (const key of removals) sql.exec('DELETE FROM vila_records WHERE key = ?', key);
    });
  }
  async bootstrapAdmin() {
    const username = asText(this.env.ADMIN_USERNAME, 24).toLowerCase();
    const password = String(this.env.ADMIN_PASSWORD || '');
    this.adminStatus = 'ok';
    if (!username || !password) { this.adminStatus = 'missing-secrets: đặt ADMIN_USERNAME và ADMIN_PASSWORD trong Settings → Variables and Secrets'; return; }
    if (!USERNAME_RE.test(username)) { this.adminStatus = 'bad-username: ADMIN_USERNAME phải dài 3–24 ký tự (chữ, số, . _ -)'; return; }
    if (password.length < 14) { this.adminStatus = 'weak-password: ADMIN_PASSWORD phải từ 14 ký tự trở lên'; return; }
    let user = this.db.users.find(item => item.username.toLowerCase() === username);
    if (!user) {
      const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
      const hash = await passwordHash(password, salt);
      const elo = clamp(Math.round(Number(this.env.ADMIN_INITIAL_ELO) || 3200), 100, 4000);
      user = { id: crypto.randomUUID(), username, displayName: username, email: '', avatarId: Math.floor(Math.random() * 1000), salt, passwordHash: hash, sessionVersion: 0, role: 'admin', elo, ratingsByCategory: { bullet: elo, blitz: elo, rapid: elo, daily: elo }, bio: '', games: 0, wins: 0, draws: 0, losses: 0, banned: false, createdAt: nowIso(), lastSeenAt: null };
      this.db.users.push(user);
      audit(this.db, 'system', 'admin_bootstrapped', user.id, 'Cloudflare environment secret');
    } else if (user.role !== 'admin') {
      user.role = 'admin';
    }
  }
  fetch(request) {
    const task = this.serial.then(() => this.handle(request));
    this.serial = task.then(() => undefined, () => undefined);
    return task;
  }
  async handle(request) {
    await this.ready;
    // Secrets added after this Durable Object was already running are only visible via this.env now:
    // create the admin lazily (at most every 15 s) instead of waiting for the next cold start.
    if (!this.db.users.some(item => item.role === 'admin') && this.env.ADMIN_USERNAME && this.env.ADMIN_PASSWORD && Date.now() - (this.lastAdminBootstrapTry || 0) > 15_000) {
      this.lastAdminBootstrapTry = Date.now();
      const beforeBootstrap = recordsFromDb(this.db);
      await this.bootstrapAdmin();
      await this.commitDiff(beforeBootstrap, recordsFromDb(this.db));
    }
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const path = url.pathname.startsWith('/api/social') ? (url.pathname.slice('/api/social'.length) || '/') : url.pathname;
    if (method === 'GET' && path === '/health') return json({ ok: true, service: 'Cờ Vua ViLa social', status: 'online', storage: 'durable-object', admin: { ready: this.db.users.some(item => item.role === 'admin' && !item.banned), bootstrap: this.adminStatus || 'unknown' }, timestamp: nowIso() });
    if (path !== '/' && !path.startsWith('/')) return fail('Đường dẫn không hợp lệ.', 404);
    const before = recordsFromDb(this.db);
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateError = this.rateLimit(ip, path, method);
    if (rateError) { await this.commitDiff(before, recordsFromDb(this.db)); return fail(rateError, 429); }
    let body = {};
    if (['POST', 'PATCH', 'PUT'].includes(method)) {
      try { body = await readRouteBody(request); }
      catch (error) { await this.commitDiff(before, recordsFromDb(this.db)); return fail(error.message || 'Dữ liệu không hợp lệ.', 400); }
    }
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const auth = token ? await verifyToken(this.db, token) : null;
    const user = auth?.user || null;
    const params = path.split('/').filter(Boolean).map(part => { try { return decodeURIComponent(part); } catch { return part; } });
    let response;
    try {
      response = await this.route({ method, path, params, query: url.searchParams, body, user, auth, token, internal: !url.pathname.startsWith('/api/social') });
    } catch (error) {
      console.error('[VILA security] Unhandled backend route error:', String(error?.message || error).slice(0, 240));
      response = fail('Lỗi máy chủ nội bộ. Vui lòng thử lại sau.', 500);
    }
    await this.commitDiff(before, recordsFromDb(this.db));
    return response;
  }
  rateLimit(ip, path, method) {
    const now = Date.now();
    const policies = [['all', 300, 60_000]];
    if (method === 'POST' && path === '/auth/register') policies.push(['register', 20, 3_600_000]);
    if (method === 'POST' && path === '/auth/login') policies.push(['login', 40, 900_000]);
    if (method === 'POST' && path === '/auth/forgot-password') policies.push(['password-recovery', 8, 3_600_000]);
    if (method === 'POST' && path === '/auth/reset-password') policies.push(['password-reset', 8, 900_000]);
    if (method === 'PATCH' && path === '/account/password') policies.push(['password-change', 8, 900_000]);
    if (method === 'PATCH' && path.startsWith('/account/')) policies.push(['account', 15, 900_000]);
    if (method === 'POST' && path.startsWith('/messages/')) policies.push(['direct-message', 40, 60_000]);
    if (method === 'POST' && path === '/me/purchase-requests') policies.push(['purchase-request', 8, 3_600_000]);
    if (method === 'POST' && path === '/me/redeem-code') policies.push(['trial-code', 5, 900_000]);
    if (method === 'POST' && /^\/users\/[^/]+\/report$/.test(path)) policies.push(['user-report', 8, 900_000]);
    if (path.startsWith('/me/purchase') || path === '/me/billing-config') policies.push(['purchase', 40, 3_600_000]);
    if (path.startsWith('/ranked/')) policies.push(['ranked', 120, 60_000]);
    for (const [name, max, span] of policies) {
      const key = `${name}:${ip}`;
      const recent = (Array.isArray(this.db.rateLimits[key]) ? this.db.rateLimits[key] : []).filter(time => now - time < span);
      if (recent.length >= max) return 'Bạn thao tác quá nhanh. Hãy thử lại sau.';
      recent.push(now);
      this.db.rateLimits[key] = recent;
    }
    for (const entry of Object.keys(this.db.rateLimits)) {
      const hits = this.db.rateLimits[entry];
      if (!Array.isArray(hits) || !hits.length || now - hits[hits.length - 1] > 3_600_000) delete this.db.rateLimits[entry];
    }
    const limitEntries = Object.entries(this.db.rateLimits);
    if (limitEntries.length > 10_000) {
      limitEntries.sort((a, b) => (Number(a[1]?.[a[1].length - 1]) || 0) - (Number(b[1]?.[b[1].length - 1]) || 0));
      for (const [key] of limitEntries.slice(0, limitEntries.length - 8_000)) delete this.db.rateLimits[key];
    }
    return '';
  }
  needUser(user) { return user ? null : fail('Bạn cần đăng nhập lại để tiếp tục.', 401); }
  async route(ctx) {
    const { method, path, params, query, body, user, auth, internal } = ctx;
    if (method === 'GET' && path === '/') return json({ ok: true, service: 'ViLa social API' });
    if (method === 'POST' && path === '/auth/register') {
      const username = asText(body.username, 24).toLowerCase();
      const displayName = asText(body.displayName || username, 40);
      const email = asText(body.email, 254).toLowerCase();
      const password = String(body.password || '');
      if (!USERNAME_RE.test(username)) return fail('Tên tài khoản dài 3–24 ký tự, chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.');
      if (displayName.length < 2) return fail('Tên hiển thị cần ít nhất 2 ký tự.');
      if (password.length < MIN_PASSWORD_LENGTH || password.length > 256) return fail(`Mật khẩu cần dài từ ${MIN_PASSWORD_LENGTH} đến 256 ký tự.`);
      if (email && !EMAIL_RE.test(email)) return fail('Email không hợp lệ (có thể bỏ trống).');
      if (this.db.users.some(item => item.username.toLowerCase() === username)) return fail('Tên tài khoản đã được sử dụng.', 409);
      if (email && this.db.users.some(item => String(item.email || '').toLowerCase() === email)) return fail('Email này đã được dùng cho tài khoản khác.', 409);
      if (this.db.users.some(item => String(item.displayName || '').toLowerCase() === displayName.toLowerCase())) return fail('Biệt danh này đã được dùng. Hãy chọn biệt danh khác.', 409);
      const choices = [200, 500, 1000, 1500];
      const elo = choices.includes(Number(body.initialElo)) ? Number(body.initialElo) : 500;
      const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
      const hash = await passwordHash(password, salt);
      // Serialized Durable Object handler ensures username uniqueness across concurrent sign-ups.
      const duplicate = this.db.users.some(item => item.username.toLowerCase() === username || (email && String(item.email || '').toLowerCase() === email) || String(item.displayName || '').toLowerCase() === displayName.toLowerCase());
      if (duplicate) return fail('Tên tài khoản, email hoặc biệt danh đã được sử dụng.', 409);
      const user = { id: crypto.randomUUID(), username, displayName, email, avatarId: this.chooseAvatarId(), skillTierElo: elo, ratingsByCategory: { bullet: elo, blitz: elo, rapid: elo, daily: elo }, bio: '', salt, passwordHash: hash, sessionVersion: 0, role: 'player', elo, games: 0, wins: 0, draws: 0, losses: 0, banned: false, createdAt: nowIso(), lastSeenAt: nowIso() };
      this.db.users.push(user); audit(this.db, user.id, 'account_registered', user.id, 'cloud account');
      return json({ token: await signToken(this.db, user), user: selfUser(user) }, 201);
    }
    if (method === 'POST' && path === '/auth/login') {
      const identity = asText(body.username || body.identity, 254).toLowerCase();
      const password = String(body.password || '');
      if (!identity || !password || password.length > 256) return fail('Nhập tên đăng nhập và mật khẩu.');
      // Account-keyed limit complements the per-IP limiter and makes distributed password guessing slower.
      const identityBucket = `identity-login:${await sha256Hex(identity)}`;
      const now = Date.now();
      const previousAttempts = (Array.isArray(this.db.rateLimits[identityBucket]) ? this.db.rateLimits[identityBucket] : []).filter(time => now - time < 15 * 60_000);
      // Do not lock a real account merely because someone knows its username. Verify
      // the credential first; only failed attempts are throttled. IP limits still apply.
      const identityThrottled = previousAttempts.length >= 10;
      const found = this.db.users.find(item => item.username.toLowerCase() === identity || (item.email && item.email.toLowerCase() === identity) || String(item.displayName || '').toLowerCase() === identity);
      const dummySalt = '00112233445566778899aabbccddeeff';
      const candidate = await passwordHash(password, found?.salt || dummySalt);
      if (!found || !constantTimeEqual(candidate, found.passwordHash || '')) {
        if (identityThrottled) {
          audit(this.db, 'system', 'login_identity_throttled', identityBucket.slice(-16), 'additional failed attempt blocked; identity hash prefix only');
          return json({ error: 'Quá nhiều lần thử đăng nhập cho tài khoản này. Hãy thử lại sau 15 phút.' }, 429, { 'Retry-After': '900' });
        }
        previousAttempts.push(now);
        this.db.rateLimits[identityBucket] = previousAttempts;
        audit(this.db, 'anonymous', 'login_failed', identityBucket.slice(-16), 'invalid credentials; identity hash prefix only');
        if (previousAttempts.length >= 10) return json({ error: 'Quá nhiều lần thử đăng nhập cho tài khoản này. Hãy thử lại sau 15 phút.' }, 429, { 'Retry-After': '900' });
        return fail('Tên đăng nhập/email hoặc mật khẩu không đúng.', 401);
      }
      delete this.db.rateLimits[identityBucket];
      if (found.banned) return fail('Tài khoản đã bị khóa. Liên hệ quản trị viên để khiếu nại.', 403);
      found.lastSeenAt = nowIso(); audit(this.db, found.id, 'login_success', found.id, 'password login');
      return json({ token: await signToken(this.db, found), user: selfUser(found) });
    }
    if (method === 'POST' && ['/auth/forgot-password', '/auth/reset-password'].includes(path)) return fail('Máy chủ cloud chưa được cấu hình dịch vụ gửi email khôi phục. Hãy liên hệ quản trị viên.', 503);
    if (method === 'GET' && path === '/auth/me') {
      const required = this.needUser(user); if (required) return required;
      user.lastSeenAt = nowIso();
      const payload = { user: selfUser(user) };
      if (Math.floor(Date.now() / 1000) - (Number(auth?.payload?.iat) || 0) > TOKEN_REFRESH_AFTER_SECONDS) payload.token = await signToken(this.db, user);
      return json(payload);
    }
    if (method === 'POST' && path === '/auth/logout') {
      const required = this.needUser(user); if (required) return required;
      user.sessionVersion = (Number(user.sessionVersion) || 0) + 1; return json({ ok: true });
    }
    if (method === 'PATCH' && path === '/profile') {
      const required = this.needUser(user); if (required) return required;
      const displayName = asText(body.displayName, 40), bio = asText(body.bio, 180);
      if (displayName.length < 2) return fail('Tên hiển thị cần ít nhất 2 ký tự.');
      if (this.db.users.some(item => item.id !== user.id && String(item.displayName || '').toLowerCase() === displayName.toLowerCase())) return fail('Biệt danh này đã được người khác sử dụng.', 409);
      user.displayName = displayName; user.bio = bio; return json({ user: selfUser(user) });
    }
    if (method === 'PATCH' && path === '/account/password') {
      const required = this.needUser(user); if (required) return required;
      const currentPassword = String(body.currentPassword || '');
      const newPassword = String(body.newPassword || '');
      if (!currentPassword || currentPassword.length > 256) return fail('Hãy nhập mật khẩu hiện tại.');
      if (newPassword.length < MIN_PASSWORD_LENGTH || newPassword.length > 256) return fail(`Mật khẩu mới cần dài từ ${MIN_PASSWORD_LENGTH} đến 256 ký tự.`);
      if (newPassword === currentPassword) return fail('Mật khẩu mới phải khác mật khẩu hiện tại.');
      const candidate = await passwordHash(currentPassword, user.salt || '00112233445566778899aabbccddeeff');
      if (!constantTimeEqual(candidate, user.passwordHash || '')) { audit(this.db, user.id, 'password_change_failed', user.id, 'wrong current password'); return fail('Mật khẩu hiện tại không đúng.', 403); }
      const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
      user.salt = salt;
      user.passwordHash = await passwordHash(newPassword, salt);
      // Revoke every other device; the caller receives a fresh token so this session stays signed in.
      user.sessionVersion = (Number(user.sessionVersion) || 0) + 1;
      audit(this.db, user.id, 'password_changed', user.id, 'account settings');
      return json({ ok: true, token: await signToken(this.db, user), user: selfUser(user) });
    }
    if (method === 'PATCH' && path === '/account/email') {
      const required = this.needUser(user); if (required) return required;
      const password = String(body.password || '');
      const email = asText(body.email, 254).toLowerCase();
      if (!password || password.length > 256) return fail('Hãy nhập mật khẩu để xác nhận.');
      if (email && !EMAIL_RE.test(email)) return fail('Email không hợp lệ.');
      const candidate = await passwordHash(password, user.salt || '00112233445566778899aabbccddeeff');
      if (!constantTimeEqual(candidate, user.passwordHash || '')) return fail('Mật khẩu không đúng.', 403);
      if (email && this.db.users.some(item => item.id !== user.id && String(item.email || '').toLowerCase() === email)) return fail('Email này đã được dùng cho tài khoản khác.', 409);
      user.email = email;
      audit(this.db, user.id, email ? 'email_linked' : 'email_unlinked', user.id, 'account settings');
      return json({ ok: true, user: selfUser(user) });
    }
    if (method === 'GET' && path === '/users/search') {
      const required = this.needUser(user); if (required) return required;
      const q = asText(query.get('q'), 30).toLowerCase(); if (q.length < 2) return fail('Nhập ít nhất 2 ký tự để tìm người chơi.');
      return json({ users: this.db.users.filter(item => !item.banned && item.id !== user.id && (item.username.toLowerCase().includes(q) || item.displayName.toLowerCase().includes(q))).slice(0, 20).map(publicUser) });
    }
    if (method === 'GET' && params[0] === 'users' && params.length === 2) {
      const required = this.needUser(user); if (required) return required;
      const username = asText(params[1], 24).toLowerCase();
      const target = this.db.users.find(item => item.username.toLowerCase() === username && !item.banned);
      if (!target) return fail('Không tìm thấy hồ sơ người chơi.', 404);
      return json({ user: publicUser(target), isSelf: target.id === user.id });
    }
    if (method === 'POST' && params[0] === 'users' && params[2] === 'report' && params.length === 3) {
      const required = this.needUser(user); if (required) return required;
      const target = this.db.users.find(item => item.id === params[1] && !item.banned);
      if (!target || target.id === user.id) return fail('Không tìm thấy người chơi để báo cáo.', 404);
      const reason = asText(body.reason, 60), details = asText(body.details, 800);
      if (!['cheating', 'abuse', 'spam', 'impersonation', 'other'].includes(reason)) return fail('Hãy chọn lý do báo cáo hợp lệ.');
      const recent = this.db.userReports.find(item => item.reporterId === user.id && item.targetUserId === target.id && item.status === 'pending' && Date.now() - Date.parse(item.createdAt || '') < 86_400_000);
      if (recent) return fail('Bạn đã gửi báo cáo đang chờ xử lý cho người chơi này.', 409);
      const report = { id: crypto.randomUUID(), reporterId: user.id, targetUserId: target.id, reason, details, status: 'pending', createdAt: nowIso(), reviewedAt: null, reviewedBy: null };
      this.db.userReports.push(report); this.db.userReports = this.db.userReports.slice(-10_000);
      audit(this.db, user.id, 'user_report_submitted', target.id, reason);
      return json({ report: { id: report.id, status: report.status }, message: 'Đã gửi báo cáo. Quản trị viên sẽ xem xét; báo cáo không tự động khóa tài khoản.' }, 201);
    }
    if (method === 'GET' && path === '/messages/conversations') {
      const required = this.needUser(user); if (required) return required;
      const grouped = new Map();
      for (const message of this.db.directMessages) {
        if (message.from !== user.id && message.to !== user.id) continue;
        const otherId = message.from === user.id ? message.to : message.from;
        const other = this.db.users.find(item => item.id === otherId && !item.banned);
        if (!other) continue;
        let row = grouped.get(otherId);
        if (!row) { row = { user: publicUser(other), lastMessage: message, unread: 0 }; grouped.set(otherId, row); }
        else if (String(message.createdAt) > String(row.lastMessage.createdAt)) row.lastMessage = message;
        if (message.to === user.id && !message.readAt) row.unread += 1;
      }
      const conversations = [...grouped.values()].sort((a, b) => String(b.lastMessage.createdAt).localeCompare(String(a.lastMessage.createdAt))).slice(0, 100).map(row => ({ user: row.user, unread: row.unread, lastMessage: { id: row.lastMessage.id, from: row.lastMessage.from, text: row.lastMessage.text, createdAt: row.lastMessage.createdAt } }));
      return json({ conversations });
    }
    if (params[0] === 'messages' && params.length === 2 && params[1] !== 'conversations' && method === 'GET') {
      const required = this.needUser(user); if (required) return required;
      const target = this.db.users.find(item => item.id === params[1] && !item.banned);
      if (!target || target.id === user.id) return fail('Không tìm thấy người nhận.', 404);
      const messages = this.db.directMessages.filter(item => (item.from === user.id && item.to === target.id) || (item.from === target.id && item.to === user.id)).slice(-100);
      for (const message of messages) if (message.to === user.id && !message.readAt) message.readAt = nowIso();
      return json({ user: publicUser(target), messages: messages.map(item => ({ id: item.id, from: item.from, to: item.to, text: item.text, createdAt: item.createdAt, readAt: item.readAt || null, fromMe: item.from === user.id })) });
    }
    if (params[0] === 'messages' && params.length === 2 && method === 'POST') {
      const required = this.needUser(user); if (required) return required;
      const target = this.db.users.find(item => item.id === params[1] && !item.banned);
      if (!target || target.id === user.id) return fail('Không tìm thấy người nhận.', 404);
      const text = asText(body.text, 1000).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
      if (!text) return fail('Tin nhắn không được để trống.');
      const message = { id: crypto.randomUUID(), from: user.id, to: target.id, text, createdAt: nowIso(), readAt: null };
      this.db.directMessages.push(message);
      // Offline-admin bot: one short auto-reply per player per hour; it never changes plans.
      if (target.role === 'admin' && !(target.lastSeenAt && Date.now() - Date.parse(target.lastSeenAt) < 90_000)) {
        const hourAgo = Date.now() - 3_600_000;
        const recentBot = this.db.directMessages.slice(-3000).some(item => item.from === target.id && item.to === user.id && item.text.startsWith(SUPPORT_BOT_PREFIX) && Date.parse(item.createdAt) > hourAgo);
        if (!recentBot) this.db.directMessages.push({ id: crypto.randomUUID(), from: target.id, to: user.id, text: `${SUPPORT_BOT_PREFIX} Admin đang ngoại tuyến nên chưa xem tin nhắn của bạn. Tin đã được lưu và admin sẽ trả lời khi online. Muốn mua Pro/Premium: vào trang Gói và gửi yêu cầu để vào hàng chờ. Bot không tự cấp gói.`, createdAt: nowIso(), readAt: null });
      }
      this.db.directMessages = this.db.directMessages.slice(-100_000);
      audit(this.db, user.id, 'direct_message_sent', target.id, `length=${text.length}`);
      return json({ message: { ...message, fromMe: true }, user: publicUser(target) }, 201);
    }
    if (method === 'GET' && path === '/support/admin') {
      const required = this.needUser(user); if (required) return required;
      const admin = findSupportAdmin(this.db);
      if (!admin) return fail('Chưa có admin nào đang hoạt động. Vui lòng thử lại sau.', 503);
      const adminsOnline = adminsOnlineCount(this.db);
      const pending = this.db.purchaseRequests.filter(item => item.status === 'pending');
      const mine = pending.filter(item => item.userId === user.id).map(item => ({ id: item.id, plan: item.plan, amountVnd: item.amountVnd, createdAt: item.createdAt, position: pending.findIndex(other => other.id === item.id) + 1 }));
      // The bot only informs and queues requests. It never grants a plan: only an admin decision can.
      return json({ admin: publicUser(admin), adminsOnline, isSelf: admin.id === user.id, assistant: { active: adminsOnline === 0, canGrantPlans: false, pendingRequests: pending.length, yourPending: mine, adminLastSeenAt: admin.lastSeenAt || null } });
    }
    if (method === 'POST' && path === '/me/purchase-requests') {
      const required = this.needUser(user); if (required) return required;
      const plan = asText(body.plan, 16).toLowerCase();
      const amountVnd = Number(body.amountVnd);
      if (!['pro', 'premium'].includes(plan)) return fail('Gói yêu cầu không hợp lệ.');
      if (plan === 'pro' && amountVnd !== 1000) return fail('Gói Pro dùng thử có mức cố định 1.000đ cho 3 giờ.');
      if (plan === 'premium' && (!Number.isInteger(amountVnd) || amountVnd < 1000 || amountVnd > 100000 || amountVnd % 1000 !== 0)) return fail('Mức đề nghị Premium phải từ 1.000đ đến 100.000đ, theo bậc 1.000đ.');
      const admin = findSupportAdmin(this.db);
      if (!admin) return fail('Máy chủ chưa cấu hình tài khoản admin để nhận yêu cầu.', 503);
      const existing = this.db.purchaseRequests.find(item => item.userId === user.id && item.plan === plan && item.status === 'pending');
      if (existing) return json({ request: { id: existing.id, plan: existing.plan, amountVnd: existing.amountVnd, status: existing.status, createdAt: existing.createdAt }, admin: publicUser(admin), duplicate: true, message: 'Bạn đã có yêu cầu đang chờ admin xử lý; không tạo yêu cầu trùng.' });
      const isPremiumInquiry = plan === 'premium';
      const request = { id: crypto.randomUUID(), userId: user.id, plan, amountVnd, status: 'pending', kind: isPremiumInquiry ? 'premium_inquiry' : 'pro_3h', createdAt: nowIso(), reviewedAt: null, reviewedBy: null };
      this.db.purchaseRequests.push(request); this.db.purchaseRequests = this.db.purchaseRequests.slice(-5000);
      const detail = isPremiumInquiry
        ? `ĐỀ NGHỊ PREMIUM · ${amountVnd.toLocaleString('vi-VN')}đ (không phải thanh toán; Premium hiện không bán tự động). Mã: ${request.id}`
        : `YÊU CẦU PRO 3 GIỜ · 1.000đ. Chỉ cấp sau khi admin xác nhận đã nhận tiền. Mã: ${request.id}`;
      const now = nowIso();
      this.db.directMessages.push({ id: crypto.randomUUID(), from: user.id, to: admin.id, text: detail, createdAt: now, readAt: null });
      this.db.directMessages.push({ id: crypto.randomUUID(), from: admin.id, to: user.id, text: isPremiumInquiry
        ? `VILA Admin · trợ lý: Đã ghi nhận đề nghị Premium ${amountVnd.toLocaleString('vi-VN')}đ. Premium hiện không bán tự động và đề nghị này không kích hoạt gói. Admin sẽ phản hồi tại cuộc trò chuyện này.`
        : 'VILA Admin · trợ lý: Đã nhận yêu cầu Pro 3 giờ (1.000đ). Gói chưa được kích hoạt; admin cần xác nhận đã nhận thanh toán trong bảng quản trị.', createdAt: now, readAt: null });
      this.db.directMessages = this.db.directMessages.slice(-100_000);
      audit(this.db, user.id, 'purchase_request_created', request.id, `${plan};amountVnd=${amountVnd}`);
      return json({ request: { id: request.id, plan, amountVnd, status: request.status, createdAt: request.createdAt }, admin: publicUser(admin), duplicate: false, message: isPremiumInquiry ? 'Đề nghị đã gửi đến admin; Premium không tự bán hoặc tự kích hoạt.' : 'Yêu cầu đã gửi đến admin. Pro chỉ có hiệu lực 3 giờ sau khi admin xác nhận thanh toán.' }, 201);
    }

    if (method === 'GET' && path === '/friends') {
      const required = this.needUser(user); if (required) return required;
      const items = this.db.friendRequests;
      const incoming = items.filter(item => item.status === 'pending' && item.to === user.id).map(item => ({ id: item.id, createdAt: item.createdAt, user: publicUser(this.db.users.find(candidate => candidate.id === item.from) || {}) }));
      const outgoing = items.filter(item => item.status === 'pending' && item.from === user.id).map(item => ({ id: item.id, createdAt: item.createdAt, user: publicUser(this.db.users.find(candidate => candidate.id === item.to) || {}) }));
      const friends = items.filter(item => item.status === 'accepted' && (item.from === user.id || item.to === user.id)).map(item => this.db.users.find(candidate => candidate.id === (item.from === user.id ? item.to : item.from))).filter(candidate => candidate && !candidate.banned).map(publicUser).sort((a, b) => Number(b.online) - Number(a.online) || a.displayName.localeCompare(b.displayName));
      return json({ friends, incoming, outgoing });
    }
    if (method === 'POST' && path === '/friends/request') {
      const required = this.needUser(user); if (required) return required;
      const username = asText(body.username, 24).toLowerCase(); const target = this.db.users.find(item => item.username.toLowerCase() === username && !item.banned);
      if (!target) return fail('Không tìm thấy người chơi này.', 404);
      if (target.id === user.id) return fail('Bạn không thể tự kết bạn với mình.');
      let existing = this.db.friendRequests.find(item => (item.from === user.id && item.to === target.id) || (item.from === target.id && item.to === user.id));
      if (existing?.status === 'accepted') return fail('Hai bạn đã là bạn bè.', 409);
      if (existing?.status === 'pending' && existing.from === target.id) { existing.status = 'accepted'; existing.updatedAt = nowIso(); return json({ message: 'Đã chấp nhận lời mời đang chờ; hai bạn đã là bạn bè.' }); }
      if (existing?.status === 'pending') return fail('Lời mời kết bạn đã được gửi.', 409);
      existing = { id: crypto.randomUUID(), from: user.id, to: target.id, status: 'pending', createdAt: nowIso(), updatedAt: null };
      this.db.friendRequests.push(existing); audit(this.db, user.id, 'friend_request_sent', target.id, 'pending');
      return json({ message: `Đã gửi lời mời kết bạn tới @${target.username}.` }, 201);
    }
    if (method === 'POST' && params[0] === 'friends' && params[2] === 'accept' && params.length === 3) {
      const required = this.needUser(user); if (required) return required;
      const item = this.db.friendRequests.find(entry => entry.id === params[1] && entry.to === user.id && entry.status === 'pending');
      if (!item) return fail('Không tìm thấy lời mời đang chờ.', 404);
      item.status = 'accepted'; item.updatedAt = nowIso(); audit(this.db, user.id, 'friend_request_accepted', item.from, 'accepted'); return json({ message: 'Đã thêm bạn bè.' });
    }
    if (method === 'DELETE' && params[0] === 'friends' && params.length === 2) {
      const required = this.needUser(user); if (required) return required;
      const before = this.db.friendRequests.length;
      this.db.friendRequests = this.db.friendRequests.filter(item => !((item.from === user.id && item.to === params[1]) || (item.to === user.id && item.from === params[1]) || (item.id === params[1] && (item.from === user.id || item.to === user.id))));
      if (before === this.db.friendRequests.length) return fail('Không tìm thấy bạn bè/lời mời tương ứng.', 404);
      return json({ message: 'Đã cập nhật danh sách bạn bè.' });
    }
    if (method === 'GET' && path === '/leaderboard') {
      const limit = clamp(Number(query.get('limit')) || 100, 1, 100);
      const users = this.db.users.filter(item => !item.banned).map(publicUser).sort((a, b) => b.elo - a.elo || b.games - a.games || String(a.createdAt).localeCompare(String(b.createdAt)));
      return json({ users: users.slice(0, limit).map((item, index) => ({ rank: index + 1, ...item })), totalPlayers: users.length, generatedAt: nowIso(), source: 'server' });
    }
    if (method === 'GET' && path === '/inbox') {
      const required = this.needUser(user); if (required) return required;
      const reads = new Set(Array.isArray(this.db.announcementReads[user.id]) ? this.db.announcementReads[user.id] : []);
      const announcements = this.db.announcements.slice(-100).reverse().map(item => ({ ...item, read: reads.has(item.id) }));
      return json({ announcements, unread: announcements.filter(item => !item.read).length });
    }
    if (method === 'POST' && params[0] === 'inbox' && params[1] && params[2] === 'read') {
      const required = this.needUser(user); if (required) return required;
      if (!this.db.announcements.some(item => item.id === params[1])) return fail('Không tìm thấy thông báo.', 404);
      const reads = Array.isArray(this.db.announcementReads[user.id]) ? this.db.announcementReads[user.id] : [];
      if (!reads.includes(params[1])) reads.push(params[1]); this.db.announcementReads[user.id] = reads.slice(-500); return json({ ok: true });
    }
    if (method === 'POST' && path === '/inbox/read-all') {
      const required = this.needUser(user); if (required) return required;
      this.db.announcementReads[user.id] = this.db.announcements.slice(-500).map(item => item.id); return json({ ok: true });
    }
    if (method === 'POST' && path === '/history/sync') {
      const required = this.needUser(user); if (required) return required;
      const clientGames = Array.isArray(body.games) ? body.games.slice(0, 150) : [];
      const existing = Array.isArray(this.db.userHistory[user.id]) ? this.db.userHistory[user.id] : [];
      const signatures = new Set(existing.map(game => game.signature || game.id));
      for (const game of clientGames) { if (!game || typeof game !== 'object') continue; const key = game.signature || game.id; if (!key || signatures.has(key)) continue; signatures.add(key); existing.push(game); }
      existing.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)); this.db.userHistory[user.id] = existing.slice(0, 150);
      return json({ ok: true, syncedCount: this.db.userHistory[user.id].length, games: this.db.userHistory[user.id] });
    }
    if (method === 'GET' && path === '/history') {
      const required = this.needUser(user); if (required) return required;
      return json({ ok: true, games: Array.isArray(this.db.userHistory[user.id]) ? this.db.userHistory[user.id] : [] });
    }
    if (method === 'POST' && path === '/ranked/queue') return this.rankedQueue(user, body);
    if (method === 'GET' && path === '/ranked/status') return this.rankedStatus(user);
    if (method === 'POST' && path === '/ranked/cancel-queue') {
      const required = this.needUser(user); if (required) return required;
      const length = this.db.rankedQueue.length; this.db.rankedQueue = this.db.rankedQueue.filter(entry => entry.userId !== user.id);
      return json({ queued: false, cancelled: length !== this.db.rankedQueue.length });
    }
    if (['POST'].includes(method) && params[0] === 'ranked' && params[1] === 'matches' && params[3] === 'move') return this.rankedMove(user, params[2], body);
    if (['POST'].includes(method) && params[0] === 'ranked' && params[1] === 'matches' && ['resign', 'abandon'].includes(params[3])) return this.rankedFinish(user, params[2], params[3]);
    if (method === 'GET' && path === '/admin/fair-play') {
      const required = await this.requireUser(user); if (required) return required;
      if (user.role !== 'admin') return fail('Bạn không có quyền quản trị.', 403);
      const matches = this.db.matches.filter(match => match?.ranked === true && match.fairPlayEvents?.length).map(match => ({
        matchId: match.id, status: match.status, timeCategory: match.timeCategory, timeControl: match.timeControl,
        players: Object.fromEntries(['w', 'b'].map(color => { const id = match.players?.[color]; const target = this.db.users.find(item => item.id === id); return [color, { id, username: target?.username || 'unknown', signals: match.fairPlaySignals?.[id] || { signals: 0, ultraFastMoves: 0, level: 'review' } }]; })), events: match.fairPlayEvents.slice(-30)
      })).slice(-100).reverse();
      return json({ matches, note: 'Các tín hiệu chỉ hỗ trợ rà soát thủ công; không phải bằng chứng chắc chắn về gian lận và không tự động khóa tài khoản.' });
    }
    if (method === 'GET' && path === '/admin/purchase-requests') {
      const required = this.needUser(user); if (required) return required;
      if (user.role !== 'admin') return fail('Bạn không có quyền quản trị.', 403);
      const status = ['pending', 'approved', 'contacted', 'rejected', 'all'].includes(String(query.get('status') || 'pending')) ? String(query.get('status') || 'pending') : 'pending';
      const requests = this.db.purchaseRequests.filter(item => status === 'all' || item.status === status).slice(-300).reverse().map(item => ({
        id: item.id, plan: item.plan, amountVnd: item.amountVnd, kind: item.kind, status: item.status, createdAt: item.createdAt, reviewedAt: item.reviewedAt,
        user: publicUser(this.db.users.find(candidate => candidate.id === item.userId) || { id: item.userId, username: 'deleted', displayName: 'Tài khoản không tồn tại' })
      }));
      return json({ requests, pending: this.db.purchaseRequests.filter(item => item.status === 'pending').length });
    }
    if (method === 'POST' && params[0] === 'admin' && params[1] === 'purchase-requests' && params[3] === 'decision' && params.length === 4) {
      const required = this.needUser(user); if (required) return required;
      if (user.role !== 'admin') return fail('Bạn không có quyền quản trị.', 403);
      const request = this.db.purchaseRequests.find(item => item.id === params[2]);
      if (!request) return fail('Không tìm thấy yêu cầu gói.', 404);
      if (request.status !== 'pending') return fail('Yêu cầu này đã được xử lý.', 409);
      const action = asText(body.action, 24);
      const target = this.db.users.find(item => item.id === request.userId);
      if (!target || target.banned) return fail('Tài khoản yêu cầu không còn hoạt động.', 409);
      let responseText = '';
      if (action === 'confirm-pro') {
        if (request.plan !== 'pro') return fail('Chỉ yêu cầu Pro 3 giờ mới có thể được cấp từ panel này.');
        target.entitlement = grantProTrial(normalizeEntitlement(target.entitlement));
        request.status = 'approved';
        responseText = `Admin đã xác nhận thanh toán và cấp Pro dùng thử 3 giờ. Hết hạn dự kiến: ${new Date(target.entitlement.proExpiresAt).toLocaleString('vi-VN')}.`;
        audit(this.db, user.id, 'purchase_request_pro_approved', target.id, `request=${request.id}; amountVnd=${request.amountVnd}; durationMs=10800000`);
      } else if (action === 'grant-premium') {
        if (request.plan !== 'premium') return fail('Chỉ đề nghị Premium mới có thể được cấp Premium từ panel này.');
        target.entitlement = grantPlan(normalizeEntitlement(target.entitlement), 'premium');
        request.status = 'approved';
        responseText = 'Admin đã xác nhận và cấp Premium cho tài khoản của bạn.';
        audit(this.db, user.id, 'purchase_request_premium_granted', target.id, `request=${request.id}; amountVnd=${request.amountVnd}`);
      } else if (action === 'contacted') {
        if (request.plan !== 'premium') return fail('Hành động liên hệ này chỉ áp dụng cho đề nghị Premium.');
        request.status = 'contacted';
        responseText = 'Admin đã xem đề nghị Premium của bạn và sẽ trao đổi trực tiếp. Premium hiện không bán tự động; quyền Premium chưa được cấp.';
        audit(this.db, user.id, 'purchase_request_premium_contacted', target.id, `request=${request.id}; amountVnd=${request.amountVnd}`);
      } else if (action === 'reject') {
        request.status = 'rejected';
        responseText = 'Admin đã đóng yêu cầu gói này. Nếu bạn cho rằng có nhầm lẫn, hãy gửi tin nhắn trong cuộc trò chuyện admin.';
        audit(this.db, user.id, 'purchase_request_rejected', target.id, `request=${request.id}; plan=${request.plan}`);
      } else return fail('Hành động chỉ được là confirm-pro, grant-premium, contacted hoặc reject.');
      request.reviewedAt = nowIso(); request.reviewedBy = user.id;
      this.db.directMessages.push({ id: crypto.randomUUID(), from: user.id, to: target.id, text: `VILA Admin: ${responseText}`, createdAt: request.reviewedAt, readAt: null });
      this.db.directMessages = this.db.directMessages.slice(-100_000);
      return json({ request: { id: request.id, plan: request.plan, amountVnd: request.amountVnd, status: request.status, reviewedAt: request.reviewedAt }, user: { ...publicUser(target), entitlement: entitlementForClient(target.entitlement) }, message: responseText });
    }

    if (method === 'GET' && path === '/admin/revenue') {
      const required = this.needUser(user); if (required) return required;
      if (user.role !== 'admin') return fail('Bạn không có quyền quản trị.', 403);
      // Revenue = purchase requests an admin confirmed as paid (approved). Pending items are shown separately and never counted.
      const requests = this.db.purchaseRequests || [];
      const approved = requests.filter(item => item.status === 'approved');
      const stamp = item => Date.parse(item.reviewedAt || item.createdAt) || 0;
      const vnd = item => Math.max(0, Number(item.amountVnd) || 0);
      const sum = items => items.reduce((total, item) => total + vnd(item), 0);
      const now = Date.now();
      const within = ms => approved.filter(item => now - stamp(item) < ms);
      const byDay = [];
      for (let offset = 13; offset >= 0; offset -= 1) {
        const day = new Date(now - offset * DAY_MS).toISOString().slice(0, 10);
        const items = approved.filter(item => new Date(stamp(item)).toISOString().slice(0, 10) === day);
        byDay.push({ date: day, vnd: sum(items), count: items.length });
      }
      const byPlan = {};
      for (const item of approved) { const key = item.plan || 'other'; byPlan[key] = byPlan[key] || { count: 0, vnd: 0 }; byPlan[key].count += 1; byPlan[key].vnd += vnd(item); }
      const play = (this.db.purchases || []).filter(item => item.status === 'granted');
      const playByPlan = {};
      for (const item of play) { const key = item.plan || 'other'; playByPlan[key] = (playByPlan[key] || 0) + 1; }
      const playPrice = { pro: Number(this.env?.PLAY_PRICE_VND_PRO) || 0, premium: Number(this.env?.PLAY_PRICE_VND_PREMIUM) || 0 };
      const playEstimateVnd = play.reduce((total, item) => total + (Number(item.priceVnd) || playPrice[item.plan] || 0), 0);
      const pending = requests.filter(item => item.status === 'pending' && item.kind !== 'premium_inquiry');
      return json({
        currency: 'VND',
        totals: { today: sum(within(DAY_MS)), week: sum(within(7 * DAY_MS)), month: sum(within(30 * DAY_MS)), all: sum(approved) },
        counts: { approved: approved.length, payingUsers: new Set(approved.map(item => item.userId)).size, pending: pending.length, pendingVnd: sum(pending) },
        byPlan, byDay,
        googlePlay: { purchases: play.length, byPlan: playByPlan, estimateVnd: playEstimateVnd, priceConfigured: playEstimateVnd > 0 || (!play.length && (playPrice.pro > 0 || playPrice.premium > 0)) },
        note: 'Doanh thu thủ công = các yêu cầu admin đã xác nhận. Google Play chỉ ước tính khi đặt biến PLAY_PRICE_VND_PRO / PLAY_PRICE_VND_PREMIUM.'
      });
    }
    if (method === 'GET' && path === '/admin/overview') {
      const required = this.needUser(user); if (required) return required;
      if (user.role !== 'admin') return fail('Bạn không có quyền quản trị.', 403);
      return json({ users: this.db.users.length, activeUsers: this.db.users.filter(item => !item.banned && item.lastSeenAt && Date.now() - Date.parse(item.lastSeenAt) < 90_000).length, bannedUsers: this.db.users.filter(item => item.banned).length, admins: this.db.users.filter(item => item.role === 'admin' && !item.banned).length, pendingFriendRequests: this.db.friendRequests.filter(item => item.status === 'pending').length, pendingReports: this.db.userReports.filter(item => item.status === 'pending').length, uptimeSeconds: 0, node: 'Cloudflare Workers', platform: 'cloudflare', arch: 'managed', cpus: 1, loadAverage: [], memory: {}, db: { users: this.db.users.length, friendRequests: this.db.friendRequests.length, auditEvents: this.db.audit.length } });
    }
    if (method === 'GET' && path === '/admin/users') {
      const required = this.needUser(user); if (required) return required;
      if (user.role !== 'admin') return fail('Bạn không có quyền quản trị.', 403);
      const q = asText(query.get('q'), 80).toLowerCase(); const users = this.db.users.filter(item => !q || item.username.toLowerCase().includes(q) || item.displayName.toLowerCase().includes(q) || String(item.email || '').toLowerCase().includes(q)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 200).map(item => ({ ...publicUser(item), email: item.email || '', entitlement: entitlementForClient(item.role === 'admin' ? { premium: true } : item.entitlement) }));
      return json({ users, total: this.db.users.length });
    }
    if (method === 'GET' && path === '/admin/reports') {
      const required = this.needUser(user); if (required) return required;
      if (user.role !== 'admin') return fail('Bạn không có quyền quản trị.', 403);
      const status = ['pending', 'actioned', 'dismissed'].includes(String(query.get('status') || 'pending')) ? String(query.get('status') || 'pending') : 'pending';
      const reports = this.db.userReports.filter(item => item.status === status).slice(-200).reverse().map(item => ({
        id: item.id, reason: item.reason, details: item.details || '', status: item.status, createdAt: item.createdAt,
        reporter: publicUser(this.db.users.find(candidate => candidate.id === item.reporterId) || { id: '', username: 'unknown', displayName: 'Tài khoản không tồn tại' }),
        target: publicUser(this.db.users.find(candidate => candidate.id === item.targetUserId) || { id: '', username: 'deleted', displayName: 'Tài khoản không tồn tại' })
      }));
      return json({ reports, totalPending: this.db.userReports.filter(item => item.status === 'pending').length });
    }
    if (method === 'PATCH' && params[0] === 'admin' && params[1] === 'reports' && params.length === 3) {
      const required = this.needUser(user); if (required) return required;
      if (user.role !== 'admin') return fail('Bạn không có quyền quản trị.', 403);
      const report = this.db.userReports.find(item => item.id === params[2]);
      if (!report) return fail('Không tìm thấy báo cáo.', 404);
      if (report.status !== 'pending') return fail('Báo cáo đã được xử lý.', 409);
      const action = asText(body.action, 20), target = this.db.users.find(item => item.id === report.targetUserId);
      if (action === 'dismiss') report.status = 'dismissed';
      else if (action === 'ban') {
        if (!target) return fail('Không tìm thấy tài khoản bị báo cáo.', 404);
        if (target.id === user.id || target.role === 'admin') return fail('Không thể khóa tài khoản admin qua xử lý báo cáo.', 403);
        target.sessionVersion = (Number(target.sessionVersion) || 0) + 1; target.banned = true;
        target.banReason = asText(body.reason || `Báo cáo đã xác minh: ${report.reason}`, 180); target.bannedAt = nowIso();
        report.status = 'actioned';
      } else return fail('Hành động phải là ban hoặc dismiss.');
      report.reviewedAt = nowIso(); report.reviewedBy = user.id;
      audit(this.db, user.id, action === 'ban' ? 'report_action_ban' : 'report_dismissed', report.targetUserId, `report=${report.id}; reason=${report.reason}`);
      return json({ report: { id: report.id, status: report.status }, message: action === 'ban' ? 'Đã khóa tài khoản theo báo cáo.' : 'Đã đóng báo cáo.' });
    }
    if (method === 'PATCH' && params[0] === 'admin' && params[1] === 'users' && params.length === 3) {
      const required = this.needUser(user); if (required) return required;
      if (user.role !== 'admin') return fail('Bạn không có quyền quản trị.', 403);
      const target = this.db.users.find(item => item.id === params[2]); if (!target) return fail('Không tìm thấy tài khoản.', 404);
      if (target.id === user.id || target.role === 'admin') return fail('Không thể tác động tài khoản quản trị viên này.', 403);
      if (body.action === 'ban') { target.sessionVersion = (Number(target.sessionVersion) || 0) + 1; target.banned = true; target.banReason = asText(body.reason || 'Vi phạm quy định cộng đồng', 180); target.bannedAt = nowIso(); }
      else if (body.action === 'unban') { target.banned = false; target.banReason = ''; target.bannedAt = null; }
      else return fail('Hành động chỉ được là ban hoặc unban.');
      audit(this.db, user.id, `user_${body.action}`, target.id, target.banReason || 'unbanned'); return json({ user: publicUser(target), message: body.action === 'ban' ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.' });
    }
    if (method === 'POST' && path === '/me/review-access') {
      const required = this.needUser(user); if (required) return required;
      const gameId = asText(body.gameId, 120);
      if (user.role === 'admin') return json({ allowed: true, reason: 'admin', entitlement: entitlementForClient({ premium: true }) });
      const access = reviewAccess(user.entitlement, gameId);
      if (access.allowed && access.consumesFree) {
        user.entitlement = consumeFreeReview(user.entitlement, gameId || `game-${Date.now()}`);
        audit(this.db, user.id, 'free_review_used', gameId, '');
      }
      return json({ allowed: access.allowed, reason: access.reason, entitlement: entitlementForClient(user.entitlement) }, access.allowed ? 200 : 402);
    }
    if (method === 'POST' && path === '/me/redeem-code') {
      const required = this.needUser(user); if (required) return required;
      const code = asText(body.code, 80).toLowerCase();
      if (!/^[a-z0-9-]{4,80}$/.test(code)) return fail('Nhập mã kích hoạt hợp lệ.');
      const secret = String(this.env.VILA_TRIAL_CODE_SECRET || '');
      const proHash = String(this.env.VILA_PRO_TRIAL_CODE_HMAC || '').toLowerCase();
      const premiumHash = String(this.env.VILA_PREMIUM_TRIAL_CODE_HMAC || '').toLowerCase();
      if (new TextEncoder().encode(secret).length < 32 || !/^[a-f0-9]{64}$/.test(proHash) || !/^[a-f0-9]{64}$/.test(premiumHash)) return fail('Máy chủ chưa cấu hình kho mã dùng thử an toàn. Chủ dự án cần thiết lập ba biến bí mật VILA_TRIAL_CODE_*.', 503);
      const digest = await hmacHex(secret, code);
      const type = constantTimeEqual(digest, proHash) ? 'pro-5d' : constantTimeEqual(digest, premiumHash) ? 'premium-1m' : '';
      if (!type) { audit(this.db, user.id, 'trial_code_invalid', user.id, ''); return fail('Mã không đúng hoặc đã bị thu hồi.'); }
      if (user.role === 'admin') return fail('Tài khoản admin đã có quyền quản trị, không cần dùng mã thử.', 409);
      const prior = Array.isArray(user.trialCodeRedemptions) ? user.trialCodeRedemptions : [];
      if (prior.some(item => item?.type === type)) return fail('Tài khoản này đã sử dụng mã dùng thử tương ứng rồi.', 409);
      const now = Date.now();
      const current = normalizeEntitlement(user.entitlement);
      if (effectivePlan(current, now) === 'premium' && current.premiumExpiresAt == null) return fail('Tài khoản đã có Premium trọn đời; mã dùng thử không làm thay đổi gói hiện tại.', 409);
      const entitlement = type === 'pro-5d' ? grantProCodeTrial(current, now) : grantPremiumCodeTrial(current, now);
      const expiresAt = type === 'pro-5d' ? entitlement.proExpiresAt : entitlement.premiumExpiresAt;
      user.entitlement = entitlement;
      user.trialCodeRedemptions = [...prior, { type, redeemedAt: nowIso() }].slice(-10);
      const durationMs = type === 'pro-5d' ? PRO_CODE_TRIAL_DURATION_MS : PREMIUM_CODE_TRIAL_DURATION_MS;
      audit(this.db, user.id, 'trial_code_redeemed', user.id, `${type};durationMs=${durationMs}`);
      return json({ ok: true, plan: type === 'pro-5d' ? 'pro' : 'premium', trial: true, expiresAt: new Date(expiresAt).toISOString(), user: selfUser(user), message: type === 'pro-5d' ? 'Đã kích hoạt Pro dùng thử 5 ngày.' : 'Đã kích hoạt Premium dùng thử 1 phút.' });
    }
    if (method === 'PATCH' && params[0] === 'admin' && params[1] === 'users' && params[3] === 'plan' && params.length === 4) {
      const required = this.needUser(user); if (required) return required;
      if (user.role !== 'admin') return fail('Bạn không có quyền quản trị.', 403);
      const target = this.db.users.find(item => item.id === params[2]); if (!target) return fail('Không tìm thấy tài khoản.', 404);
      const action = asText(body.action, 10), plan = asText(body.plan, 10);
      if (target.banned) return fail('Không thể đổi gói của tài khoản đang bị khóa.', 409);
      const days = body.days == null ? null : Number(body.days);
      if (days != null && (plan !== 'pro' || action !== 'grant' || !Number.isInteger(days) || days < 1 || days > 366)) return fail('Số ngày chỉ áp dụng khi cấp Pro và phải từ 1 đến 366.');
      try {
        if (action === 'grant' && plan === 'pro' && days != null) {
          const ent = normalizeEntitlement(target.entitlement);
          if (ent.premium && ent.premiumExpiresAt == null) return fail('Tài khoản đã có Premium trọn đời; không cần cấp Pro.', 409);
          const now = Date.now();
          const base = ent.proExpiresAt != null && ent.proExpiresAt > now ? ent.proExpiresAt : now;
          target.entitlement = { ...ent, proExpiresAt: base + days * DAY_MS };
        } else if (action === 'grant') target.entitlement = grantPlan(normalizeEntitlement(target.entitlement), plan);
        else if (action === 'revoke') target.entitlement = revokePlan(normalizeEntitlement(target.entitlement), plan);
        else return fail('Hành động chỉ được là grant hoặc revoke.');
      } catch (error) { return fail(error.message); }
      audit(this.db, user.id, `plan_${action}`, target.id, days != null ? `${plan};days=${days}` : plan);
      const planName = plan === 'premium' ? 'Premium' : plan === 'pro' ? 'Pro' : plan;
      const notice = action === 'grant' ? `VILA Admin: Bạn đã được cấp gói ${planName}${days != null ? ` (${days} ngày)` : ''}. Huy hiệu ${planName} sẽ hiển thị trên hồ sơ của bạn.` : `VILA Admin: Gói ${planName} của bạn đã được thu hồi.`;
      this.db.directMessages.push({ id: crypto.randomUUID(), from: user.id, to: target.id, text: notice, createdAt: nowIso(), readAt: null });
      this.db.directMessages = this.db.directMessages.slice(-100_000);
      return json({ user: { ...publicUser(target), entitlement: entitlementForClient(target.entitlement) }, message: action === 'grant' ? `Đã cấp gói ${planName}${days != null ? ` ${days} ngày` : ''}.` : `Đã thu hồi gói ${planName}.` });
    }
    if (method === 'GET' && path === '/me/billing-config') {
      const required = this.needUser(user); if (required) return required;
      return json({ enabled: billingConfigured(this.env), products: billingProducts(this.env), accountId: await accountBindingId(user.id) });
    }
    if (method === 'POST' && path === '/me/purchase/verify') {
      const required = this.needUser(user); if (required) return required;
      return this.purchaseVerify(user, body);
    }
    if (method === 'POST' && path === '/admin/billing/sync-voided') {
      const required = this.needUser(user); if (required) return required;
      if (user.role !== 'admin') return fail('Bạn không có quyền quản trị.', 403);
      try { return json(await this.syncVoided()); } catch (error) { return fail(error.message || 'Không đồng bộ được hoàn tiền.', error.status || 502); }
    }
    // Reached only by the Worker's own scheduled() handler: the public fetch() forwards /api/social/* exclusively.
    if (internal && method === 'POST' && path === '/__cron/sync-voided') {
      try { return json(await this.syncVoided()); } catch (error) { return fail(error.message || 'Không đồng bộ được hoàn tiền.', error.status || 502); }
    }
    if (method === 'POST' && path === '/admin/announcements') {
      const required = this.needUser(user); if (required) return required;
      if (user.role !== 'admin') return fail('Bạn không có quyền quản trị.', 403);
      const title = asText(body.title, 100), message = asText(body.message, 1200); if (title.length < 3 || message.length < 5) return fail('Tiêu đề cần ít nhất 3 ký tự, nội dung ít nhất 5 ký tự.');
      const announcement = { id: crypto.randomUUID(), title, message, author: user.username, createdAt: nowIso() }; this.db.announcements.push(announcement); this.db.announcements = this.db.announcements.slice(-500); audit(this.db, user.id, 'announcement_published', announcement.id, title);
      return json({ announcement, message: 'Đã gửi thông báo tới hộp thư trong app.' }, 201);
    }
    if (method === 'GET' && path === '/admin/audit') {
      const required = this.needUser(user); if (required) return required;
      if (user.role !== 'admin') return fail('Bạn không có quyền quản trị.', 403);
      return json({ events: this.db.audit.slice(-clamp(Number(query.get('limit')) || 100, 1, 200)).reverse() });
    }
    return fail('API chưa được hỗ trợ trong backend Cloudflare này.', 404);
  }
  entitlementPayload(user) { return entitlementForClient(user.entitlement); }
  async purchaseVerify(user, body) {
    if (!billingConfigured(this.env)) return fail('Thanh toán chưa được bật trên máy chủ.', 503);
    const productId = asText(body.productId, 80), purchaseToken = asText(body.purchaseToken, 1000);
    const plan = planForProduct(this.env, productId);
    if (!plan || !purchaseToken) return fail('Sản phẩm hoặc mã giao dịch không hợp lệ.');
    const id = await sha256Hex(purchaseToken);
    const existing = this.db.purchases.find(item => item.id === id);
    if (existing) {
      if (existing.userId !== user.id) { audit(this.db, user.id, 'purchase_token_conflict', id.slice(0, 12), 'token belongs to another account'); return fail('Giao dịch này đã được dùng cho tài khoản khác.', 409); }
      if (existing.status === 'voided') return fail('Giao dịch này đã bị hoàn tiền.', 409);
      return json({ granted: false, alreadyGranted: true, plan: existing.plan, consume: existing.plan === 'pro', entitlement: this.entitlementPayload(user) });
    }
    let info;
    try { info = await lookupPurchase(this.env, { productId, purchaseToken }); }
    catch (error) { if (error instanceof BillingError) return fail(error.message, error.status); throw error; }
    if (info.state === 'pending') return json({ granted: false, pending: true, message: 'Giao dịch đang chờ xử lý. Gói sẽ được kích hoạt khi Google xác nhận thanh toán.' }, 202);
    if (info.state !== 'purchased') return fail('Giao dịch chưa hoàn tất hoặc đã bị hủy.', 402);
    if (!constantTimeEqual(info.accountId, await accountBindingId(user.id))) { audit(this.db, user.id, 'purchase_account_mismatch', id.slice(0, 12), productId); return fail('Giao dịch này không thuộc tài khoản đang đăng nhập.', 403); }
    if (info.orderId && this.db.purchases.some(item => item.orderId === info.orderId)) return fail('Giao dịch này đã được ghi nhận.', 409);
    user.entitlement = grantPlan(normalizeEntitlement(user.entitlement), plan);
    this.db.purchases.push({ id, userId: user.id, productId, plan, orderId: info.orderId, status: 'granted', grantedAt: nowIso(), purchaseTimeMillis: info.purchaseTimeMillis, priceVnd: Number(plan === 'premium' ? this.env?.PLAY_PRICE_VND_PREMIUM : this.env?.PLAY_PRICE_VND_PRO) || 0 });
    audit(this.db, user.id, 'purchase_granted', id.slice(0, 12), `${plan}; order=${info.orderId}`);
    if (!info.acknowledged) {
      let acked = false;
      try { acked = await acknowledgePurchase(this.env, { productId, purchaseToken }, fetch, info.accessToken); } catch { acked = false; }
      if (!acked) audit(this.db, user.id, 'purchase_ack_failed', id.slice(0, 12), 'client must acknowledge');
    }
    return json({ granted: true, alreadyGranted: false, plan, consume: plan === 'pro', entitlement: this.entitlementPayload(user) }, 201);
  }
  /** Revoke what Google refunded or charged back. Idempotent: a purchase is only voided once. */
  async syncVoided(now = Date.now()) {
    if (!billingConfigured(this.env)) throw new BillingError('Thanh toán chưa được bật trên máy chủ.', 503);
    const voided = await listVoidedPurchases(this.env, now - 30 * DAY_MS);
    let revoked = 0;
    for (const item of voided) {
      const id = await sha256Hex(item.purchaseToken);
      const record = this.db.purchases.find(entry => entry.id === id);
      if (!record || record.status !== 'granted') continue;
      record.status = 'voided'; record.voidedAt = nowIso();
      const target = this.db.users.find(entry => entry.id === record.userId);
      if (target) target.entitlement = refundPurchase(target.entitlement, record.plan, now);
      audit(this.db, 'system', 'purchase_voided', id.slice(0, 12), `${record.plan}; user=${record.userId}`);
      revoked++;
    }
    return { checked: voided.length, revoked };
  }
  chooseAvatarId() {
    const used = new Set(this.db.users.filter(item => Number.isInteger(item.avatarId)).map(item => item.avatarId));
    for (let i = 0; i < 1000; i++) { const id = Math.floor(Math.random() * 1000); if (!used.has(id)) return id; }
    return Math.floor(Math.random() * 1000);
  }
  async requireUser(user) { return user ? null : fail('Bạn cần đăng nhập lại để tiếp tục.', 401); }
  async rankedQueue(user, body) {
    const required = await this.requireUser(user); if (required) return required;
    const active = activeMatchFor(this.db, user.id); if (active) return json(joinPayload(this.db, user.id));
    const timeControl = asText(body.timeControl, 16) || '1d'; const spec = CONTROLS[timeControl];
    if (!spec) return fail('Mốc thời gian không được hỗ trợ.');
    const now = Date.now();
    this.db.rankedQueue = this.db.rankedQueue.filter(entry => now - Number(entry.joinedAt || 0) < 180_000 && this.db.users.some(candidate => candidate.id === entry.userId && !candidate.banned) && !activeMatchFor(this.db, entry.userId));
    const self = this.db.rankedQueue.find(entry => entry.userId === user.id);
    if (self?.timeControl === timeControl) return json(joinPayload(this.db, user.id));
    if (self) this.db.rankedQueue = this.db.rankedQueue.filter(entry => entry.userId !== user.id);
    const ratings = ensureRatings(user), ownElo = ratings[spec.category];
    const candidates = this.db.rankedQueue.filter(entry => entry.timeControl === timeControl && entry.timeCategory === spec.category && entry.userId !== user.id && Math.abs(Number(entry.elo) - ownElo) <= matchmakingWindow(now - Number(entry.joinedAt || now)));
    if (!candidates.length) {
      this.db.rankedQueue.push({ userId: user.id, elo: ownElo, timeControl, timeCategory: spec.category, joinedAt: now });
      return json({ ...joinPayload(this.db, user.id), rating: ownElo, timeControl, timeCategory: spec.category }, 202);
    }
    const candidate = candidates[Math.floor(Math.random() * candidates.length)];
    this.db.rankedQueue = this.db.rankedQueue.filter(entry => entry.userId !== candidate.userId && entry.userId !== user.id);
    const opponent = this.db.users.find(item => item.id === candidate.userId);
    if (!opponent || opponent.banned || activeMatchFor(this.db, opponent.id)) {
      this.db.rankedQueue.push({ userId: user.id, elo: ownElo, timeControl, timeCategory: spec.category, joinedAt: now });
      return json({ ...joinPayload(this.db, user.id), rating: ownElo, timeControl, timeCategory: spec.category }, 202);
    }
    const ownRating = ensureRatings(user)[spec.category]; const opponentRating = ensureRatings(opponent)[spec.category];
    const whiteId = crypto.getRandomValues(new Uint8Array(1))[0] % 2 ? user.id : opponent.id;
    const chess = new Chess();
    const otherId = whiteId === user.id ? opponent.id : user.id;
    const match = { id: crypto.randomUUID(), ranked: true, status: 'active', players: { w: whiteId, b: otherId }, startFen: chess.fen(), fen: chess.fen(), moves: [], result: null, resultReason: '', createdAt: nowIso(), lastMoveAt: nowIso(), eloChanges: {}, timeControl, timeCategory: spec.category, clockEnabled: true, clockRemainingMs: { w: spec.base, b: spec.base }, clockIncrementMs: spec.increment, clockUpdatedAt: now, turnStartedAt: now, fairPlaySignals: { [whiteId]: createRankedFairPlayState(), [otherId]: createRankedFairPlayState() }, fairPlayEvents: [], presence: { [whiteId]: now, [otherId]: now } };
    this.db.matches.push(match); this.db.matches = this.db.matches.slice(-500); audit(this.db, user.id, 'ranked_match_created', match.id, `versus=${opponent.username}; ${spec.category} ${timeControl}; ratings=${ownRating}:${opponentRating}`);
    return json({ queued: false, ...makeMatchPayload(this.db, match, user.id) }, 201);
  }
  async rankedStatus(user) {
    const required = await this.requireUser(user); if (required) return required;
    const now = Date.now();
    this.db.rankedQueue = this.db.rankedQueue.filter(entry => now - Number(entry.joinedAt || 0) < 180_000 && this.db.users.some(candidate => candidate.id === entry.userId && !candidate.banned) && !activeMatchFor(this.db, entry.userId));
    const active = activeMatchFor(this.db, user.id);
    if (active) {
      const chess = new Chess(active.fen || active.startFen || undefined);
      const timedOut = settleClock(active, now, chess.turn());
      if (timedOut) { finishMatch(this.db, active, timedOut === 'w' ? '0-1' : '1-0', 'time_forfeit'); return json({ queued: false, ...makeMatchPayload(this.db, active, user.id) }); }
      active.presence = active.presence || {}; active.presence[user.id] = now;
      const presenceExpired = active.timeCategory === 'daily' ? [] : [active.players.w, active.players.b].filter(id => !id || now - Number(active.presence[id] || Date.parse(active.createdAt) || now) > 90_000).sort((a, b) => Number(active.presence[a]) - Number(active.presence[b]));
      if (presenceExpired.length) {
        const quitter = presenceExpired[0]; const winner = quitter === active.players.w ? active.players.b : active.players.w;
        finishMatch(this.db, active, winner === active.players.w ? '1-0' : '0-1', 'disconnect_timeout', quitter);
        return json({ queued: false, ...makeMatchPayload(this.db, active, user.id) });
      }
      return json({ queued: false, ...makeMatchPayload(this.db, active, user.id) });
    }
    const entry = this.db.rankedQueue.find(item => item.userId === user.id);
    if (entry) return json(joinPayload(this.db, user.id));
    const recent = this.db.matches.filter(match => match?.ranked && match.status === 'finished' && (match.players.w === user.id || match.players.b === user.id) && now - (Date.parse(match.finishedAt || '') || 0) < 15 * 60_000).sort((a,b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt))[0];
    if (recent) return json({ queued: false, ...makeMatchPayload(this.db, recent, user.id) });
    return json({ queued: false, rating: Number(user.elo) || 1200, ratingsByCategory: ensureRatings(user), waitMs: 0 });
  }
  async rankedMove(user, matchId, body) {
    const required = await this.requireUser(user); if (required) return required;
    const match = rankedMatchById(this.db, matchId); if (!match || match.status !== 'active') return fail('Không tìm thấy trận xếp hạng đang hoạt động.', 404);
    const color = match.players.w === user.id ? 'w' : match.players.b === user.id ? 'b' : '';
    if (!color) return fail('Bạn không thuộc trận đấu này.', 403);
    const chess = new Chess(match.fen);
    const timeout = settleClock(match, Date.now(), chess.turn());
    if (timeout) { finishMatch(this.db, match, timeout === 'w' ? '0-1' : '1-0', 'time_forfeit'); return fail('Hết giờ. Máy chủ đã xác nhận kết quả.', 409); }
    match.presence = match.presence || {}; match.presence[user.id] = Date.now();
    if (Number(body.expectedPly) !== (match.moves || []).length) return json({ error: 'Bàn cờ đã được cập nhật bởi đối thủ. Đang đồng bộ lại.', match: makeMatchPayload(this.db, match, user.id).match }, 409);
    if (chess.turn() !== color) return json({ error: 'Chưa đến lượt của bạn.', match: makeMatchPayload(this.db, match, user.id).match }, 409);
    const legalMoveCount = chess.moves().length; // position complexity before the submitted move
    const from = asText(body.from, 2), to = asText(body.to, 2), promotion = asText(body.promotion, 1).toLowerCase();
    if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to) || (promotion && !/^[qrbn]$/.test(promotion))) return fail('Nước đi không hợp lệ.');
    let move; try { move = chess.move({ from, to, ...(promotion ? { promotion } : {}) }); } catch { move = null; }
    if (!move) return fail('Nước đi không hợp lệ theo luật cờ vua.');
    const moveAt = Date.now();
    const turnDurationMs = Math.max(0, moveAt - (Number(match.turnStartedAt) || Date.parse(match.createdAt) || moveAt));
    // The legal move count above is measured before applying the move.
    match.fairPlaySignals = match.fairPlaySignals && typeof match.fairPlaySignals === 'object' ? match.fairPlaySignals : {};
    const signal = match.fairPlaySignals[user.id] || (match.fairPlaySignals[user.id] = createRankedFairPlayState());
    const fairPlay = assessRankedFairPlayMove(signal, { userId: user.id, turnDurationMs, legalMoveCount, ply: (match.moves || []).length, now: moveAt });
    const focusCheck = assessRankedFocusSignal(fairPlay.state, { userId: user.id, focusLostMs: body.focusLostMs, focusCount: body.focusCount, turnDurationMs, legalMoveCount, ply: (match.moves || []).length, now: moveAt });
    match.fairPlaySignals[user.id] = focusCheck.state;
    fairPlay.events.push(...focusCheck.events);
    match.fairPlayEvents = Array.isArray(match.fairPlayEvents) ? match.fairPlayEvents : [];
    for (const event of fairPlay.events) {
      if (match.fairPlayEvents.length < 100) match.fairPlayEvents.push(event);
      audit(this.db, 'system', 'ranked_fair_play_signal', match.id, `user=${user.id}; ${event.type}; manual review only`);
    }
    match.moves.push({ from: move.from, to: move.to, promotion: move.promotion || '', san: move.san, flags: move.flags, turnDurationMs, legalMoveCount });
    match.fen = chess.fen(); match.lastMoveAt = nowIso();
    if (match.clockEnabled && match.clockRemainingMs) {
      if (match.timeCategory === 'daily') match.clockRemainingMs[color] = CONTROLS[match.timeControl]?.base || 86_400_000;
      else match.clockRemainingMs[color] = Math.max(0, Number(match.clockRemainingMs[color]) || 0) + Math.max(0, Number(match.clockIncrementMs) || 0);
    }
    match.clockUpdatedAt = Date.now();
    match.turnStartedAt = Date.now();
    const result = ratedResult(chess); if (result) finishMatch(this.db, match, result, chess.isCheckmate() ? 'checkmate' : 'draw');
    return json(makeMatchPayload(this.db, match, user.id));
  }
  async rankedFinish(user, matchId, action) {
    const required = await this.requireUser(user); if (required) return required;
    const match = rankedMatchById(this.db, matchId);
    if (action === 'abandon' && (!match || match.status !== 'active')) return json({ abandoned: false });
    if (!match || match.status !== 'active') return fail('Trận đấu đã kết thúc hoặc không tồn tại.', 404);
    const color = match.players.w === user.id ? 'w' : match.players.b === user.id ? 'b' : '';
    if (!color) return fail('Bạn không thuộc trận đấu này.', 403);
    finishMatch(this.db, match, color === 'w' ? '0-1' : '1-0', action === 'resign' ? 'resignation' : 'abandoned', user.id);
    audit(this.db, user.id, action === 'resign' ? 'ranked_match_resigned' : 'ranked_match_abandoned', match.id, 'rating penalty applied');
    return json(action === 'abandon' ? { abandoned: true, ...makeMatchPayload(this.db, match, user.id) } : makeMatchPayload(this.db, match, user.id));
  }
}
