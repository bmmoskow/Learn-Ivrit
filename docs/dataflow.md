# Learn Ivrit — System Dataflow Diagram

_Generated from live Supabase schema — 2026-06-07_

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                                   BROWSER (React)                                    │
│                                                                                      │
│  ┌─────────────────┐                                                                 │
│  │   AuthContext   │  Supabase Auth (email/password, magic link)                     │
│  │                 │  guest mode (localStorage only, no DB writes)                   │
│  └────────┬────────┘                                                                 │
│           │                                                                          │
│  ┌────────▼──────────────────────────────────────────────────────────────────────┐   │
│  │  App.tsx / Router                                                             │   │
│  │                                                                               │   │
│  │  ┌──────────────────────────────────────────────────────────────────────────┐ │   │
│  │  │  TranslationPanel                                                        │ │   │
│  │  │  ┌─────────────┐ ┌────────────┐ ┌──────────────┐ ┌────────────────────┐  │ │   │
│  │  │  │  TextInput  │ │ FileUpload │ │   UrlInput   │ │    BibleInput      │  │ │   │
│  │  │  │  (paste)    │ │  (OCR)     │ │  (extract)   │ │  (Sefaria)         │  │ │   │
│  │  │  └─────────────┘ └─────┬──────┘ └──────┬───────┘ └────────┬───────────┘  │ │   │
│  │  │          │             │               │                  │              │ │   │
│  │  │          └─────────────┴───────────────┘                  │              │ │   │
│  │  │                        │ edge fn: gemini-translate        │ edge fn:     │ │   │
│  │  │                        │  /translate /define /ocr         │ sefaria-     │ │   │
│  │  │                        │  /extract-url                    │ fetch        │ │   │
│  │  │                                                                          │ │   │
│  │  │  PassageGenerator ──────────────────────────────────────── edge fn:      │ │   │
│  │  │                                                             generate-    │ │   │
│  │  │  WordDefinitionPopup ── reads word_definitions (direct DB) hebrew-passage│ │   │
│  │  └──────────────────────────────────────────────────────────────────────────┘ │   │
│  │                                                                               │   │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────────┐ │   │
│  │  │  VocabularyList  │  │    TestPanel     │  │         Dashboard            │ │   │
│  │  │  vocabulary_     │  │ select_test_words│  │  vocabulary_with_stats       │ │   │
│  │  │    with_stats    │  │   (RPC)          │  │  word_statistics             │ │   │
│  │  │  vocab_words     │  │ save_complete_   │  │  user_tests                  │ │   │
│  │  │  (CRUD)          │  │   test_results   │  │  (Recharts graphs)           │ │   │
│  │  │  bookmarks /     │  │   (RPC)          │  │                              │ │   │
│  │  │  bookmark_folders│  │  FlashcardTest   │  └──────────────────────────────┘ │   │
│  │  └──────────────────┘  │  MultipleChoice  │                                   │   │
│  │                        │  FillInBlank     │  ┌──────────────────────────────┐ │   │
│  │                        └──────────────────┘  │          Admin               │ │   │
│  │                                              │  api_usage_logs              │ │   │
│  │  ┌──────────────────┐                        │  monthly_spend_tracking      │ │   │
│  │  │  Contact page    │──edge fn:              │  admin_alerts  (read only)   │ │   │
│  │  │                  │  send-contact-email    │  api_pricing                 │ │   │
│  │  └──────────────────┘                        │  ad_config                   │ │   │
│  │                                              │  alert_thresholds            │ │   │
│  │  usePageTracking ──── log_page_view (RPC)    │  page_views_daily            │ │   │
│  │                        → page_views_daily    └──────────────────────────────┘ │   │
│  └───────────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────┬───────────────────────────────────────────────────────────┘
                           │  (supabase-js client, Bearer token or anon key)
                           ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                              SUPABASE PLATFORM                                       │
