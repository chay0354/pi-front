#!/usr/bin/env node
/**
 * Simulates Android emulator B2B registration against the same API as the app.
 * Flow: stage-1 payload (JSON, no files) → set-password → verify-skip-test → login.
 *
 * Usage (from pi-front):
 *   node scripts/simulate-emulator-broker-registration.mjs
 *   node scripts/simulate-emulator-broker-registration.mjs --type professional
 *   API_URL=https://pi-back.vercel.app node scripts/simulate-emulator-broker-registration.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function loadEnvFile() {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] == null || process.env[key] === '') {
      process.env[key] = val;
    }
  }
}

loadEnvFile();

const args = process.argv.slice(2);
const typeArg = args.find(a => a.startsWith('--type='))?.split('=')[1]
  || (args.includes('--type') ? args[args.indexOf('--type') + 1] : null)
  || 'broker';

const API_BASE = String(process.env.API_URL || process.env.EXPO_PUBLIC_API_URL || '')
  .trim()
  .replace(/\/+$/, '');

const PASSWORD = 'TestPass123!';
const MIN_PASSWORD_LENGTH = 8;

if (!API_BASE) {
  console.error('Missing API_URL / EXPO_PUBLIC_API_URL in pi-front/.env');
  process.exit(1);
}

const stamp = Date.now();
const testEmail = `emu-sim-${stamp}@pi-test.local`;

function log(step, msg, ok = null) {
  const icon = ok === true ? '✓' : ok === false ? '✗' : '·';
  const color = ok === true ? '\x1b[32m' : ok === false ? '\x1b[31m' : '\x1b[36m';
  console.log(`${color}${icon}\x1b[0m [${step}] ${msg}`);
}

async function apiJson(method, path, body) {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = {
    Accept: 'application/json',
    ...(body != null
      ? {'Content-Type': 'application/json; charset=utf-8'}
      : {}),
  };
  const init = { method, headers, signal: AbortSignal.timeout(120000) };
  if (body != null) {
    init.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(url, init);
  } catch (err) {
    const e = new Error(
      `[apiFetch] ${method} ${url} failed: ${err.message}. API base: ${API_BASE}`,
    );
    e.cause = err;
    throw e;
  }
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { _raw: text.slice(0, 200) };
  }
  return { ok: res.ok, status: res.status, data, url };
}

/** Same shape as SubscriptionFormScreen + prepareSubscriptionSubmitPayload (Android+Vercel: no files). */
function buildBrokerFormData() {
  return {
    subscriptionType: 'broker',
    name: 'סוכן בדיקה',
    agentName: 'סוכן בדיקה',
    brokerageLicenseNumber: `LIC-${stamp}`,
    brokerOfficeName: 'משרד בדיקה אמולטור',
    dealerNumber: '',
    phone: '0501234567',
    email: testEmail,
    description: 'simulate-emulator-broker-registration.mjs',
    activityRegions: ['מרכז'],
    agreedToTerms: true,
    deferVerificationEmail: true,
  };
}

function buildProfessionalFormData() {
  return {
    subscriptionType: 'professional',
    name: 'עסק בדיקה',
    businessName: 'עסק בדיקה',
    businessAddress: 'רחוב בדיקה 1',
    phone: '0501234568',
    email: testEmail,
    description: 'emu sim',
    types: ['יועץ'],
    specializations: ['מכירות'],
    agreedToTerms: true,
    deferVerificationEmail: true,
  };
}

function toSubscriptionSubmitJsonBody(formData) {
  const payload = {};
  for (const [k, v] of Object.entries(formData)) {
    if (v !== undefined) payload[k] = v;
  }
  const body = JSON.stringify(payload);
  if (!body.startsWith('{')) throw new Error('Invalid JSON serialization');
  return body;
}

