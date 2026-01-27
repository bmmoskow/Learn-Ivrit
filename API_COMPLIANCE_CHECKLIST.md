# API Compliance Checklist

This document outlines what you need to verify with the third-party APIs you're using.

## Google Gemini API - ✅ COMPLIANT

Based on Google's Gemini API Terms (https://ai.google.dev/gemini-api/terms):

### Current Status
- ✅ **Commercial Use**: Allowed (you're good to charge for your service)
- ✅ **Translation Use**: No specific restrictions on translation features
- ✅ **Caching**: Implemented with 30-day expiration policy
    - Translations cached in `translation_cache` table expire after 30 days of inactivity
    - Automatic cleanup runs daily via pg_cron
    - Complies with temporary caching requirements
- ✅ **Data Retention**: Prompts stored for 30 days for debugging
    - No sensitive personal information sent in requests
    - Only Hebrew text and educational content
- ✅ **Rate Limits**: Implemented rate limiting (100/hour for definitions, 30/hour for translations)
- ✅ **Age Requirement**: ToS updated to require 18+ years old
    - Complies with Gemini API age requirement
- ✅ **Attribution**: "Translations powered by Google Gemini" displayed in footer

### Completed Actions
1. ✅ Added 30-day expiration to translation cache
2. ✅ Updated age requirement to 18+ in Terms of Service
3. ✅ Added visible attribution in application footer

### Google Gemini API Terms
- Full Terms: https://ai.google.dev/gemini-api/terms
- Rate Limits: https://ai.google.dev/gemini-api/docs/rate-limits

---

## Sefaria.org API - ✅ MOSTLY COMPLIANT

**Status: Basic compliance measures implemented, formal verification recommended**

### Current Usage
- Fetching Bible texts via their API
- Caching responses in `sefaria_cache` table with 30-day expiration
- Automatic cleanup (deletes after 30 days if not accessed in 7 days)

### Implemented Protections
- ✅ **Rate Limiting**: 60 requests/hour, 300 requests/day per user
- ✅ **Attribution**: "Biblical texts from Sefaria.org" displayed in footer with link
- ✅ **Caching**: Reasonable 30-day expiration policy to reduce API load
- ✅ **Guest Mode**: Rate limits apply to guest users to prevent abuse

### Still Recommended
1. **Contact Sefaria** to formally verify:
    - Commercial usage permissions
    - Caching policy compliance
    - Attribution requirements
    - Content licensing

2. **Monitor Usage**: Keep track of API requests to ensure you're being a good API citizen

3. **Consider Alternatives**: Have backup options if Sefaria changes their terms

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

## Compliance Status Summary

### ✅ COMPLETED
1. ✅ Updated age requirement to 18+ in Terms of Service
2. ✅ Added Gemini 30-day cache expiration policy
3. ✅ Added attribution for both Sefaria and Google Gemini in UI footer
4. ✅ Implemented Sefaria rate limiting (60/hour, 300/day)
5. ✅ Data sent to APIs is clean (no personal information)

### 📋 RECOMMENDED (Before Public Launch)
6. **Contact Sefaria** for formal verification of:
    - Commercial usage permissions
    - Caching policy approval
    - Attribution requirements

7. **Legal Review** (optional but recommended):
    - Have attorney review Terms of Service and Privacy Policy
    - Verify GDPR/CCPA compliance if applicable
    - Estimated cost: $500-2,000

### 💡 FUTURE IMPROVEMENTS
8. **Document API dependencies** in README
9. **Monitor API usage costs** and set budget alerts
10. **Have backup plans** if APIs become unavailable
11. **Consider alternative APIs** as backups

---

## Implementation Details

### 1. Translation Cache Expiration ✅
**File:** `supabase/migrations/add_translation_cache_expiration_policy.sql`
**Status:** IMPLEMENTED
**Details:**
- Translations expire after 30 days of inactivity
- Automatic cleanup via existing pg_cron job
- Complies with Google Gemini API terms

### 2. Age Requirement ✅
**File:** `TERMS_OF_SERVICE.md` (line 24)
**Status:** UPDATED
**Current:** "You must be at least 18 years old"
**Complies with:** Google Gemini API age requirement

### 3. Attribution ✅
**File:** `src/components/Footer.tsx`
**Status:** IMPLEMENTED
**Details:**
- "Translations powered by Google Gemini" with link
- "Biblical texts from Sefaria.org" with link
- Visible in footer on all pages

### 4. Sefaria Rate Limiting ✅
**File:** `supabase/functions/sefaria-fetch/index.ts`
**Status:** IMPLEMENTED
**Details:**
- 60 requests per hour
- 300 requests per day
- Uses same rate limit table as Gemini
- Only counts cache misses (actual API calls)

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

## Next Steps

Before launching to production:

1. **Test all rate limits** to ensure they're working correctly
2. **Contact Sefaria** at developers@sefaria.org to confirm compliance
3. **Consider legal review** if budget allows
4. **Document API costs** and set up monitoring/alerts
5. **Review this checklist** again in 30 days

---

**Last Updated:** 2026-01-27
**Next Review Date:** 2026-02-27
**Compliance Status:** ✅ READY FOR LAUNCH (with recommendation to contact Sefaria)
