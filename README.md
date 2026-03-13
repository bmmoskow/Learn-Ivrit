# Learn Ivrit (לימוד עברית)

A Hebrew language learning application that helps users translate, study, and master Hebrew vocabulary through multiple input methods, interactive definitions, and adaptive testing.

## Features

### Translation Panel

Translate Hebrew text from a variety of sources:

- **Paste or Type** — Enter Hebrew or English text directly
- **Upload Image** — Extract Hebrew text from a photo using OCR
- **Load from URL** — Fetch Hebrew content from any webpage
- **Load from Bible** — Select a book and chapter from the Tanakh via the Sefaria API
- **Generate with AI** — Create a Hebrew passage at your proficiency level using Gemini AI

### Bookmarks

Save and organize translated passages into bookmark folders for easy retrieval.

### Word Definitions & Vocabulary

Click any Hebrew word to see its definition, transliteration, vowelized form, example sentences, and related word forms. Add words to your personal vocabulary list with a single click.

### Vocabulary Testing

Test yourself with three modes:

- **Multiple Choice** — Pick the correct translation from options
- **Fill in the Blank** — Type the English translation
- **Flashcards** — Flip cards to review words

An adaptive algorithm prioritizes words you struggle with and tracks your progress over time.

### Additional Pages

- **Dashboard** — View learning statistics and progress charts
- **Settings** — Manage account and preferences
- **FAQ, Contact, Privacy Policy, Terms of Service**

---

## Project Structure

```
src/
├── components/          # UI components (feature-based folders)
│   ├── Dashboard/
│   ├── TranslationPanel/
│   ├── VocabularyList/
│   ├── TestPanel/
│   ├── Navigation/
│   ├── Footer/
│   ├── Settings/
│   └── ui/              # shadcn/ui primitives
├── contexts/            # React context providers (Auth)
├── hooks/               # Shared hooks (bookmarks, toast, etc.)
├── utils/               # Utility modules
├── pages/               # Route-level page components
├── data/                # Static data (Bible books, default vocab)
└── integrations/        # Supabase client & generated types

supabase/
├── functions/           # Edge Functions (Gemini, Sefaria, email)
└── config.toml          # Supabase local config
```

Each feature folder follows the pattern:
- `Component.tsx` — Container (connects hook to UI)
- `ComponentUI.tsx` — Presentational component
- `useComponent.ts` — Custom hook (state & logic)
- `componentUtils.ts` — Pure utility functions
- `*.unittest.ts(x)` — Unit tests

---

## CI/CD Pipeline

The project uses a multi-branch promotion strategy with GitHub Actions:

```
development → integration → ui → main
```

Each branch runs progressively more checks before auto-promoting to the next:

| Workflow | File | Trigger | Checks |
|----------|------|---------|--------|
| **Base Checks** | `.github/workflows/base-checks.yml` | Called by others | Build |
| **Development** | `.github/workflows/development.yml` | Push/PR to `development` | Base checks → Unit tests → Promote to `integration` |
| **Integration** | `.github/workflows/integration.yml` | Push to `integration` | Development checks → Promote to `ui` |
| **UI** | `.github/workflows/ui.yml` | Push to `ui` | Integration checks → Promote to `main` |
| **Production** | `.github/workflows/main.yml` | Push to `main` | UI checks + Security audit |
| **Security** | `.github/workflows/security.yml` | Called by Production | npm audit, Trivy scan, license check |
| **Tests** | `.github/workflows/test.yml` | Push/PR to `main` | Vitest + Build |

Planned additions (currently commented out): ESLint, TypeScript type checking, integration tests, E2E tests (Playwright), and CodeQL analysis.

---

## Commands

### Development

```bash
npm run dev              # Start dev server with hot reload
npm run build            # TypeScript check + production build
npm run build:dev        # Development build (no type checking)
npm run preview          # Preview production build locally
```

### Testing

```bash
npm run test             # Run all unit tests (single run)
npm run test:unit        # Alias for above
npm run test:watch       # Run tests in watch mode
```

### Code Quality

```bash
npm run lint             # Run ESLint
npm run typecheck        # TypeScript type checking (no emit)
```

### Security

```bash
npm run security:audit   # Custom deep dependency audit script
npm run security:base    # npm audit + audit-ci (moderate level)
```

---

## Tech Stack

- **Frontend** — React 18, TypeScript, Vite
- **Styling** — Tailwind CSS, shadcn/ui
- **Backend** — Supabase (Auth, PostgreSQL, Edge Functions)
- **AI** — Google Gemini API (translation, definitions, passage generation)
- **External APIs** — Sefaria (Biblical texts)
- **Testing** — Vitest, React Testing Library
- **CI/CD** — GitHub Actions

---

## Getting Started

```bash
# Clone the repository
git clone https://github.com/your-username/learn-ivrit.git
cd learn-ivrit

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app requires a Supabase project with the appropriate tables and Edge Functions deployed. See `supabase/` for configuration.