│                                                                                      │
│  ┌──────────────────────────────────────────────────────────────────────────────┐    │
│  │                        EDGE FUNCTIONS  (Deno)                                │    │
│  │                                                                              │    │
│  │  gemini-translate (verify_jwt: false)                                        │    │
│  │    POST /translate   → checks monthly_spend_tracking.api_enabled (circuit    │    │
│  │    POST /define        breaker), checks translation_cache / word_definitions │    │
│  │    POST /ocr           on miss → calls Gemini API → writes cache             │    │
│  │    POST /extract-url   checks gemini_api_rate_limits, writes api_usage_logs  │    │
│  │                                                                              │    │
│  │  generate-hebrew-passage (verify_jwt: false)                                 │    │
│  │    reads vocabulary_with_stats → calls Gemini → writes api_usage_logs        │    │
│  │    rate limits: gemini_api_rate_limits (3/hr, 10/day per user)               │    │
│  │                                                                              │    │
│  │  sefaria-fetch (verify_jwt: false)                                           │    │
│  │    reads/writes sefaria_cache (90-day TTL) → on miss: calls Sefaria API      │    │
│  │                                                                              │    │
│  │  send-contact-email (verify_jwt: false)                                      │    │
│  │    writes contact_submissions → calls Resend API directly                    │    │
│  │                                                                              │    │
│  │  send-notification-email (verify_jwt: false)                                 │    │
│  │    called via HTTP from notify_admin_alert() DB trigger → Resend API         │    │
│  │                                                                              │    │
│  │  dynamic-api (verify_jwt: true)  ← deployed, not referenced in client code   │    │
│  └──────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌──────────────────────────────────────────────────────────────────────────────┐    │
│  │                         PostgreSQL DATABASE                                  │    │
│  │                                                                              │    │
│  │  AUTH & USERS              LEARNING                  TESTING                 │    │
│  │  auth.users                vocabulary_words          user_tests              │    │
│  │  profiles                  word_statistics           test_responses          │    │
│  │  user_roles (app_role)     ─────────────────────                             │    │
│  │                            VIEW: vocabulary_with_stats                       │    │
│  │                            (vocab_words LEFT JOIN word_statistics)           │    │
│  │                                                                              │    │
│  │  BOOKMARKS                 CACHES                    CONFIG                  │    │
│  │  bookmarks                 translation_cache         app_config (key-value)  │    │
│  │  bookmark_folders          word_definitions          api_pricing             │    │
│  │  (self-referential)        sefaria_cache             ad_config               │    │
│  │                                                                              │    │
│  │  MONITORING & ADMIN                       CONTACTS                           │    │
│  │  api_usage_logs (5,978 rows)              contact_submissions                │    │
│  │  api_pricing                                                                 │    │
│  │  monthly_spend_tracking                                                      │    │
│  │  admin_alerts                                                                │    │
│  │  alert_thresholds                                                            │    │
│  │  page_views_daily                                                            │    │
│  │  gemini_api_rate_limits                                                      │    │
│  │                                                                              │    │
│  │  ── TRIGGERS ──────────────────────────────────────────────────────────────  │    │
│  │                                                                              │    │
│  │  api_usage_logs INSERT                                                       │    │
│  │    → monitor_api_usage()                                                     │    │
│  │        → calculate_monthly_spend()                                           │    │
│  │        → upserts monthly_spend_tracking                                      │    │
│  │        → check_spend_thresholds() × alert_thresholds rows                    │    │
│  │            → create_spend_alert() → INSERT admin_alerts                      │    │
│  │                → notify_admin_alert() trigger                                │    │
│  │                    → if send_email=true: HTTP POST send-notification-email   │    │
│  │                    → if circuit breaker threshold: api_enabled=false         │    │
│  │                        + INSERT admin_alerts (circuit_breaker_activated)     │    │
│  │                                                                              │    │
│  │  admin_alerts INSERT → notify_admin_alert() (see chain above)                │    │
│  │  Standard updated_at triggers on most tables                                 │    │
│  │                                                                              │    │
│  │  ── pg_cron JOBS ──────────────────────────────────────────────────────────  │    │
│  │  Hourly  (every :00)  cleanup_gemini_api_rate_limits()                       │    │
│  │  Daily   (3:00 AM)    cleanup_word_definitions_cache()   (30-day TTL)        │    │
│  │  Daily   (3:15 AM)    cleanup_translation_cache()        (30-day TTL)        │    │
│  │  Daily   (3:30 AM)    cleanup_sefaria_cache()            (90-day TTL)        │    │
│  └──────────────────────────────────────────────────────────────────────────────┘    │
└────────────────────────────┬─────────────────────┬───────────────────────────────────┘
                             │                     │
              ┌──────────────┘                     └──────────────┐
              ▼                                                    ▼
