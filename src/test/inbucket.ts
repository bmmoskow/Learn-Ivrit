// Reads auth emails back out of the LOCAL Supabase mail catcher so a test can
// recover an emailed one-time code. Used by the sign-up round-trip test
// (signupRoundtrip.roundtriptest.ts), which — unlike the normal integration
// suites — runs with email confirmations ON and therefore receives a real
// 6-digit signup code by email.
//
// Local Supabase has historically shipped TWO different mail catchers on the
// same port (54324): older stacks run Inbucket, newer ones run Mailpit. They
// expose DIFFERENT HTTP APIs, so this helper tries Inbucket's shape first and
// falls back to Mailpit's. Both only ever exist on a local stack — this helper
// is never pointed at a hosted project.

const DEFAULT_MAIL_URL = 'http://127.0.0.1:54324';

/** Base URL of the local mail catcher (override with INBUCKET_URL / MAILPIT_URL). */
function mailBaseUrl(): string {
  return (
    (import.meta.env.INBUCKET_URL as string | undefined) ||
    (import.meta.env.MAILPIT_URL as string | undefined) ||
    DEFAULT_MAIL_URL
  ).replace(/\/$/, '');
}

const SIX_DIGITS = /\b(\d{6})\b/;

function extractCode(...bodies: Array<string | undefined | null>): string | null {
  for (const body of bodies) {
    if (!body) continue;
    const m = body.match(SIX_DIGITS);
    if (m) return m[1];
  }
  return null;
}

// --- Inbucket (older local stacks) -----------------------------------------
// GET /api/v1/mailbox/{name}        → [{ id, from, to, subject, date, ... }]
// GET /api/v1/mailbox/{name}/{id}   → { body: { text, html }, ... }
async function tryInbucket(base: string, mailbox: string): Promise<string | null> {
  const listRes = await fetch(`${base}/api/v1/mailbox/${encodeURIComponent(mailbox)}`);
  if (!listRes.ok) return null;
  const list = (await listRes.json()) as Array<{ id: string; date?: string }>;
  if (!Array.isArray(list) || list.length === 0) return null;
  // Newest message last by date; be defensive if date is missing.
  const sorted = [...list].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  const latest = sorted[sorted.length - 1];
  const msgRes = await fetch(
    `${base}/api/v1/mailbox/${encodeURIComponent(mailbox)}/${encodeURIComponent(latest.id)}`,
  );
  if (!msgRes.ok) return null;
  const msg = (await msgRes.json()) as { body?: { text?: string; html?: string } };
  return extractCode(msg.body?.text, msg.body?.html);
}

// --- Mailpit (newer local stacks) ------------------------------------------
// GET /api/v1/search?query=to:{email}  → { messages: [{ ID }] }
// GET /api/v1/message/{ID}             → { Text, HTML }
async function tryMailpit(base: string, email: string): Promise<string | null> {
  const searchRes = await fetch(`${base}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
  if (!searchRes.ok) return null;
  const search = (await searchRes.json()) as { messages?: Array<{ ID: string }> };
  const id = search.messages?.[0]?.ID;
  if (!id) return null;
  const msgRes = await fetch(`${base}/api/v1/message/${encodeURIComponent(id)}`);
  if (!msgRes.ok) return null;
  const msg = (await msgRes.json()) as { Text?: string; HTML?: string };
  return extractCode(msg.Text, msg.HTML);
}

export interface GetOtpOptions {
  /** How long to keep polling for the message to arrive (ms). */
  timeoutMs?: number;
  /** Delay between polls (ms). */
  intervalMs?: number;
}

/**
 * Poll the local mail catcher for the most recent message sent to `email` and
 * return the 6-digit one-time code found in it. Robust to the message not having
 * been delivered yet (short poll), and to whichever catcher (Inbucket/Mailpit)
 * the local stack happens to run. Throws if no code arrives within the timeout.
 */
export async function getSignupOtp(email: string, options: GetOtpOptions = {}): Promise<string> {
  const { timeoutMs = 15000, intervalMs = 500 } = options;
  const base = mailBaseUrl();
  const mailbox = email.split('@')[0];
  const deadline = Date.now() + timeoutMs;
  let lastErr: unknown;

  while (Date.now() < deadline) {
    try {
      const code = (await tryInbucket(base, mailbox)) ?? (await tryMailpit(base, email));
      if (code) return code;
    } catch (err) {
      // Catcher may not be up yet, or a transient fetch error — keep polling.
      lastErr = err;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(
    `No signup OTP for ${email} within ${timeoutMs}ms at ${base} ` +
      `(tried Inbucket + Mailpit APIs). Is the local stack running with ` +
      `enable_confirmations = true?${lastErr ? ` Last error: ${String(lastErr)}` : ''}`,
  );
}
