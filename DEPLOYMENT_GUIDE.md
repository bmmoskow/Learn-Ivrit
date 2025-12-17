# Deployment Guide

Complete guide for deploying the Hebrew Translation & Vocabulary Learning App to production.

## Deployment Platforms

This app can be deployed to various platforms. We recommend:
- **Vercel** (Recommended) - Best for React apps with zero configuration
- **Netlify** - Good alternative with similar features
- **Cloudflare Pages** - Fast global CDN
- **Traditional hosting** - Any static hosting service

## Vercel Deployment (Recommended)

### Prerequisites
- Vercel account
- GitHub/GitLab/Bitbucket repository
- Supabase project

### Steps

1. **Push code to GitHub**
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

2. **Import to Vercel**
- Go to [Vercel Dashboard](https://vercel.com/dashboard)
- Click "Add New Project"
- Import your GitHub repository
- Vercel will auto-detect Vite configuration

3. **Configure Environment Variables**

Add these in Vercel Project Settings → Environment Variables:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

4. **Deploy**
- Click "Deploy"
- Vercel will build and deploy automatically
- Your app will be live at `your-project.vercel.app`

### Continuous Deployment

Vercel automatically deploys:
- Production: Every push to `main` branch
- Preview: Every pull request

### Custom Domain

1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. SSL certificate is automatically provisioned

## Netlify Deployment

### Using Netlify CLI

1. **Install Netlify CLI**
```bash
npm install -g netlify-cli
```

2. **Build the project**
```bash
npm run build
```

3. **Deploy**
```bash
netlify deploy --prod
```

### Using Netlify UI

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect your Git repository
4. Configure build settings:
    - Build command: `npm run build`
    - Publish directory: `dist`
5. Add environment variables in Site Settings → Environment Variables
6. Deploy

## Cloudflare Pages

1. Go to [Cloudflare Pages](https://pages.cloudflare.com)
2. Create a new project
3. Connect your Git repository
4. Build settings:
    - Build command: `npm run build`
    - Build output directory: `dist`
    - Framework preset: Vite
5. Add environment variables
6. Deploy

## Supabase Configuration

### Database Setup

1. **Apply Migrations**

Using Supabase Dashboard:
- Go to SQL Editor
- Copy contents from each migration file in `supabase/migrations`
- Execute in order

Using Supabase CLI:
```bash
supabase db push
```

2. **Configure Auth**

In Supabase Dashboard → Authentication → Settings:
- Enable Email provider
- Disable email confirmation (or configure email templates)
- Set Site URL to your production URL
- Add Redirect URLs for OAuth

3. **Row Level Security**

All RLS policies are included in migrations. Verify:
```sql
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';
```

### Edge Functions

Deploy edge functions:

```bash
supabase functions deploy gemini-translate
supabase functions deploy sefaria-fetch
```

Set secrets:
```bash
supabase secrets set GEMINI_API_KEY=your_key
```

## Environment Variables Reference

### Required Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| VITE_SUPABASE_URL | Supabase project URL | Supabase Dashboard → Settings → API |
| VITE_SUPABASE_ANON_KEY | Supabase anonymous key | Supabase Dashboard → Settings → API |
| VITE_GEMINI_API_KEY | Google Gemini API key | [Google AI Studio](https://makersuite.google.com/app/apikey) |

### Security Notes

- Never commit `.env` files to Git
- Use different keys for development and production
- Rotate keys regularly
- Monitor API usage and set up alerts

## Performance Optimization

### Build Optimization

1. **Code Splitting**
- Already configured in Vite
- Routes are automatically code-split

2. **Bundle Analysis**
```bash
npm run build -- --mode analyze
```

3. **Compression**
- Enable gzip/brotli on your hosting platform
- Vercel/Netlify do this automatically

### Database Optimization

1. **Indexes**
- All critical indexes are in migrations
- Monitor query performance in Supabase Dashboard

2. **Connection Pooling**
- Enabled by default in Supabase
- Configure in Project Settings if needed

3. **Caching**
- API responses are cached in database
- Configure cache cleanup intervals

## Monitoring

### Vercel Analytics

1. Enable in Project Settings → Analytics
2. Free tier includes basic metrics

### Sentry Integration (Optional)

1. Create Sentry account
2. Install Sentry:
```bash
npm install @sentry/react
```

3. Configure in `main.tsx`:
```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: import.meta.env.MODE,
});
```

### Supabase Monitoring

Monitor in Supabase Dashboard:
- Database usage and performance
- API requests and errors
- Edge function logs
- Storage usage

## Backup Strategy

### Database Backups

Supabase Pro includes:
- Daily automatic backups (7 days retention)
- Point-in-time recovery

Manual backup:
```bash
supabase db dump -f backup.sql
```

### Code Backups

- Git repository serves as code backup
- Tag releases: `git tag -a v1.0.0 -m "Release 1.0.0"`
- Push tags: `git push --tags`

## Rollback Procedures

### Vercel Rollback

1. Go to Deployments tab
2. Find previous working deployment
3. Click "..." → "Promote to Production"

### Database Rollback

1. Create new migration that reverts changes
2. Test in development
3. Apply to production

## Troubleshooting

### Build Failures

1. Check build logs for errors
2. Ensure all dependencies are in package.json
3. Verify Node.js version matches local development
4. Clear cache and rebuild

### Runtime Errors

1. Check browser console
2. Review Vercel/Netlify function logs
3. Check Supabase logs
4. Verify environment variables are set correctly

### Database Issues

1. Verify migrations are applied in order
2. Check RLS policies are correct
3. Monitor query performance
4. Verify indexes are created

## Security Checklist

- [ ] Environment variables are set correctly
- [ ] RLS policies are enabled on all tables
- [ ] API keys are not exposed in client code
- [ ] CORS is properly configured
- [ ] Auth redirect URLs are whitelisted
- [ ] Rate limiting is configured
- [ ] SQL injection protection (parameterized queries)
- [ ] XSS protection (React escapes by default)
- [ ] HTTPS is enforced
- [ ] Security headers are configured

## Post-Deployment

1. **Test all features**
    - User registration and login
    - Translation functionality
    - Vocabulary management
    - Test modes
    - Bookmarks

2. **Monitor performance**
    - Page load times
    - API response times
    - Database query performance

3. **Set up alerts**
    - Error rate thresholds
    - API rate limit warnings
    - Database connection issues

4. **Documentation**
    - Update README with production URL
    - Document any deployment-specific configuration
    - Keep changelog updated

## Scaling Considerations

### Application Scaling

Vercel/Netlify handle this automatically:
- CDN edge caching
- Automatic scaling
- Geographic distribution

### Database Scaling

Supabase scaling options:
- Upgrade to Pro for better performance
- Connection pooling for more connections
- Read replicas for read-heavy workloads
- Indexes for query optimization

### Cost Management

Monitor usage:
- Supabase: Database size, bandwidth, API requests
- Vercel: Build minutes, bandwidth, serverless function executions
- Gemini API: Token usage

Set up billing alerts to avoid surprises.

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Documentation](https://vitejs.dev)
- Project Issues: GitHub repository