┌─────────────────────────┐   ┌──────────────┐   ┌───────────────────────────────────┐
│     Google Gemini API   │   │ Sefaria API  │   │          Resend Email API          │
│                         │   │              │   │                                    │
│  gemini-2.0-flash       │   │ Bible text & │   │  contact form → admin              │
│  (text, OCR, vision,    │   │ commentary   │   │  spend alerts → admin              │
│   thinking mode)        │   │ REST/JSON    │   │  From: noreply@learnivrit.com      │
│  prompt/candidate/      │   │ 90-day cache │   │                                    │
│  thinking token billing │   └──────────────┘   └───────────────────────────────────┘
└─────────────────────────┘
```

---

## Database Tables

| Table | Rows | Purpose |
|---|---|---|
| `profiles` | 5 | User display names and emails (mirrors auth.users) |
| `user_roles` | 1 | Role assignments (`admin` \| `user`) |
| `vocabulary_words` | 10 | User-saved Hebrew words with translations |
| `word_statistics` | 298 | Per-word test performance and confidence scores |
| `user_tests` | 6 | Test session summaries |
| `test_responses` | 80 | Individual question answers within a test |
| `word_definitions` | 17 | Gemini definition cache (30-day TTL) |
| `translation_cache` | 3,455 | Gemini translation cache (30-day TTL) |
| `sefaria_cache` | 117 | Sefaria Bible passage cache (90-day TTL) |
| `gemini_api_rate_limits` | 16 | Per-user rate limit tracking |
| `bookmarks` | 1 | Saved Hebrew text passages |
| `bookmark_folders` | 0 | Hierarchical folder structure for bookmarks |
| `api_usage_logs` | 5,978 | Token usage per Gemini API call (hashed user IDs) |
| `api_pricing` | 1 | Gemini model pricing rates |
| `monthly_spend_tracking` | 0 | Rolling monthly spend + circuit breaker state |
| `admin_alerts` | 0 | Spend threshold alerts |
| `alert_thresholds` | 3 | Configurable spend % thresholds |
| `page_views_daily` | 71 | Daily page view counts and active seconds |
| `contact_submissions` | 8 | Contact form messages |
| `ad_config` | 6 | Ad network configuration (versioned, JSONB) |
| `app_config` | 1 | Global key-value configuration |

## Views

| View | Definition |
|---|---|
| `vocabulary_with_stats` | `vocabulary_words` LEFT JOIN `word_statistics` on `word_id` + `user_id` |

## RPC Functions (client-callable)

| Function | Purpose |
|---|---|
| `select_test_words()` | Adaptive word selection by confidence score |
| `save_complete_test_results()` | Atomically saves test + responses + updates word_statistics |
| `log_page_view()` | Upserts daily page view counts |
| `delete_user_account()` | Full account deletion cascade |

## Edge Functions

| Function | JWT | Purpose |
|---|---|---|
| `gemini-translate` | No | Translation, definitions, OCR, URL extraction |
| `generate-hebrew-passage` | No | AI passage generation from weak vocabulary |
| `sefaria-fetch` | No | Bible passage retrieval with caching |
| `send-contact-email` | No | Saves contact form + emails admin via Resend |
| `send-notification-email` | No | Spend alert emails (called by DB trigger only) |
| `dynamic-api` | Yes | Deployed; not referenced in client code |

## Trigger Chain: Spend Monitoring

```
Gemini API call completes
  → edge fn writes api_usage_logs row
    → TRIGGER: monitor_api_usage()
        → calculate_monthly_spend()         (sums api_usage_logs × api_pricing)
        → UPSERT monthly_spend_tracking
        → check_spend_thresholds()          (compare against alert_thresholds)
            → create_spend_alert()
                → INSERT admin_alerts
                    → TRIGGER: notify_admin_alert()
                        → if metadata.send_email=true:
                            HTTP POST → send-notification-email → Resend API
                        → if activate_circuit_breaker=true:
                            UPDATE monthly_spend_tracking SET api_enabled=false
                            INSERT admin_alerts (circuit_breaker_activated)
```

Once `api_enabled=false`, all `gemini-translate` and `generate-hebrew-passage` calls
are blocked at the edge function level before reaching the Gemini API.
