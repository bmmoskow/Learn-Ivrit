# Legal Setup Guide - Quick Start

This guide helps you customize and implement your legal documents.

## Step 1: Customize Your Documents

Replace the following placeholders in **BOTH** documents:

### In TERMS_OF_SERVICE.md and PRIVACY_POLICY.md:

- `[DATE]` → Today's date (e.g., "December 27, 2024")
- `[YOUR EMAIL]` → Your support email (e.g., "support@yourapp.com")
- `[YOUR NAME/COMPANY NAME]` → Your legal name or business name
- `[YOUR ADDRESS]` → Your business address (required for legal purposes)
- `[YOUR STATE/COUNTRY]` → Your jurisdiction (e.g., "California, United States")
- `[YOUR JURISDICTION]` → Where disputes will be handled (e.g., "Santa Clara County, California")
- `[SERVER LOCATION]` → Where your data is stored (e.g., "United States" if using Supabase US region)
- `[YOUR DPO EMAIL]` → Data Protection Officer email (can be same as support email)

### Search and Replace Tip:
```bash
# Open each file and use find/replace for each placeholder
# Make sure you get ALL occurrences in both files
```

---

## Step 2: Add Legal Pages to Your App

You need to make these documents accessible to users:

### Option A: Create Dedicated Pages (Recommended)

1. Create new route files:
   - `/src/pages/Terms.tsx`
   - `/src/pages/Privacy.tsx`

2. Display the markdown content or convert to HTML

3. Add links to your footer/navigation:
   - "Terms of Service"
   - "Privacy Policy"

### Option B: External Links

1. Host the documents on your website
2. Link to them from your app
3. Simpler but less integrated

### Example Footer Component:

```tsx
<footer className="border-t py-6 mt-auto">
  <div className="container mx-auto px-4">
    <div className="flex justify-center space-x-6 text-sm text-gray-600">
      <a href="/terms" className="hover:text-gray-900">Terms of Service</a>
      <a href="/privacy" className="hover:text-gray-900">Privacy Policy</a>
      <a href="mailto:support@yourapp.com">Contact</a>
    </div>
    <div className="text-center mt-4 text-xs text-gray-500">
      Translations powered by Google Gemini • Biblical texts provided by Sefaria.org
    </div>
  </div>
</footer>
```

---

## Step 3: Update Registration/Login Flow

Users must accept Terms before creating an account:

### Add Checkbox to Registration Form:

```tsx
<div className="flex items-start">
  <input
    type="checkbox"
    id="acceptTerms"
    required
    className="mt-1"
  />
  <label htmlFor="acceptTerms" className="ml-2 text-sm">
    I agree to the{' '}
    <a href="/terms" target="_blank" className="text-blue-600 hover:underline">
      Terms of Service
    </a>{' '}
    and{' '}
    <a href="/privacy" target="_blank" className="text-blue-600 hover:underline">
      Privacy Policy
    </a>
  </label>
</div>
```

### Store Acceptance in Database (Optional but Recommended):

Add to `profiles` table:
```sql
ALTER TABLE profiles ADD COLUMN terms_accepted_at timestamptz;
ALTER TABLE profiles ADD COLUMN terms_version text DEFAULT '1.0';
```

---

## Step 4: Critical API Compliance Issues

### URGENT: Fix These Before Launch

#### 1. Change Age Requirement to 18+

**File:** `TERMS_OF_SERVICE.md` line 29

**Change FROM:**
```
You must be at least 13 years old to use this Service.
```

**Change TO:**
```
You must be at least 18 years old to use this Service.
```

**Reason:** Google Gemini API requires users to be 18+

#### 2. Contact Sefaria About API Usage

**Before launch, email them:**
- To: developers@sefaria.org
- Subject: "API Usage Terms for Commercial Hebrew Learning App"

**Template:**
```
Hi Sefaria Team,

I'm developing a Hebrew learning application that uses your API to fetch Biblical texts
for translation practice. I have a few questions about API usage:

1. Is commercial use of your API permitted? (Users may pay for my app)
2. Am I allowed to cache API responses to reduce load on your servers?
3. Are there rate limits I should be aware of?
4. Do you require attribution in my UI? (I'm happy to add "Powered by Sefaria")
5. What license covers the content I retrieve via the API?

My current implementation:
- Caches responses for 30 days
- Includes automatic cleanup for old data
- Used for educational Hebrew learning

Thank you for your help!

[Your name]
[Your app URL]
```

#### 3. Review Translation Cache Duration

**Current issue:** Your app caches translations indefinitely, which may violate Google's terms.

**File to review:** `supabase/migrations/20251123190929_create_translation_cache.sql`

**Options:**
- **Option A:** Limit cache to 30 days (safest)
- **Option B:** Only cache per-user (not shared)
- **Option C:** Contact Google for clarification

