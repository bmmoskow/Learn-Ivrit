// Reads auth emails back out of the LOCAL Supabase mail catcher so the UI
// round-trip can recover the emailed 6-digit sign-up code. This is a Playwright
// (Node) twin of src/test/inbucket.ts — that one uses import.meta.env (Vite) and
// so can't be imported from a Playwright spec; this one reads overrides from
// process.env instead. Same two-catcher logic: local Supabase has shipped
// Inbucket (older) and Mailpit (newer, v3) on the same port 54324 with DIFFERENT
// HTTP APIs, so try Inbucket's shape first, then Mailpit's. Local-only — never
// pointed at a hosted project.

const DEFAULT_MAIL_URL = 'http://127.0.0.1:54324';

function mailBaseUrl(): string {
  return (process.env.MAILPIT_URL || process.env.INBUCKET_URL || DEFAULT_MAIL_URL).replace(/\/$/, '');
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

// Inbucket (older): GET /api/v1/mailbox/{name} -> [{id,date}]; .../{id} -> {body:{text,html}}
async function tryInbucket(base: string, mailbox: string): Promise<string | null> {
  const listRes = await fetch(`${base}/api/v1/mailbox/${encodeURIComponent(mailbox)}`);
  if (!listRes.ok) return null;
  const list = (await listRes.json()) as Array<{ id: string; date?: string }>;
  if (!Array.isArray(list) || list.length === 0) return null;
  const sorted = [...list].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  const latest = sorted[sorted.length - 1];
  const msgRes = await fetch(
    `${base}/api/v1/mailbox/${encodeURIComponent(mailbox)}/${encodeURIComponent(latest.id)}`,
  );
  if (!msgRes.ok) return null;
  const msg = (await msgRes.json()) as { body?: { text?: string; html?: string } };
  return extractCode(msg.body?.text, msg.body?.html);
}

// Mailpit (newer): GET /api/v1/search?query=to:{email} -> {messages:[{ID}]}; .../message/{ID} -> {Text,HTML}
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
  timeoutMs?: number;
  intervalMs?: number;
}

/** Poll the local mail catcher for the 6-digit sign-up code sent to `email`. */
export async function getSignupOtp(email: string, options: GetOtpOptions = {}): Promise<string> {
  const { timeoutMs = 20000, intervalMs = 500 } = options;
  const base = mailBaseUrl();
  const mailbox = email.split('@')[0];
  const deadline = Date.now() + timeoutMs;
  let lastErr: unknown;

  while (Date.now() < deadline) {
    try {
      const code = (await tryInbucket(base, mailbox)) ?? (await tryMailpit(base, email));
      if (code) return code;
    } catch (err) {
      lastErr = err;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(
    `No signup OTP for ${email} within ${timeoutMs}ms at ${base} (tried Inbucket + Mailpit). ` +
      `Is the local stack running with enable_confirmations = true?${lastErr ? ` Last error: ${String(lastErr)}` : ''}`,
  );
}
