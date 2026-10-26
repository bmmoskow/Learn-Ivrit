# Template Roadmap

> **Status: living brainstorm, not commitments.** This captures the cross-cutting
> infrastructure that would turn Learn Ivrit into a reusable **application
> template** — a base from which to spin up a different app by stripping the
> Hebrew-specific parts (Gemini translation, Sefaria, vocabulary/testing). Items
> here are candidates to build *as the need arises*, not a committed backlog.

## Why a template, and the guiding principle

The value of a template is the **app-agnostic infrastructure**, not the features.
The design principle that makes extraction cheap later:

1. **Config-driven everything app-specific** — name, logo, theme/colors, domain,
   copy — in one place, so a new app is re-skinned by editing config, not code.
2. **Optional subsystems behind toggles** — ads, payments, plans, i18n switch on
   per app.
3. **A clean app-specific boundary** — isolate Hebrew/Gemini/Sefaria behind
   interfaces so "strip the Hebrew" is a module removal, not surgery.

If we build the generic subsystems this way *now* (even inside Learn Ivrit),
extracting the template later is deletion + reconfiguration, not a rewrite.

## Current foundation (already in place)

Learn Ivrit already has a strong template base, worth keeping as the generic core:

- **Auth + Row-Level Security** (Supabase), guest mode, auth emails.
- **DB + migrations**, edge functions, **transactional/auth email** (Resend).
- **Full gated CI/CD** (`development → integration → ui → main`), commit-pinned
  production deploy (Cloudflare), DB migration automation, DB security advisors.
- **Test pyramid**: unit + integration (Vitest) and UI + E2E (Playwright), plus a
  local Docker Supabase sandbox.
- **Security scanning** (CodeQL + Trivy + npm audit), security headers / CSP.
- **Backups** to R2, **heartbeat / prod-probe** monitoring.
- **Cost/rate-limit controls** and an **admin dashboard** (spend + revenue est.).

## Roadmap

Each item below is tracked by a GitHub issue labeled `template` (see the table at
the bottom). Items are grouped; order is not priority.

### Monetization & growth

- **Stripe payments & donations** — one-time donations *and* recurring
  subscriptions; webhooks syncing subscription state → DB; customer portal;
  tax/invoicing.
- **Usage plans & entitlements layer** — the glue between payments and features:
  `plan → { features, limits }`, enforced on **both** client and server (edge
  functions + RLS).
- **Ad serving infrastructure** — ad network integration + ad config/targeting
  (builds on the existing `ad_config` + revenue-estimation groundwork).
- **Consent & cookie management** — GDPR/CCPA consent UI + enforcement. A
  prerequisite for ads *and* analytics once either tracks users.

### Platform reach

- **Mobile apps (PWA → Capacitor) + push** — ship first as an installable PWA,
  then wrap the existing React app with Capacitor for iOS/Android (reuse ~all the
  web code); add push notifications (FCM/APNs), deep links, store deploy.
- **Internationalization (i18n) & RTL** — a localization framework so the *next*
  app can be any language from day one (default English, RTL-ready). Ironic while
  removing Hebrew, but central to a reusable template.
- **SEO & SPA prerendering** — meta/OG tags, sitemap, and prerendering/SSG to fix
  the SPA's weak default discoverability.

### Observability & ops

- **Error tracking (Sentry)** — client + edge functions. Current biggest gap.
- **Product analytics & feature flags** — privacy-friendly analytics (events,
  funnels) + feature flags for gradual rollout, A/B, and plan/module gating
  (PostHog covers both).
- **Uptime/alerting & performance** — external uptime + a paging/notify channel;
  Web Vitals / RUM (complements the existing heartbeat/prod-probe).

### Identity & accounts

- **Auth expansion** — social/OAuth providers (Google/Apple/GitHub), magic links,
  **MFA**.
- **Account lifecycle** — data export + account deletion (GDPR/CCPA erasure).
- **RBAC / roles & permissions** — formalize roles (builds on `user_roles`).

### Compliance & trust

- **Compliance baseline** — ToS/privacy acceptance tracking, accessibility (a11y)
  baseline, audit logging.

### Engagement & content

- **Notifications & onboarding** — in-app + email (+ push on mobile); a reusable
  onboarding-flow scaffold.
- **CMS / content pages** — MDX or a light CMS for marketing/help/legal pages.

### Backend & data

- **File & media upload** — generic upload + storage (Supabase Storage).
- **Background jobs / queues / scheduled tasks** — generalize the existing
  pg_cron + scheduled-workflow patterns.
- **Abuse & bot protection** — Cloudflare Turnstile + rate limiting / WAF.

### Template-ization (the part that makes it a template)

- **Config-driven branding & theming** — name, logo, colors, domain, copy in one
  config.
- **Optional-module toggles** — enable/disable ads, payments, plans, i18n per app.
- **App-specific boundary** — extract Hebrew/Gemini/Sefaria behind interfaces so a
  new app drops them cleanly.
- **Project scaffolding & setup docs** — README, `.env.example`, a setup script so
  a new app spins up in minutes.

## Suggested sequencing (opinion, not commitment)

1. **Sentry + analytics + consent** — cheap, high-leverage, and consent is a
   prerequisite for ads.
2. **Entitlements layer** — unlocks both payments and plans.
3. **Config-driven branding + module toggles** — the actual template-ization.
4. **Mobile / i18n** — when a concrete second app needs them.

## Tracking

Each item has a GitHub issue labeled `template`. See the project's issues filtered
by that label; this document is the shared context those issues reference.
