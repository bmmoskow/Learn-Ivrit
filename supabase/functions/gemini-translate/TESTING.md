# Edge Function Testing Guide

## URL Extraction Error Handling

The `extract-url` endpoint properly handles different HTTP status codes when fetching external URLs.

### Test Cases

#### 1. 404 Not Found
**Expected Behavior:** Returns 404 with user-friendly error message
```bash
# Manual test (replace with actual URL that returns 404)
curl -X POST https://your-project.supabase.co/functions/v1/gemini-translate/extract-url \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/page-that-does-not-exist"}'

# Expected Response
# Status: 404
# Body: {"error":"The page was not found. Please check the URL and try again."}
```

#### 2. 403 Forbidden
**Expected Behavior:** Returns 403 with user-friendly error message
```bash
curl -X POST https://your-project.supabase.co/functions/v1/gemini-translate/extract-url \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/forbidden"}'

# Expected Response
# Status: 403
# Body: {"error":"Access to this page is forbidden. The website may be blocking automated requests."}
```

#### 3. 500+ Server Errors
**Expected Behavior:** Returns 502 with user-friendly error message
```bash
curl -X POST https://your-project.supabase.co/functions/v1/gemini-translate/extract-url \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/server-error"}'

# Expected Response
# Status: 502
# Body: {"error":"The website's server returned an error. Please try again later."}
```

#### 4. Success Case
**Expected Behavior:** Returns 200 with extracted content
```bash
curl -X POST https://your-project.supabase.co/functions/v1/gemini-translate/extract-url \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/article"}'

# Expected Response
# Status: 200
# Body: {"title":"Article Title","content":"Article content...","excerpt":"..."}
```

## Frontend Integration

The frontend (`useTranslationPanel.ts`) handles these status codes and displays appropriate error messages:

- **404**: "The page was not found. Please check the URL and try again."
- **403**: "This website blocks automated text extraction. Try copying and pasting the article text manually using the \"Paste / Type\" option instead."
- **500/502/503/504**: "Server error while processing the URL. Please try again or use a different source."

## Automated Tests

Frontend tests verify the error handling in:
- `src/components/TranslationPanel/useTranslationPanel.unittest.tsx`

Test coverage includes:
- ✓ handles 403 forbidden error
- ✓ handles 404 not found error
- ✓ handles 500 server error
- ✓ handles 502 bad gateway error

All tests pass and verify that the correct error messages are displayed to users.
