# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run deploy:dev        # Start dev server with hot reload
npm run build:prod        # TypeScript check + minified production build
npm run build:dev         # Development build (no type check, no minify)
npm run typecheck         # TypeScript type check only (no emit)
npm run lint              # ESLint

# Testing
npm run test              # All tests (unit + integration + UI)
npm run test:unit         # Unit tests only
npm run test:watch        # Watch mode (all tests)

# Run a single test file
npx vitest run src/components/TestPanel/MultipleChoiceTest/useMultipleChoiceTest.unittest.tsx

# Database types
npm run generate-types    # Regenerate TypeScript types from Supabase schema
```

Test files are named `*.unittest.ts(x)`. The unit config (`vitest.unit.config.ts`) excludes integration tests; the base `vitest.config.ts` runs everything.

## Branch / CI Pipeline

Changes flow through four protected branches before reaching production:

```
development → integration → ui → main (production)
```

Each promotion is triggered automatically by GitHub Actions after the previous stage's checks pass (`base-checks.yml` → unit → integration → ui checks → security audit). Do not push directly to `integration`, `ui`, or `main`; work on `development` or feature branches off it.

## Architecture

**Learn Ivrit** is a Hebrew language learning app. Users paste/photograph/URL-extract/look-up Hebrew text, get AI-powered translations and word definitions, save vocabulary, and take adaptive tests.

### Data flow

```
AuthContext (Supabase auth or guest mode)
  → TranslationPanel (input methods: text paste, image OCR, URL, Bible, AI generation)
    → WordDefinitionPopup (click any word for definition)
      → VocabularyList (saved words with bookmarks)
        → TestPanel (adaptive tests: MultipleChoiceTest, FillInBlankTest, FlashcardTest)
          → Dashboard (Recharts progress graphs)
```

### Feature folder convention

Each major feature owns its folder and follows this split:

| File | Role |
|---|---|
| `ComponentName.tsx` | Container — wires logic to UI |
| `ComponentNameUI.tsx` | Presentational — pure render, no side effects |
| `useComponentName.ts` | Custom hook — all business logic |
| `componentNameUtils.ts` | Pure utility functions |
| `*.unittest.ts(x)` | Vitest + React Testing Library tests |

### Key directories

- `src/components/` — All feature components (TranslationPanel, VocabularyList, TestPanel, Dashboard, Admin, Settings)
- `src/context/` — React contexts (AuthContext is the most important)
- `src/hooks/` — Shared hooks
- `src/utils/` — Shared pure utilities
- `src/config/app.ts` — App-wide constants (rate limits, concurrency caps)
- `supabase/` — Supabase client, auto-generated types, and Edge Functions

### External services

- **Google Gemini** — translation, word definitions, AI text generation
- **Supabase** — PostgreSQL database, Auth, Edge Functions
- **Sefaria API** — Bible passage retrieval
- **Resend** — transactional email

### Path alias

`@` resolves to `./src/` in both Vite and TypeScript.

### Test setup

`src/test/setup.ts` mocks localStorage, Supabase, and Radix UI portal/pointer events so components render in jsdom without a real browser. Add new global mocks there.
