# Deploying to Cloudflare Pages (learn-ivrit.com)

Step-by-step for putting the frontend live on Cloudflare Pages with a custom
domain and Resend email. The Supabase backend (database, auth, edge functions)
is already hosted and is not part of this.

## Overview

- **Host:** Cloudflare Pages (free, commercial use allowed). Builds the Vite app
  and serves `dist/` globally with automatic HTTPS.
- **Deploys:** via Cloudflare's GitHub integration — every push to `main` builds
  and publishes; other branches get preview URLs. No CI deploy job needed (the
  old commented Vercel block in `main.yml` was removed).
- **Routing/headers:** handled by `public/_redirects` (SPA fallback) and
  `public/_headers` (security + cache), which Vite copies into `dist/` at build.

## 1. Cloudflare Pages: connect the repo

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git** → select the `Learn-Ivrit` repo.
2. Build settings:
   - **Framework preset:** Vite
   - **Build command:** `npm run build:prod`
   - **Build output directory:** `dist`
   - **Production branch:** `main`
3. **Environment variables** (Settings → Environment variables), for Production
   (and Preview, if you want branch previews to work against the backend):
   - `VITE_SUPABASE_URL` — Supabase → Settings → API → Project URL
   - `VITE_SUPABASE_ANON_KEY` — Supabase → Settings → API → anon/public key
   > These are baked into the browser bundle at build time. The anon key is
   > public by design; do **not** put the Gemini key or any service-role key here.
4. Save and deploy → the app goes live at `learn-ivrit.pages.dev`.

## 2. Custom domain

1. Register `learn-ivrit.com` (Cloudflare Registrar, at-cost) if not done.
2. Pages project → **Custom domains** → **Set up a domain** → `learn-ivrit.com`
   (and optionally `www`). Since DNS is already at Cloudflare, records are added
   automatically. HTTPS provisions on its own.

## 3. Supabase auth URLs (don't skip — login breaks otherwise)

Supabase dashboard → **Authentication → URL Configuration**:
- **Site URL:** `https://learn-ivrit.com`
- **Redirect URLs:** add `https://learn-ivrit.com/**` (and the
  `*.pages.dev` URL if you test there).

## 4. Resend: send from the domain

Goal: send transactional email (`send-contact-email`, `send-notification-email`)
from a real `@learn-ivrit.com` address. No mailbox is required to send.

1. Resend dashboard → **Domains** → **Add Domain** → `learn-ivrit.com`.
2. Resend shows DNS records (SPF `TXT`, DKIM records, and a DMARC `TXT`).
   Add each one in Cloudflare → **DNS** for `learn-ivrit.com`.
   > For CNAME/DKIM records, set them to **DNS only** (grey cloud), not proxied.
3. Wait for Resend to show the domain **Verified**.
4. Sender addresses are set in `supabase/functions/_shared/resend.ts`:
   - `no-reply@learn-ivrit.com` — automated alerts/notifications (`RESEND_FROM_ALERTS`)
   - `contact@learn-ivrit.com` — contact-form / support (`RESEND_FROM_DEFAULT`)
   These take effect once the domain is verified in Resend **and** the edge
   functions are redeployed (functions must be deployed manually).

### Auth / 2-factor email (separate from the edge functions)

Supabase Auth sends its own email (magic links, 2-factor, confirmations) via
**its own SMTP settings**, not these Resend edge functions. To send those from
`no-reply@learn-ivrit.com`, configure Supabase → **Authentication → Emails /
SMTP**: point custom SMTP at Resend (host `smtp.resend.com`, your Resend API key
as the password) and set the sender to `no-reply@learn-ivrit.com`.

## 5. (Optional) Receive email — free forwarding

To catch replies or have an inbox address without paying:
- Cloudflare dashboard → **Email → Email Routing** → enable, then add a route
  (e.g. `hello@learn-ivrit.com` → your personal Gmail). Cloudflare adds the MX
  records automatically; these don't conflict with Resend's sending records.

## Notes

- Nothing here locks you in: the domain is transferable (after ICANN's 60-day
  new-registration lock), and the static build is portable to any host.
- Cloudflare Pages' Hobby/free tier permits commercial use, unlike Vercel's.
