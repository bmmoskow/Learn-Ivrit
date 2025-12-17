# CI/CD Pipeline Setup

This document describes the complete CI/CD pipeline architecture for the Hebrew Learning application.

## Pipeline Architecture

The pipeline uses a cascading workflow structure with progressive testing gates:

```
development → integration → ui → main (production)
    ↓             ↓          ↓       ↓
Base Checks   Integration  E2E    Deploy
Unit Tests      Tests     Tests
```

## Branch Strategy

### 1. development
- **Purpose**: Daily development work
- **PR Target**: Accept PRs from feature branches (only branch accepting PRs)
- **Tests**: Base checks + Unit tests
- **Auto-promotion**: Promotes to `integration` on success

### 2. integration
- **Purpose**: Integration testing against test database
- **PR Target**: No PRs (only accepts auto-promotions)
- **Tests**: All development tests + Integration tests
- **Auto-promotion**: Promotes to `ui` on success

### 3. ui
- **Purpose**: End-to-end testing with full user flows
- **PR Target**: No PRs (only accepts auto-promotions)
- **Tests**: All integration tests + E2E tests + Deep security scan
- **Auto-promotion**: Promotes to `main` on success

### 4. main
- **Purpose**: Production-ready code
- **PR Target**: No PRs (only accepts auto-promotions)
- **Tests**: All ui tests + Production deployment
- **Additional**: Weekly comprehensive security audits

## Workflow Files

### base-checks.yml
**Runs on**: All branches (called as reusable workflow)
**Jobs**:
- Lint (ESLint)
- Type Check (TypeScript)
- Build (Vite)
- Fast Security Scan (npm audit, audit-ci)

### development.yml
**Runs on**: `push` and `pull_request` to development
**Jobs**:
- Calls `base-checks.yml`
- Unit Tests (vitest)
- Auto-promotion to integration

**Environment**: `development`

### integration.yml
**Runs on**: `push` to integration (no PRs)
**Jobs**:
- Calls `development.yml` (includes base-checks)
- Integration Tests (vitest with test DB)
- Auto-promotion to ui

**Environment**: `test`

### ui.yml
**Runs on**: `push` to ui (no PRs)
**Jobs**:
- Calls `integration.yml` (includes all previous tests)
- E2E Tests (Playwright)
- Deep Security Scan (CodeQL, Trivy)
- Auto-promotion to main

**Environment**: `test`

### main.yml
**Runs on**: `push` to main (no PRs) + weekly schedule
**Jobs**:
- Calls `ui.yml` (includes all previous tests)
- Production Deployment
- Weekly Security Audit (scheduled Sundays at midnight UTC)

**Environment**: `production`

## GitHub Environments

Configure these environments in GitHub Settings → Environments:

### development
**Purpose**: Development database and services
**Secrets**:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GEMINI_API_KEY`

### test
**Purpose**: Test database for integration and E2E tests
**Secrets**:
- `VITE_SUPABASE_URL` (test DB)
- `VITE_SUPABASE_ANON_KEY` (test DB)
- `VITE_GEMINI_API_KEY`

### production
**Purpose**: Production database and deployment
**Secrets**:
- `VITE_SUPABASE_URL` (production DB)
- `VITE_SUPABASE_ANON_KEY` (production DB)
- `VITE_GEMINI_API_KEY`
- `VERCEL_TOKEN` (optional, for deployment)
- `VERCEL_ORG_ID` (optional, for deployment)
- `VERCEL_PROJECT_ID` (optional, for deployment)

## Test Types

### Unit Tests
- **Command**: `npm run test:unit`
- **Pattern**: `**/*.unittest.{ts,tsx}`
- **Environment**: No database required
- **Config**: `vitest.config.ts`

### Integration Tests
- **Command**: `npm run test:integration`
- **Pattern**: `**/*.integrationtest.{ts,tsx}`
- **Environment**: Requires test database
- **Config**: `vitest.integration.config.ts`

### E2E Tests
- **Command**: `npm run test:e2e`
- **Location**: `e2e/*.spec.ts`
- **Environment**: Requires test database + running dev server
- **Config**: `playwright.config.ts`

## Developer Workflow

### Creating a Feature

1. **Create feature branch from development**:
   ```bash
   git checkout development
   git pull origin development
   git checkout -b feature/my-feature
   ```

2. **Make changes and test locally**:
   ```bash
   npm run lint
   npm run typecheck
   npm run build
   npm run test:unit
   ```

3. **Commit and push**:
   ```bash
   git add .
   git commit -m "Add my feature"
   git push origin feature/my-feature
   ```

4. **Create PR to development**:
    - Go to GitHub
    - Create Pull Request targeting `development` branch
    - Wait for CI checks to pass

5. **After PR is merged**:
    - Watch automatic promotion through pipeline
    - `development` → `integration` → `ui` → `main`
    - Each stage runs its tests automatically
    - If any stage fails, promotion stops

### Monitoring Pipeline

- Check GitHub Actions tab for workflow status
- Each promotion creates a new commit with message like:
    - "Auto-promote from development to integration"
    - "Auto-promote from integration to ui"
    - "Auto-promote from ui to main"

## Branch Protection Rules

Configure in GitHub Settings → Branches:

### development
- ✅ Require pull request before merging
- ✅ Require status checks to pass:
    - Base Checks
    - Unit Tests
- ❌ No approval required (solo developer)

### integration
- ✅ Restrict who can push: Only `github-actions[bot]`
- ✅ Require status checks to pass

### ui
- ✅ Restrict who can push: Only `github-actions[bot]`
- ✅ Require status checks to pass

### main
- ✅ Restrict who can push: Only `github-actions[bot]`
- ✅ Require status checks to pass

## Security Scanning

### Fast Security Scan (All Branches)
- npm audit (moderate level)
- audit-ci
- Runtime: ~1-2 minutes

### Deep Security Scan (ui + main)
- CodeQL (static analysis)
- Trivy (vulnerability scanner)
- Runtime: ~5-10 minutes

### Weekly Security Audit (main only)
- Comprehensive dependency audit (low level)
- CodeQL analysis
- Trivy with all severity levels
- License compliance check
- Scheduled: Sundays at midnight UTC

## Troubleshooting

### Pipeline stops at integration
- Check integration test logs
- Verify test database is accessible
- Ensure test database schema is up to date

### Pipeline stops at ui
- Check E2E test logs in Playwright report artifact
- Verify test database has proper test data
- Check security scan results in GitHub Security tab

### Auto-promotion not triggering
- Verify GitHub Actions has write permissions to repository
- Check if previous stage passed all tests
- Ensure branch protection rules allow github-actions[bot] to push

### Environment secrets not working
- Verify secrets are set in correct GitHub Environment
- Check environment name matches workflow configuration
- Ensure secrets have correct names (case-sensitive)

## Local Development

### Running tests locally

```bash
# Unit tests only
npm run test:unit

# Integration tests (requires .env.test)
npm run test:integration

# E2E tests (requires .env.test + dev server)
npm run test:e2e

# E2E tests with UI
npm run test:e2e:ui

# All tests
npm run test:all
```

### Database Setup

For integration and E2E tests, create `.env.test`:

```env
VITE_SUPABASE_URL=https://your-test-db.supabase.co
VITE_SUPABASE_ANON_KEY=your-test-anon-key
VITE_GEMINI_API_KEY=your-gemini-api-key
```

## Cost Optimization

- Unit tests run on every commit (fast, cheap)
- Integration tests only after unit tests pass
- E2E tests only after integration tests pass
- Deep security scans only on ui and main branches
- Comprehensive audits only weekly

This progressive approach minimizes CI/CD costs while maintaining quality.