async function postSubscriptionSubmitJson(formData) {
  const url = `${API_BASE}/api/subscription/submit`;
  const body = toSubscriptionSubmitJsonBody(formData);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
    },
    body,
    signal: AbortSignal.timeout(120000),
  });
  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Submit response not JSON (HTTP ${res.status}): ${text.slice(0, 120)}`);
  }
  if (!res.ok) {
    throw new Error(data.error || `Submit HTTP ${res.status}`);
  }
  return data;
}

async function main() {
  console.log('');
  console.log('=== Emulator registration simulation (HTTP, same as pi-front/utils/api.js) ===');
  console.log(`API: ${API_BASE}`);
  console.log(`Type: ${typeArg}`);
  console.log(`Email: ${testEmail}`);
  console.log('');

  let failed = false;

  // 0) Smoke GET (like feed/listings from app)
  try {
    const smoke = await apiJson(
      'GET',
      '/api/listings?status=published&limit=1',
    );
    log(
      '0-smoke',
      `GET /api/listings → HTTP ${smoke.status} success=${smoke.data?.success ?? 'n/a'}`,
      smoke.ok,
    );
    if (!smoke.ok) failed = true;
  } catch (e) {
    log('0-smoke', e.message, false);
    failed = true;
  }

  const formData =
    typeArg === 'professional'
      ? buildProfessionalFormData()
      : buildBrokerFormData();

  // 1) Submit (JSON path — Android emulator + Vercel)
  let subscriptionId;
  try {
    log('1-submit', 'POST /api/subscription/submit (application/json, no files)…');
    const sub = await postSubscriptionSubmitJson(formData);
    subscriptionId = sub.subscriptionId;
    globalThis.__lastSubmitVerificationCode = sub.verificationCode || null;
    log(
      '1-submit',
      `subscriptionId=${subscriptionId} deferredEmail=${sub.verificationEmailDeferred}` +
        (sub.verificationCode ? ` code=${sub.verificationCode}` : ''),
      Boolean(subscriptionId),
    );
    if (!subscriptionId) failed = true;
  } catch (e) {
    log('1-submit', e.message, false);
    failed = true;
    console.log('\nResult: FAIL (cannot continue without submit)\n');
    process.exit(1);
  }

  // 2) Set password (שלח קוד אימות path)
  try {
    const pwd = await apiJson('POST', '/api/subscription/set-password', {
      subscriptionId,
      password: PASSWORD,
    });
    log('2-password', `set-password → HTTP ${pwd.status}`, pwd.ok);
    if (!pwd.ok) {
      log('2-password', pwd.data?.error || JSON.stringify(pwd.data), false);
      failed = true;
    }
  } catch (e) {
    log('2-password', e.message, false);
    failed = true;
  }

  // 3) Verify — skip-test (dev) or code from submit response (prod returns code in API)
  let subscriberNumber;
  let verified = false;
  let verificationCode = null;

  try {
    const skip = await apiJson('POST', '/api/subscription/verify-skip-test', {
      subscriptionId,
      email: testEmail,
      password: PASSWORD,
    });
    subscriberNumber = skip.data?.subscriberNumber;
    verified = skip.data?.subscription?.status === 'verified';
    if (skip.ok && verified) {
      log(
        '3-verify',
        `verify-skip-test → HTTP ${skip.status} subscriber=${subscriberNumber}`,
        true,
      );
    } else {
      log(
        '3-verify',
        `skip-test HTTP ${skip.status} (expected on Vercel) — using code from submit`,
        null,
      );
    }
  } catch (e) {
    log('3-verify', `skip-test: ${e.message}`, null);
  }

  if (!verified) {
    verificationCode = globalThis.__lastSubmitVerificationCode;
    if (!verificationCode) {
      log(
        '3-verify',
        'No verification code (set ALLOW_SKIP on Vercel or use submit response)',
        false,
      );
      failed = true;
    } else {
      try {
        const verify = await apiJson('POST', '/api/subscription/verify', {
          email: testEmail,
          subscriptionId,
          verificationCode: String(verificationCode),
          password: PASSWORD,
        });
        subscriberNumber = verify.data?.subscriberNumber;
        verified = verify.data?.subscription?.status === 'verified';
        log(
          '3-verify',
          `verify (code) → HTTP ${verify.status} subscriber=${subscriberNumber || '—'}`,
          verify.ok && verified,
        );
        if (!verify.ok) {
          log('3-verify', verify.data?.error || '', false);
          failed = true;
        }
      } catch (e) {
        log('3-verify', e.message, false);
        failed = true;
      }
    }
  }

  // 4) Promo (optional — needs migration + deploy on Vercel)
  if (verified) {
    try {
      const promo = await apiJson('POST', '/api/subscription/apply-promo-code', {
        subscriptionId,
        code: 'PIPLUS20',
      });
      const quota = promo.data?.maxPublishedListings;
      if (!promo.ok) {
        log(
          '4-promo',
          `optional: ${promo.data?.error || `HTTP ${promo.status}`} (deploy apply-promo-code + migration)`,
          null,
        );
      } else {
        log('4-promo', `PIPLUS20 → quota ${quota}`, true);
      }
    } catch (e) {
      log('4-promo', `skipped: ${e.message}`, null);
    }
  }

  // 5) Login (open app as user) — only after verified
  if (verified) {
    try {
      const login = await apiJson('POST', '/api/auth/login', {
        email: testEmail,
        password: PASSWORD,
      });
      const hasUser = Boolean(login.data?.subscription?.id || login.data?.user);
      log(
        '5-login',
        `login → HTTP ${login.status} hasSubscription=${hasUser}`,
        login.ok && hasUser,
      );
      if (!login.ok) {
        log('5-login', login.data?.error || '', false);
        failed = true;
      }
    } catch (e) {
      log('5-login', e.message, false);
      failed = true;
    }
  } else {
    log('5-login', 'skipped (not verified)', null);
  }

  console.log('');
  const coreOk = !failed;
  if (!coreOk) {
    console.log('\x1b[31mResult: FAIL\x1b[0m — fix failing step(s) above, redeploy pi-back if needed.\n');
    process.exit(1);
  }
  console.log('\x1b[32mResult: PASS\x1b[0m — emulator can use the same API flow; registration HTTP works.\n');
  console.log(`Test account: ${testEmail} / ${PASSWORD}`);
  if (subscriberNumber) console.log(`Subscriber number: ${subscriberNumber}`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
