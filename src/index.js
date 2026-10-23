import { Chess } from 'chess.js';

const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const TOKEN_REFRESH_AFTER_SECONDS = 7 * 24 * 60 * 60;
const MIN_PASSWORD_LENGTH = 8;
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,24}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTROLS = Object.freeze({
  '0.25+0': { category: 'bullet', base: 15_000, increment: 0 },
  '0.5+0': { category: 'bullet', base: 30_000, increment: 0 },
  '1+0': { category: 'bullet', base: 60_000, increment: 0 },
  '2+0': { category: 'bullet', base: 120_000, increment: 0 },
  '2+1': { category: 'bullet', base: 120_000, increment: 1_000 },
  '3+0': { category: 'blitz', base: 180_000, increment: 0 },
  '3+1': { category: 'blitz', base: 180_000, increment: 1_000 },
  '3+2': { category: 'blitz', base: 180_000, increment: 2_000 },
  '5+0': { category: 'blitz', base: 300_000, increment: 0 },
  '5+3': { category: 'blitz', base: 300_000, increment: 3_000 },
  '5+5': { category: 'blitz', base: 300_000, increment: 5_000 },
  '6+0': { category: 'blitz', base: 360_000, increment: 0 },
  '10+0': { category: 'rapid', base: 600_000, increment: 0 },
  '10+5': { category: 'rapid', base: 600_000, increment: 5_000 },
  '15+0': { category: 'rapid', base: 900_000, increment: 0 },
  '15+10': { category: 'rapid', base: 900_000, increment: 10_000 },
  '20+0': { category: 'rapid', base: 1_200_000, increment: 0 },
  '25+5': { category: 'rapid', base: 1_500_000, increment: 5_000 },
  '30+0': { category: 'rapid', base: 1_800_000, increment: 0 },
  '1d': { category: 'daily', base: 86_400_000, increment: 0 },
  '2d': { category: 'daily', base: 172_800_000, increment: 0 },
});
const nowIso = () => new Date().toISOString();
const asText = (value, max = 120) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const defaultDb = () => ({ users: [], friendRequests: [], audit: [], matches: [], rankedQueue: [], announcements: [], announcementReads: {}, userHistory: {}, rateLimits: {}, tokenSecret: '' });

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
// Cloudflare Workers' WebCrypto rejects PBKDF2 above 100,000 iterations (it throws), so this is the maximum.
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
    const parts = String(token || '').split('.');
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
function publicUser(user) {
  if (!user || typeof user !== 'object') return null;
  const ratingsByCategory = ensureRatings(user);
  const avatarId = Number.isInteger(user.avatarId) && user.avatarId >= 0 && user.avatarId < 1000 ? user.avatarId : Math.floor(Math.random() * 1000);
  user.avatarId = avatarId;
  return {
    id: user.id, username: user.username, displayName: user.displayName, avatarId,
    bio: user.bio || '', role: user.role === 'admin' ? 'admin' : 'player',
    elo: Math.round((ratingsByCategory.bullet + ratingsByCategory.blitz + ratingsByCategory.rapid) / 3),
    ratingsByCategory, games: Number(user.games) || 0, wins: Number(user.wins) || 0,
    draws: Number(user.draws) || 0, losses: Number(user.losses) || 0, createdAt: user.createdAt,
    lastSeenAt: user.lastSeenAt || null,
    online: Boolean(user.lastSeenAt && Date.now() - Date.parse(user.lastSeenAt) < 90_000),
    banned: Boolean(user.banned)
  };
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
    clockIncrementMs: Number(match.clockIncrementMs) || 0, clockUpdatedAt: Number(match.clockUpdatedAt) || Date.now()
  } };
}
function joinPayload(db, userId) {
  const active = activeMatchFor(db, userId);
  if (active) return { queued: false, ...makeMatchPayload(db, active, userId) };
  const entry = db.rankedQueue.find(item => item.userId === userId);
  const user = db.users.find(item => item.id === userId);
  return { queued: Boolean(entry), joinedAt: entry?.joinedAt || null, waitMs: entry ? Math.max(0, Date.now() - entry.joinedAt) : 0, rating: Number(entry?.elo) || Number(user?.elo) || 1200 };
}
function resultScores(result) { return result === '1-0' ? [1, 0] : result === '0-1' ? [0, 1] : [0.5, 0.5]; }
function finishMatch(db, match, result, reason = 'game_over', quitterId = '') {
  if (!match || match.status !== 'active') return;
  const white = db.users.find(user => user.id === match.players.w);
  const black = db.users.find(user => user.id === match.players.b);
  if (!white || !black) { match.status = 'aborted'; match.resultReason = 'player_missing'; match.finishedAt = nowIso(); return; }
  const [whiteScore, blackScore] = resultScores(result);
  const category = ['bullet', 'blitz', 'rapid'].includes(match.timeCategory) ? match.timeCategory : 'blitz';
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
function readRouteBody(request) { return request.text().then(raw => { if (!raw) return {}; if (raw.length > 65_536) throw new Error('Nội dung yêu cầu quá lớn.'); try { return JSON.parse(raw); } catch { throw new Error('Dữ liệu JSON không hợp lệ.'); } }); }

function recordsFromDb(db) {
  const records = new Map();
  if (db.tokenSecret) records.set('meta:tokenSecret', db.tokenSecret);
  for (const item of db.users || []) records.set(`user:${item.id}`, JSON.stringify(item));
  for (const item of db.friendRequests || []) records.set(`friend:${item.id}`, JSON.stringify(item));
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
    else if (key.startsWith('audit:')) db.audit.push(value);
    else if (key.startsWith('match:')) db.matches.push(value);
    else if (key.startsWith('queue:')) db.rankedQueue.push(value);
    else if (key.startsWith('announcement:')) db.announcements.push(value);
    else if (key.startsWith('reads:')) db.announcementReads[key.slice('reads:'.length)] = value;
    else if (key.startsWith('history:')) {
      if (!db.userHistory[value.userId]) db.userHistory[value.userId] = [];
      db.userHistory[value.userId].push(value.game);
    } else if (key.startsWith('rate:')) db.rateLimits[decodeURIComponent(key.slice('rate:'.length))] = value;
  }
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
    const raw = await request.text();
    if (!raw) return {};
    if (raw.length > 65_536) throw new Error('Nội dung yêu cầu quá lớn.');
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(error?.message === 'Nội dung yêu cầu quá lớn.' ? error.message : 'Dữ liệu JSON không hợp lệ.');
  }
}
function withCors(response, cors) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(cors)) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
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
      const upstream = await fetch(upstreamUrl, { headers: { Accept: 'application/json', 'User-Agent': 'ViLa-Chess/3.52.0' }, signal: AbortSignal.timeout(20_000) });
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
      const upstream = await fetch(upstreamUrl, { headers: { Accept: 'application/json', 'User-Agent': 'ViLa-Chess/3.52.0 puzzle-proxy' }, signal: AbortSignal.timeout(12_000) });
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
    const origin = request.headers.get('Origin') || '*';
    const cors = { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS' };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (url.pathname === '/' || url.pathname === '/api/health') {
      return json({ ok: true, app: 'Cờ Vua ViLa', version: '3.52.0-cloud', service: 'cloudflare-durable-object', capabilities: ['ranked-online', 'social-accounts', 'persistent-storage', 'lichess-proxy', 'opening-explorer', 'puzzle-proxy'] }, 200, cors);
    }
    if (url.pathname.startsWith('/api/lichess/') || url.pathname === '/api/openings/explorer' || /^\/api\/puzzles\/(next|daily)$/.test(url.pathname)) {
      try { return withCors(await externalApi(request, url), cors); }
      catch (error) { return withCors(fail(String(error?.message || error).slice(0, 250), 500), cors); }
    }
    if (!url.pathname.startsWith('/api/social')) return json({ error: 'Không tìm thấy API.' }, 404, cors);
    const id = env.CHESS_STATE.idFromName('vila-global-community-v1');
    const stub = env.CHESS_STATE.get(id);
    return withCors(await stub.fetch(request), cors);
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
      for (const [key, fallback] of Object.entries({ users: [], friendRequests: [], audit: [], matches: [], rankedQueue: [], announcements: [], announcementReads: {}, userHistory: {}, rateLimits: {} })) {
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
    if (!username || !password) return;
    if (!USERNAME_RE.test(username) || password.length < 14) return;
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
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const path = url.pathname.startsWith('/api/social') ? (url.pathname.slice('/api/social'.length) || '/') : url.pathname;
    if (method === 'GET' && path === '/health') return json({ ok: true, service: 'Cờ Vua ViLa social', status: 'online', storage: 'durable-object', timestamp: nowIso() });
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
      response = await this.route({ method, path, params, query: url.searchParams, body, user, auth, token });
    } catch (error) {
      response = fail(String(error?.message || error || 'Lỗi máy chủ.').slice(0, 300), 500);
    }
    await this.commitDiff(before, recordsFromDb(this.db));
    return response;
  }
  rateLimit(ip, path, method) {
    const now = Date.now();
    const policies = [['all', 300, 60_000]];
    if (method === 'POST' && path === '/auth/register') policies.push(['register', 20, 3_600_000]);
    if (method === 'POST' && path === '/auth/login') policies.push(['login', 40, 900_000]);
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
    return '';
  }
  needUser(user) { return user ? null : fail('Bạn cần đăng nhập lại để tiếp tục.', 401); }
  async route(ctx) {
    const { method, path, params, query, body, user, auth } = ctx;
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
      const choices = [600, 900, 1200, 1600, 2000, 2600];
      const elo = choices.includes(Number(body.initialElo)) ? Number(body.initialElo) : 1200;
      const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
      const hash = await passwordHash(password, salt);
      // Serialized Durable Object handler ensures username uniqueness across concurrent sign-ups.
      const duplicate = this.db.users.some(item => item.username.toLowerCase() === username || (email && String(item.email || '').toLowerCase() === email) || String(item.displayName || '').toLowerCase() === displayName.toLowerCase());
      if (duplicate) return fail('Tên tài khoản, email hoặc biệt danh đã được sử dụng.', 409);
      const user = { id: crypto.randomUUID(), username, displayName, email, avatarId: this.chooseAvatarId(), skillTierElo: elo, ratingsByCategory: { bullet: elo, blitz: elo, rapid: elo, daily: elo }, bio: '', salt, passwordHash: hash, sessionVersion: 0, role: 'player', elo, games: 0, wins: 0, draws: 0, losses: 0, banned: false, createdAt: nowIso(), lastSeenAt: nowIso() };
      this.db.users.push(user); audit(this.db, user.id, 'account_registered', user.id, 'cloud account');
      return json({ token: await signToken(this.db, user), user: publicUser(user) }, 201);
    }
    if (method === 'POST' && path === '/auth/login') {
      const identity = asText(body.username || body.identity, 254).toLowerCase();
      const password = String(body.password || '');
      if (!identity || !password || password.length > 256) return fail('Nhập tên đăng nhập và mật khẩu.');
      const found = this.db.users.find(item => item.username.toLowerCase() === identity || (item.email && item.email.toLowerCase() === identity) || String(item.displayName || '').toLowerCase() === identity);
      const dummySalt = '00112233445566778899aabbccddeeff';
      const candidate = await passwordHash(password, found?.salt || dummySalt);
      if (!found || !constantTimeEqual(candidate, found.passwordHash || '')) { audit(this.db, 'anonymous', 'login_failed', identity, 'invalid credentials'); return fail('Tên đăng nhập/email hoặc mật khẩu không đúng.', 401); }
      if (found.banned) return fail('Tài khoản đã bị khóa. Liên hệ quản trị viên để khiếu nại.', 403);
      found.lastSeenAt = nowIso(); audit(this.db, found.id, 'login_success', found.id, 'password login');
      return json({ token: await signToken(this.db, found), user: publicUser(found) });
    }
    if (method === 'POST' && ['/auth/forgot-password', '/auth/reset-password'].includes(path)) return fail('Máy chủ cloud chưa được cấu hình dịch vụ gửi email khôi phục. Hãy liên hệ quản trị viên.', 503);
    if (method === 'GET' && path === '/auth/me') {
      const required = this.needUser(user); if (required) return required;
      user.lastSeenAt = nowIso();
      const payload = { user: publicUser(user) };
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
      user.displayName = displayName; user.bio = bio; return json({ user: publicUser(user) });
    }
    if (method === 'GET' && path === '/users/search') {
      const required = this.needUser(user); if (required) return required;
      const q = asText(query.get('q'), 30).toLowerCase(); if (q.length < 2) return fail('Nhập ít nhất 2 ký tự để tìm người chơi.');
      return json({ users: this.db.users.filter(item => !item.banned && item.id !== user.id && (item.username.toLowerCase().includes(q) || item.displayName.toLowerCase().includes(q))).slice(0, 20).map(publicUser) });
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
    if (method === 'GET' && path === '/admin/overview') {
      const required = this.needUser(user); if (required) return required;
      if (user.role !== 'admin') return fail('Bạn không có quyền quản trị.', 403);
      return json({ users: this.db.users.length, activeUsers: this.db.users.filter(item => !item.banned && item.lastSeenAt && Date.now() - Date.parse(item.lastSeenAt) < 90_000).length, bannedUsers: this.db.users.filter(item => item.banned).length, admins: this.db.users.filter(item => item.role === 'admin' && !item.banned).length, pendingFriendRequests: this.db.friendRequests.filter(item => item.status === 'pending').length, uptimeSeconds: 0, node: 'Cloudflare Workers', platform: 'cloudflare', arch: 'managed', cpus: 1, loadAverage: [], memory: {}, db: { users: this.db.users.length, friendRequests: this.db.friendRequests.length, auditEvents: this.db.audit.length } });
    }
    if (method === 'GET' && path === '/admin/users') {
      const required = this.needUser(user); if (required) return required;
      if (user.role !== 'admin') return fail('Bạn không có quyền quản trị.', 403);
      const q = asText(query.get('q'), 80).toLowerCase(); const users = this.db.users.filter(item => !q || item.username.toLowerCase().includes(q) || item.displayName.toLowerCase().includes(q) || String(item.email || '').toLowerCase().includes(q)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 200).map(item => ({ ...publicUser(item), email: item.email || '' }));
      return json({ users, total: this.db.users.length });
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
  chooseAvatarId() {
    const used = new Set(this.db.users.filter(item => Number.isInteger(item.avatarId)).map(item => item.avatarId));
    for (let i = 0; i < 1000; i++) { const id = Math.floor(Math.random() * 1000); if (!used.has(id)) return id; }
    return Math.floor(Math.random() * 1000);
  }
  async requireUser(user) { return user ? null : fail('Bạn cần đăng nhập lại để tiếp tục.', 401); }
  async rankedQueue(user, body) {
    const required = await this.requireUser(user); if (required) return required;
    const active = activeMatchFor(this.db, user.id); if (active) return json(joinPayload(this.db, user.id));
    const timeControl = asText(body.timeControl, 16) || '3+2'; const spec = CONTROLS[timeControl];
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
    const match = { id: crypto.randomUUID(), ranked: true, status: 'active', players: { w: whiteId, b: whiteId === user.id ? opponent.id : user.id }, startFen: chess.fen(), fen: chess.fen(), moves: [], result: null, resultReason: '', createdAt: nowIso(), lastMoveAt: nowIso(), eloChanges: {}, timeControl, timeCategory: spec.category, clockEnabled: true, clockRemainingMs: { w: spec.base, b: spec.base }, clockIncrementMs: spec.increment, clockUpdatedAt: now, presence: { [whiteId]: now, [whiteId === user.id ? opponent.id : user.id]: now } };
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
      const presenceExpired = [active.players.w, active.players.b].filter(id => !id || now - Number(active.presence[id] || Date.parse(active.createdAt) || now) > 90_000).sort((a, b) => Number(active.presence[a]) - Number(active.presence[b]));
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
    const from = asText(body.from, 2), to = asText(body.to, 2), promotion = asText(body.promotion, 1).toLowerCase();
    if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to) || (promotion && !/^[qrbn]$/.test(promotion))) return fail('Nước đi không hợp lệ.');
    let move; try { move = chess.move({ from, to, ...(promotion ? { promotion } : {}) }); } catch { move = null; }
    if (!move) return fail('Nước đi không hợp lệ theo luật cờ vua.');
    match.moves.push({ from: move.from, to: move.to, promotion: move.promotion || '', san: move.san, flags: move.flags });
    match.fen = chess.fen(); match.lastMoveAt = nowIso();
    if (match.clockEnabled && match.clockRemainingMs) match.clockRemainingMs[color] = Math.max(0, Number(match.clockRemainingMs[color]) || 0) + Math.max(0, Number(match.clockIncrementMs) || 0);
    match.clockUpdatedAt = Date.now();
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
