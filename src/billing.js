/**
 * Google Play Billing verification for the Worker (one-time products, "plan A"):
 *   - Pro      : consumable one-time product, each purchase adds 365 days (stacks, see src/plans.js)
 *   - Premium  : non-consumable one-time product, lifetime
 *
 * The app never decides who is paid. The client sends a purchase token; this module asks Google (Play Developer API,
 * authenticated with a service account) whether the token is a real, completed purchase of our product, then the
 * Worker grants the plan once per token. Everything here takes an injectable `fetchImpl` so it is unit-testable.
 */
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';
export const DEFAULT_PACKAGE = 'com.aistudio.covuavila.vzrk';
export const DEFAULT_PRODUCTS = Object.freeze({ pro: 'vila_pro_1y', premium: 'vila_premium_lifetime' });

const enc = new TextEncoder();
function b64url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function pemToDer(pem) {
  const body = String(pem).replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '');
  return Uint8Array.from(atob(body), char => char.charCodeAt(0));
}
export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(String(text)));
  return [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join('');
}

export function billingProducts(env = {}) {
  return { pro: String(env.PRO_PRODUCT_ID || DEFAULT_PRODUCTS.pro), premium: String(env.PREMIUM_PRODUCT_ID || DEFAULT_PRODUCTS.premium) };
}
export function packageName(env = {}) { return String(env.PLAY_PACKAGE_NAME || DEFAULT_PACKAGE); }
export function planForProduct(env, productId) {
  const products = billingProducts(env);
  if (productId === products.pro) return 'pro';
  if (productId === products.premium) return 'premium';
  return '';
}
export function billingConfigured(env = {}) {
  try { const account = JSON.parse(String(env.GOOGLE_SERVICE_ACCOUNT_JSON || '')); return Boolean(account.client_email && account.private_key); } catch { return false; }
}
/** The id we give Google when the purchase starts (obfuscatedAccountId). It binds a token to one ViLa account. */
export function accountBindingId(userId) { return sha256Hex(`vila-billing:${userId}`).then(hex => hex.slice(0, 32)); }

export class BillingError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}

export async function googleAccessToken(env, fetchImpl = fetch, nowMs = Date.now()) {
  let account;
  try { account = JSON.parse(String(env.GOOGLE_SERVICE_ACCOUNT_JSON || '')); } catch { account = null; }
  if (!account?.client_email || !account?.private_key) throw new BillingError('Máy chủ chưa cấu hình tài khoản dịch vụ Google Play.', 503);
  const tokenUri = account.token_uri || 'https://oauth2.googleapis.com/token';
  const iat = Math.floor(nowMs / 1000);
  const header = b64url(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claims = b64url(enc.encode(JSON.stringify({ iss: account.client_email, scope: SCOPE, aud: tokenUri, iat, exp: iat + 3000 })));
  const key = await crypto.subtle.importKey('pkcs8', pemToDer(account.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(`${header}.${claims}`)));
  const assertion = `${header}.${claims}.${b64url(signature)}`;
  const response = await fetchImpl(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }).toString()
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw new BillingError('Không lấy được quyền truy cập Google Play.', 502);
  return data.access_token;
}

async function playCall(env, fetchImpl, accessToken, path, init = {}) {
  const response = await fetchImpl(`${API}/${encodeURIComponent(packageName(env))}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...(init.headers || {}) }
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
  return { ok: response.ok, status: response.status, data };
}

/**
 * Ask Google about a one-time purchase token.
 * Returns { state: 'purchased'|'pending'|'canceled', orderId, acknowledged, consumed, accountId, purchaseTimeMillis }.
 * Throws BillingError(404) when Google does not know the token (forged / wrong product / wrong app).
 */
export async function lookupPurchase(env, { productId, purchaseToken }, fetchImpl = fetch, accessToken) {
  const token = accessToken || await googleAccessToken(env, fetchImpl);
  const result = await playCall(env, fetchImpl, token, `purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`);
  if (result.status === 400 || result.status === 404 || result.status === 410) throw new BillingError('Google Play không xác nhận giao dịch này.', 404);
  if (!result.ok) throw new BillingError('Không kiểm tra được giao dịch với Google Play. Hãy thử lại sau.', 502);
  const data = result.data;
  const state = data.purchaseState === 0 ? 'purchased' : data.purchaseState === 2 ? 'pending' : 'canceled';
  return {
    state,
    orderId: String(data.orderId || ''),
    acknowledged: data.acknowledgementState === 1,
    consumed: data.consumptionState === 1,
    accountId: String(data.obfuscatedExternalAccountId || ''),
    purchaseTimeMillis: Number(data.purchaseTimeMillis) || 0,
    accessToken: token
  };
}

/** Acknowledge server-side so a grant is never lost if the app dies before it can (Google refunds un-acked purchases after 3 days). */
export async function acknowledgePurchase(env, { productId, purchaseToken }, fetchImpl = fetch, accessToken) {
  const token = accessToken || await googleAccessToken(env, fetchImpl);
  const result = await playCall(env, fetchImpl, token, `purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`, { method: 'POST', body: '{}' });
  return result.ok;
}

/** Purchases Google reports as refunded / charged back / cancelled since `sinceMs`. */
export async function listVoidedPurchases(env, sinceMs, fetchImpl = fetch) {
  const accessToken = await googleAccessToken(env, fetchImpl);
  const voided = [];
  let pageToken = '';
  for (let page = 0; page < 10; page++) {
    const query = new URLSearchParams({ type: '0', startTime: String(Math.max(0, Math.floor(sinceMs))), maxResults: '200', ...(pageToken ? { token: pageToken } : {}) });
    const result = await playCall(env, fetchImpl, accessToken, `purchases/voidedpurchases?${query.toString()}`);
    if (!result.ok) throw new BillingError('Không đọc được danh sách hoàn tiền từ Google Play.', 502);
    for (const item of result.data.voidedPurchases || []) {
      if (item.purchaseToken) voided.push({ purchaseToken: String(item.purchaseToken), orderId: String(item.orderId || ''), voidedTimeMillis: Number(item.voidedTimeMillis) || 0 });
    }
    pageToken = result.data.tokenPagination?.nextPageToken || '';
    if (!pageToken) break;
  }
  return voided;
}