**Recommended:** Implement 30-day auto-cleanup similar to your Sefaria cache.

---

## Step 5: Add Required UI Attribution

Add to your app's footer or relevant pages:

### Minimum Required:
```
Translations powered by Google Gemini
Biblical texts provided by Sefaria.org
```

### Where to Add:
1. **Footer** (always visible)
2. **Translation panel** (when showing translations)
3. **Bible text view** (when showing Sefaria content)

---

## Step 6: Cookie Consent (If You Add Analytics)

If you add Google Analytics, ad networks, or other tracking:

1. **Add cookie consent banner** (required by GDPR)
2. **Update Privacy Policy** with specific cookies used
3. **Use a consent management tool** (e.g., Cookiebot, OneTrust)

**Current status:** Your app uses minimal cookies (authentication only), so this may not be required yet.

---

## Step 7: Business Setup (Before Accepting Payments)

### Form an LLC (Recommended)
- **Why:** Protects your personal assets from lawsuits
- **Cost:** $100-300 depending on state
- **Where:** Your state's Secretary of State website
- **Time:** 1-4 weeks

### Get Business Insurance (Optional but Smart)
- **Errors & Omissions Insurance** (E&O)
- **Cost:** $500-1,500/year
- **Covers:** Lawsuits related to your service
- **Providers:** Hiscox, Simply Business, Embroker

### Business Bank Account
- Required for clean accounting
- Separates personal and business finances
- Needed for Stripe/payment processing

---

## Step 8: Payment Processing Legal Requirements

### If Using Stripe:

1. **Agree to Stripe's Terms:** https://stripe.com/legal
2. **Verify refund policy** matches your Terms
3. **Set up tax collection** if required in your jurisdiction
4. **Add "Terms apply" to checkout page**

### Subscription-Specific Requirements:

Add to checkout page:
```
"By subscribing, you agree to automatic recurring billing.
You can cancel anytime. See our Terms of Service for details."
```

---

## Step 9: Email Users About Terms (After Launch)

If you already have users, notify them:

**Subject:** "Updated Terms of Service and Privacy Policy"

**Body:**
```
Hi [Name],

We've published our Terms of Service and Privacy Policy to better
protect you and explain how we handle your data.

Terms of Service: [link]
Privacy Policy: [link]

These take effect on [DATE]. By continuing to use [App Name] after
this date, you agree to these terms.

Questions? Reply to this email.

Thanks!
[Your name]
```

---

## Step 10: Regular Reviews

### Every 6 Months:
- Review terms for accuracy
- Check if features changed (requires terms update)
- Verify compliance with new laws

### When Making Changes:
- Update "Last Updated" date
- Notify users via email if material changes
- Keep old versions for records

---

## Common Questions

### Q: Do I really need all this legal stuff?
**A:** Yes, especially once you accept payments. Protects you from lawsuits and builds user trust.

### Q: Can I just copy someone else's Terms?
**A:** No. These documents must be customized to YOUR service. Copying is risky.

### Q: What if I'm just running this as a hobby?
**A:** Still need Privacy Policy (required by GDPR/CCPA). Terms are highly recommended.

### Q: When should I get a lawyer involved?
**A:** Before accepting payments, or once you have 1,000+ users, or if you get a legal threat.

### Q: Can I change these terms later?
**A:** Yes, but you must notify users of material changes (via email).

---

## Checklist Before Launch

- [ ] Customized all placeholders in Terms and Privacy Policy
- [ ] Added Terms/Privacy links to app footer
- [ ] Added acceptance checkbox to registration
- [ ] Changed age requirement to 18+
- [ ] Contacted Sefaria about API usage
- [ ] Added attribution to footer
- [ ] Reviewed translation cache duration
- [ ] Formed LLC (if accepting payments)
- [ ] Set up business bank account (if accepting payments)
- [ ] Configured payment processor with correct terms

---

## Need Help?

### DIY Legal Docs:
- **Termly:** https://termly.io (~$10/month, auto-updates)
- **iubenda:** https://www.iubenda.com (~$27/month)
- **TermsFeed:** https://www.termsfeed.com (one-time $50-200)

### Legal Review:
- **UpCounsel:** https://www.upcounsel.com ($500-2,000)
- **LegalZoom:** https://www.legalzoom.com ($300-1,500)
- **Local attorney:** Search for "tech attorney" in your area

### Business Formation:
- **Northwest Registered Agent:** https://www.northwestregisteredagent.com
- **Incfile:** https://www.incfile.com
- **Your state's website:** Usually cheapest but DIY

---

**Remember:** I'm not a lawyer. This guide is for informational purposes only.
Consider consulting an attorney for your specific situation.
