# Quick Start Guide

Get started with the Hebrew Translation & Vocabulary Learning App in minutes.

## Prerequisites

- Node.js 20 or higher
- npm or yarn
- Supabase account

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd hebrew-translate
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

Get these values from:
- Supabase URL & Key: Your Supabase project settings
- Gemini API Key: [Google AI Studio](https://makersuite.google.com/app/apikey)

4. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Database Setup

The database migrations are included in the `supabase/migrations` folder. To apply them:

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Link your project:
```bash
supabase link --project-ref your-project-ref
```

3. Push migrations:
```bash
supabase db push
```

## Features Overview

### Translation Panel
- Translate Hebrew text to English using the Sefaria API
- Click on Hebrew words to see definitions and add them to your vocabulary
- Save passages as bookmarks for later review

### Vocabulary List
- View and manage your Hebrew vocabulary
- Track learning progress with confidence scores
- Edit or delete words as needed

### Test Panel
- Three test modes: Multiple Choice, Fill-in-the-Blank, and Flashcards
- Adaptive algorithm prioritizes words you're struggling with
- Track your progress over time

### Dashboard
- View statistics about your learning progress
- See recent test scores and vocabulary growth
- Monitor your confidence levels

## Project Structure

```
hebrew-translate/
├── src/
│   ├── components/       # React components
│   ├── contexts/         # React contexts (Auth, etc.)
│   ├── hooks/            # Custom React hooks
│   ├── pages/            # Page components
│   ├── utils/            # Utility functions
│   └── lib/              # Library configurations
├── supabase/
│   ├── migrations/       # Database migrations
│   └── functions/        # Edge functions
├── public/               # Static assets
└── tests/                # Test files
```

## Common Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript checks
npx vitest run       # Run tests
```

## Troubleshooting

### Authentication Issues
- Ensure your Supabase URL and Anon Key are correct
- Check that email confirmation is disabled in Supabase Auth settings
- Verify RLS policies are correctly configured

### API Rate Limits
- The Gemini API has rate limits - check `gemini_api_rate_limits` table
- Sefaria API responses are cached to reduce requests

### Build Errors
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`
- Check TypeScript errors: `npm run typecheck`

## Next Steps

- Read the [Deployment Guide](DEPLOYMENT_GUIDE.md) for production deployment
- Check out the [API Compliance Checklist](API_COMPLIANCE_CHECKLIST.md)
- Review the [Privacy Policy](public/PRIVACY_POLICY.md) and [Terms of Service](public/TERMS_OF_SERVICE.md)

## Need Help?

- Check existing issues on GitHub
- Review the Supabase documentation
- Contact the maintainers
