# TranslationPanel — Test Plan (integration / UI / e2e)

Status: plan (brainstorm, not a commitment). Scope: the higher-tier tests
(real-backend `*.integrationtest.tsx`, Playwright `tests/ui` mocked, Playwright
`tests/e2e` real) for the TranslationPanel. Unit coverage (`*.unittest.tsx`)
already exists per sub-feature and is out of scope here.

## 1. Architecture the tests have to respect

The TranslationPanel is **one shared trunk fed by six entry points.** Every
entry point's only job is to put **extracted Hebrew text** into the panel; from
there the path is identical.

```
        feeders (6 entry points in InputLauncher)        shared trunk
  ┌───────────────────────────────────────────────┐  ┌────────────────────────────┐
  Paste/Type · Upload Image (OCR) · Load from URL ·  → extracted Hebrew text
  Load from Bible · Generate with AI · Load Bookmark  → translate / synced display
                                                      → click word → definition popup
                                                      → (authed) save word → Vocabulary
```

Consequence: **test the trunk once**; each feeder becomes a thin "did it hand off
the expected extracted text?" check. We do not re-run translate+define for all
six feeders.

Feeder dependencies (determines how each is stubbed and which tier it belongs in):

| Feeder | Entry title | Depends on | Notes |
|---|---|---|---|
| Paste/Type | "Paste or Type" | none (text is given) | cheapest, deterministic entry — used for the backbone |
| Image OCR | "Upload Image" | Gemini vision (edge fn `ocr.ts`) | no dedicated folder; handled in `useTranslationPanel` |
| URL | "Load from URL" | edge fn `extract-url.ts` + `sefaria_cache` | cache lookup is authed-only |
| Bible | "Load from Bible" | Sefaria API (`sefaria-fetch`) + `sefaria_cache` | read-only, free upstream |
| Generate | "Generate with AI" | Gemini (`generate-hebrew-passage`) | nondeterministic |
| Bookmark | "Load Bookmark" | Supabase (bookmarks) | **hidden for guests** |

## 2. Two orthogonal axes layered on the trunk

### Axis A — mode (guest vs authenticated)
Run the backbone in **both** modes. The only divergences:
- Guests **cannot save words** to a vocabulary list (authed-only).
- "Load Bookmark" feeder is **hidden** for guests.
- The `sefaria_cache` lookup (URL/Bible) is **skipped** for guests
  (`if (!isGuest && user …)` in `useTranslationPanel.ts`).

Everything upstream of the save step is identical. Two named guardrails:
- **Guest-translate regression:** there was a past bug where guest mode did not
  translate at all. The guest run must assert *both* that the translate endpoint
  was called *and* that a translation rendered — so this can't silently regress.
- **Vocabulary-list access is part of e2e:** the authed run closes the loop by
  navigating to the Vocabulary panel and asserting the saved word is present; the
  guest run asserts the example list shows and no personal-save path exists.

### Axis B — cache (hit vs miss)
This axis is **not** a variation of the stubbed backbone e2e, because the
translation cache lives server-side. See §3.

## 3. Where the caches live (this dictates the tiers)

| Cache | Read location | Write location | How to test a hit without Gemini |
|---|---|---|---|
| `translation_cache` (main translate) | **edge function** `translate.ts` | edge function `translate.ts` | integration vs the **real** edge fn; seed the row |
| `word_definitions` (popup) | **client** `useWordDefinitionPopup.ts` | edge function `define.ts` (upsert) | mocked-UI; seed the row, assert **no** edge call |
| `sefaria_cache` (URL/Bible) | **client** `useTranslationPanel.ts` (authed-only) | client | integration/e2e, authed |

Key implication: **you cannot test the translation cache while stubbing the edge
function** — stubbing bypasses the cache. So cache behavior is an integration-tier
concern against the real edge function, separate from the deterministic backbone.

Cache **population** (write path) is best proven by a **round-trip**: translate X
(miss → writes), translate X again (hit). Assert the *second* call is served from
cache (`api_usage_logs.cache_hit = true`, zero Gemini tokens, result #2 == result
#1). This never asserts Gemini's actual output — only that call #2 reproduced call
#1 via the cache. The first call makes **one real Gemini call** (acceptable: the
cost concern is production scale, not CI), but the external dependency makes the
suite flaky, so keep the round-trip **non-blocking**.

## 4. The tiers

| Tier | Test | Gemini | Determinism / gating |
|---|---|---|---|
| **Backbone e2e** (guest + authed) | trunk wiring, guest-translate regression, → Vocabulary loop | **stubbed at client** (`page.route`) | deterministic, blocking. Authed save→vocab needs the auth storageState fixture → `test.fixme` until it exists |
| Integration: translation cache-**hit** | seed `translation_cache`, real edge fn, assert `cache_hit` | none | deterministic, blocking |
| Integration: cache **populate** (round-trip) | translate X ×2, assert #2 is a hit | 1 real call | assertions deterministic, suite flaky → **non-blocking** |
| UI (mocked): popup cache-hit | seed `word_definitions`, assert no edge call | none | deterministic |
| UI (mocked): authed trunk + save → (mocked) vocab | the authed loop the e2e can't do until the fixture exists | stubbed | deterministic |
| Feeders ×5 (Image/URL/Bible/Generate/Bookmark) | handoff: entry produces extracted text | each stubbed | deterministic |
| **Last:** English→Hebrew paste | direction variant of paste feeder | stubbed | deterministic (changes trunk assumptions, so deferred) |

## 5. Build order

1. **Backbone e2e** (guest runnable + authed fixme) — highest value, deterministic. See `translation-backbone-e2e-spec.md`.
2. **Translation cache-hit** integration test (seed + real edge fn).
3. **Cache populate** round-trip (non-blocking) + **popup cache-hit** mocked-UI test.
4. **Feeders** as thin handoff tests (+ `sefaria_cache` authed case).
5. **English→Hebrew** paste direction — last.

## 6. Open questions / non-blocking notes

- **Cache-pattern inconsistency:** the main translation cache is fully server-side
  (read+write in the edge fn) while the popup cache reads client-side and writes
  server-side. This is a design inconsistency, not a bug, and testable either way;
  if ever unified, unify *toward* the server (the enforceable Gemini-cost
  chokepoint), treating any client read as an optional fast-path. **Do not block
  the test work on this.**
- The authed e2e paths depend on the missing `playwright/.auth/user.json` fixture
  (seeded user + programmatic login + saved storageState). Standing that up is a
  prerequisite for un-`fixme`-ing the authed e2e loop; until then the authed loop
  is covered at the mocked-UI tier.
