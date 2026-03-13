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

Click any Hebrew word to see its definition, transliteration, vowelized form, and related word forms. Add words to your personal vocabulary list with a single click.

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

| Description     | Workflow File     | Trigger                  | Checks                                              |
| --------------- | ----------------- | ------------------------ | --------------------------------------------------- |
| **Base Checks** | `base-checks.yml` | Called by others         | Build                                               |
| **Development** | `development.yml` | Push/PR to `development` | Base checks → Unit tests → Promote to `integration` |
| **Integration** | `integration.yml` | Push to `integration`    | Development checks → Promote to `ui`                |
| **UI**          | `ui.yml`          | Push to `ui`             | Integration checks → Promote to `main`              |
| **Security**    | `security.yml`    | Called by Production     | npm audit, Trivy scan, license check                |
| **Production**  | `main.yml`        | Push to `main`           | UI checks + Security audit                          |

All workflow files are in `.github/workflows/`.

Planned additions (currently commented out): ESLint, TypeScript type checking, integration tests, E2E tests (Playwright), and CodeQL analysis.

---

## Commands

### Build

```bash
npm run build:prod       # TypeScript check + production build
npm run build:dev        # Development build (no type checking, no minification)
```

### Deploy

```bash
npm run deploy:dev       # Start dev server with hot reload (HMR)
npm run deploy:prod      # Serve production build locally
```

### Testing

```bash
npm run test             # Run all tests (unit + integration + ui (not all implemented yet))
npm run test:unit        # Run only unit tests
npm run test:watch       # Run all tests in watch mode
```

### Code Quality

```bash
npm run lint             # Run ESLint
npm run typecheck        # TypeScript type checking (no emit)
```

### Security

```bash
npm run security:base    # npm audit + audit-ci (moderate level)
npm run security:audit   # Custom deep dependency audit script
```

---

## Tech Stack

- **Frontend** — React 18, TypeScript, Vite
- **Styling** — Tailwind CSS, shadcn/ui
- **Backend** — Supabase (Auth, PostgreSQL, Edge Functions)
- **AI** — Google Gemini API (translation, definitions, passage generation)
- **External APIs** — Sefaria (Biblical texts)
- **Email** — Resend
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
npm run deploy:dev
```

The app requires a Supabase project with the appropriate tables and Edge Functions deployed. See `supabase/` for configuration.
