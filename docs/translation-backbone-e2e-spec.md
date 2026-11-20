# Translation Backbone — e2e spec (step 1)

Companion to `translation-panel-test-plan.md`. This specifies the **first**
deliverable: an e2e spec for the shared trunk (extracted text → translate → word
definition popup → Vocabulary), entered via the cheapest deterministic feeder
(**Paste/Type**), with **Gemini stubbed at the client** so the test is free and
deterministic.

## Goal

Prove the wiring every feeder shares, in **both modes**:
- **Guest** (runnable now): translation renders for a guest (regression guard),
  the word-definition popup opens, the Vocabulary panel is reachable and shows the
  example list, and there is no personal-save path.
- **Authenticated** (left as `test.fixme`): the same trunk plus **save word →
  navigate to Vocabulary → word is present**. Needs the `playwright/.auth/user.json`
  fixture (seeded user + storageState), which does not exist yet.

Non-goals: asserting Gemini's actual output (nondeterministic — never do this),
cache behavior (separate integration tier — stubbing the edge fn bypasses it), and
the other five feeders.

## File

`tests/e2e/translation-backbone.spec.ts` (real-backend e2e project). Model the
structure on `tests/e2e/flashcard-review.spec.ts` and `tests/e2e/test-panel.spec.ts`
(guest `describe` runnable; authed `describe` with `test.use({ storageState: … })`
and `test.fixme`).

## Stubbing Gemini at the client (the crux)

The e2e project uses the **real** backend (no mock-backend fixture), so stub only
the paid third party with `page.route` inside the spec:

- Intercept the translate call: `**/functions/v1/gemini-translate*`.
- The client posts a body that distinguishes **translate** vs **define** (and
  possibly OCR/URL) — inspect `route.request().postData()` and branch, returning a
  canned payload for each. **Derive the exact request discriminator and response
  shapes from the code** — do not guess:
  - Request shape + routing: `supabase/functions/gemini-translate/index.ts`.
  - Translate response shape the client consumes: `translate.ts` +
    `src/components/TranslationPanel/useTranslationPanel.ts` (what it reads off the
    response, e.g. translated text / aligned tokens).
  - Define response shape: `define.ts` +
    `src/components/TranslationPanel/WordDefinitionPopup/useWordDefinitionPopup.ts`.
    Note the popup **reads `word_definitions` client-side first** and only calls the
    edge fn on a miss — so for a clean popup assertion, either ensure the client
    read misses (so the stubbed edge call fires) or seed the definition; pick one
    and be explicit.
- Use a **fixed Hebrew input** string and a **canned** translation/definition so
  assertions are deterministic. Choose an input whose canned translation yields at
  least one clearly clickable word for the popup step.

## Guest flow (runnable) — assertions

1. Set guest mode (`localStorage.guestMode = 'true'` via `addInitScript`, as in
   the other guest specs). Navigate, open the **Translate** panel (nav button
   "Translate").
2. Enter the fixed Hebrew via the **Paste or Type** entry (open `InputLauncher` →
   "Paste or Type" → `TextInputDialog`; read those components for the exact
   control labels/placeholders).
3. **Regression guard (guest-translate):** assert the stubbed
   `**/functions/v1/gemini-translate*` route **was called** AND the translated text
   **rendered** in the synced display. Both, so "guest silently doesn't translate"
   fails loudly.
4. Click a rendered Hebrew word → assert the **WordDefinitionPopup**
   opens and shows the (stubbed/seeded) definition.
5. Navigate to **Vocabulary** (nav "Vocabulary") → assert the **example list**
   renders and that **no personal save-to-vocabulary affordance** is available to
   the guest (guests can't add words).

## Authenticated flow (`test.fixme`) — intended assertions

Mark `test.fixme` with a comment that it needs `playwright/.auth/user.json`.
Intended flow once the fixture exists:
1. Authed session via `test.use({ storageState: 'playwright/.auth/user.json' })`.
2. Same paste → stubbed translate → synced display renders.
3. Click a word → popup → **save the word** (the authed-only affordance).
4. Navigate to **Vocabulary** → assert the **saved word is present** (the
   cross-panel loop). This write goes to the **real** Supabase vocabulary table, so
   it genuinely needs a real authed session — a faked localStorage JWT will not pass
   RLS. That is why it can't run until the fixture exists.

The deterministic authed trunk+save loop (without the real fixture) is covered at
the **mocked-UI tier** instead — out of scope for this spec, tracked in the plan.

## What is real vs stubbed (guest path)

- **Stubbed:** `**/functions/v1/gemini-translate*` (translate + define).
- **Real / untouched:** everything else — but the guest path performs no Supabase
  writes and the sefaria cache is skipped for guests, so the guest spec needs no
  sandbox. (It ran clean on a Dockerless box for the earlier guest e2e specs.)

## Validation

- `npm run typecheck` and `npm run lint` must pass.
- `npx playwright test --project=e2e tests/e2e/translation-backbone.spec.ts` —
  guest tests pass; authed is a skipped `fixme`.

## Acceptance criteria

- One new file `tests/e2e/translation-backbone.spec.ts`.
- Guest describe passes locally (real build, stubbed Gemini); includes the named
  guest-translate regression test and the Vocabulary-access assertion.
- Authed describe present as `test.fixme` referencing the storageState fixture.
- No real Gemini calls; no asserting Gemini output content.
- Selectors taken from the actual components (read them), not guessed.
