# API Compliance Checklist

This document outlines what you need to verify with the third-party APIs you're using.

## Google Gemini API - ✅ MOSTLY COMPLIANT

Based on Google's Gemini API Terms (https://ai.google.dev/gemini-api/terms):

### Current Status
- ✅ **Commercial Use**: Allowed (you're good to charge for your service)
- ✅ **Translation Use**: No specific restrictions on translation features
- ⚠️ **Caching**: Limited caching allowed, but be cautious
  - You ARE caching translations indefinitely in `translation_cache` table
  - Google allows caching "temporarily for refining prompts" and in "user chat history"
  - **YOUR CACHE MAY VIOLATE TERMS** - you cache translations forever
- ⚠️ **Data Retention**: Prompts stored for 30 days for debugging
  - Don't send sensitive personal information
  - Your current usage seems fine (just Hebrew text)
- ✅ **Rate Limits**: You've implemented rate limiting (100/hour for definitions, 30/hour for translations)
- ✅ **Age Requirement**: Your ToS requires 13+, Gemini requires 18+ for API usage
  - **POTENTIAL ISSUE**: You allow 13-17 year olds but Gemini requires 18+

### Required Actions
1. **CRITICAL**: Review your translation caching strategy
   - Option A: Add expiration to cached translations (30-90 days max)
   - Option B: Contact Google to clarify if indefinite caching is allowed
   - Option C: Only cache for the user who requested it (not shared cache)

2. **Verify Age Requirement**:
   - Either raise minimum age to 18 in your Terms
   - OR verify that end-user usage (not API caller) can be 13+

3. **Review Data Sent**: Ensure no sensitive info in translation requests

### Google Gemini API Terms
- Full Terms: https://ai.google.dev/gemini-api/terms
- Rate Limits: https://ai.google.dev/gemini-api/docs/rate-limits

---

## Sefaria.org API - ⚠️ NEEDS VERIFICATION

**Status: Unable to find explicit API terms online**

### Current Usage
- You're fetching Bible texts via their API
- You're caching responses indefinitely in `sefaria_cache` table
- You have automatic cleanup (deletes after 30 days if not accessed in 7 days)

### What You Need to Verify
Contact Sefaria directly to confirm:

1. **Is API usage allowed for commercial applications?**
   - Your app will charge users - is this permitted?

2. **Is caching allowed?**
   - You cache all responses to reduce API load
   - Need to know if this violates their terms

3. **Are there rate limits?**
   - You're not implementing rate limits for Sefaria requests
   - Could get your IP blocked if you exceed limits

4. **Attribution requirements?**
   - Do you need to display "Powered by Sefaria" or similar?
   - Need to credit them in your UI?

5. **License of content?**
   - What license covers the Biblical texts?
   - Can you redistribute them (via cache)?
   - Some texts may be public domain, others not

### Required Actions
1. **Contact Sefaria**: developers@sefaria.org or use their contact form
2. **Review their ToS**: https://www.sefaria.org/terms
3. **Check their GitHub**: https://github.com/Sefaria/Sefaria-Project may have API docs
4. **Add attribution**: Likely required - add "Biblical texts provided by Sefaria.org" to your UI

### Sefaria Resources
- Website: https://www.sefaria.org
- Developers: https://developers.sefaria.org
- API Documentation: Check their GitHub

---

## Supabase - ✅ COMPLIANT

### Current Usage
- Database hosting
- Authentication
- Edge functions

### Terms
- Commercial use allowed
- No special restrictions for your use case
- Privacy Policy: https://supabase.com/privacy
- Terms: https://supabase.com/terms

---

## Recommended Actions (Priority Order)

### HIGH PRIORITY (Do Before Launch)
1. **Contact Sefaria** to verify API usage terms
2. **Review Gemini caching policy** - may need to limit cache duration
3. **Update age requirement to 18+** in Terms of Service (for Gemini compliance)
4. **Add attribution** for Sefaria in your UI

### MEDIUM PRIORITY (Do Before Accepting Payments)
5. **Add "Powered by" notices**:
   - "Translations powered by Google Gemini"
   - "Biblical texts provided by Sefaria.org"
6. **Review data sent to APIs** - ensure no personal info in requests
7. **Implement Sefaria rate limiting** to avoid getting blocked
8. **Consider separate caches** for different users (instead of shared cache)

### LOW PRIORITY (Nice to Have)
9. **Document API dependencies** in your README
10. **Monitor API usage costs** and set budget alerts
11. **Have backup plans** if APIs become unavailable
12. **Consider alternative APIs** as backups (e.g., other translation services)

---

## Current Code Issues to Address

### 1. Translation Cache Duration (HIGH PRIORITY)
**File:** `supabase/migrations/20251123190929_create_translation_cache.sql`
**Issue:** No expiration on cached translations
**Fix:** Add automatic cleanup similar to Sefaria cache

```sql
-- Option: Add auto-cleanup for translations older than 30 days
-- Add to your next migration
```

### 2. Age Requirement Mismatch (HIGH PRIORITY)
**File:** `TERMS_OF_SERVICE.md` (line 29)
**Current:** "You must be at least 13 years old"
**Gemini Requires:** 18 years old for API usage
**Fix:** Change to "You must be at least 18 years old"

### 3. Missing Attribution (MEDIUM PRIORITY)
**Files:** Your UI components
**Issue:** No visible credit to Sefaria or Google
**Fix:** Add attribution in footer or translation panel

### 4. Sefaria Rate Limiting (MEDIUM PRIORITY)
**File:** `supabase/functions/sefaria-fetch/index.ts`
**Issue:** No rate limiting implemented
**Fix:** Add rate limiting similar to Gemini function

---

## Legal Review Recommended

Consider having an attorney review:
1. Your Terms of Service and Privacy Policy
2. Your compliance with third-party API terms
3. GDPR compliance (if you have EU users)
4. CCPA compliance (if you have California users)

**Estimated cost:** $500-2,000 for initial review
**When:** Before accepting payments or reaching 1,000+ users

---

## Questions to Ask Legal Counsel

1. Is our arbitration clause enforceable in our jurisdiction?
2. Do we need to register as a business entity (LLC) before accepting payments?
3. Are our liability limitations sufficient?
4. Do we need additional terms for educational use?
5. Should we have separate terms for individual vs. institutional users?
6. Do we need to collect sales tax, and in which jurisdictions?

---

## Useful Resources

- Google Gemini API Terms: https://ai.google.dev/gemini-api/terms
- Sefaria Contact: https://www.sefaria.org/about
- GDPR Compliance Guide: https://gdpr.eu/checklist/
- CCPA Compliance Guide: https://oag.ca.gov/privacy/ccpa
- Stripe Legal Docs: https://stripe.com/legal (if using Stripe)

---

**Last Updated:** [DATE]
**Next Review Date:** [30 DAYS FROM NOW]
