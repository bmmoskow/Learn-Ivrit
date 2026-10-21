// Masks secret-looking values in a line of Supabase CLI output. Pure and
// side-effect-free so it can be unit-tested and reused. Each match becomes an
// equal-length run of '•' so the CLI's boxed/aligned tables stay aligned.
//
// The publishable key (sb_publishable_) is intentionally NOT masked — it's the
// anon-equivalent public key, not a secret.

export const SECRET_PATTERNS = [
  /sb_secret_[A-Za-z0-9_-]+/g, // Secret key (new format)
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, // legacy service_role / anon JWTs
  /\b[0-9a-f]{32,}\b/g, // S3 access key (32 hex) / secret key (64 hex)
];

export function redactLine(line) {
  let out = line;
  for (const re of SECRET_PATTERNS) out = out.replace(re, (m) => '•'.repeat(m.length));
  return out;
}
