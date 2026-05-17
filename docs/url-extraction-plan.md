# Hebrew URL Extraction: Research & Planning Document

**Date:** 2026-05-09 (revised)
**Branch:** ClaudeSetup
**Scope:** Research only — no code changes

---

## 1. Hebrew Website Inventory

> **Test URL notes:** All URLs below are real pages found via web search (May 2026). News article URLs may eventually be removed by publishers; evergreen pages (government, encyclopedias, academic) are expected to remain stable indefinitely. Two domain corrections uncovered during research: the Hebrew Times of Israel runs at `zman.co.il` (not `he.timesofisrael.com`), and N12 article content is served from `mako.co.il` (the `n12.co.il` domain is a SPA shell only).

### 1.1 Known Sources (Currently Supported)

| Site | URL | Content Type | Test URL | Extraction Notes |
|------|-----|--------------|----------|------------------|
| Ynet | ynet.co.il | News | https://www.ynet.co.il/news/article/bkngl8fvwg | Currently supported. Uses `ArticleBodyComponent` CSS class; JSON-LD `articleBody` uses 3+ spaces as paragraph separators. |
| Maariv | maariv.co.il | News | https://www.maariv.co.il/news/viral/article-1307134 | Currently supported. Cloudflare Rocket Loader rewrites `<script type="application/ld+json">` into `self.__next_s.push(...)` — handled by custom unescaping. |
| Haaretz | haaretz.co.il | News | https://www.haaretz.co.il/news/politics/2026-05-04/ty-article/.premium/0000019d-ef3d-de32-a1df-ffffc3f60000 | Hard paywall (`.premium` in URL): only subscribers see article body. Extraction returns truncated content silently — no 403. Good test case for paywall detection. |
| Zman Yisrael (Hebrew ToI) | zman.co.il | News | https://www.zman.co.il/663539/ | **Correction:** the Hebrew Times of Israel edition runs at `zman.co.il`, not `he.timesofisrael.com`. Clean static HTML, no paywall. Good extraction target. |

### 1.2 Additional Hebrew News Sites

| # | Site | URL | Test URL | Extraction Challenges |
|---|------|-----|----------|-----------------------|
| 1 | Walla | walla.co.il | https://news.walla.co.il/item/3834699 | Heavy client-side JS rendering; article body assembled by React after load, so raw fetch returns empty `<div>` shells. JSON-LD in `<head>` may survive. No paywall. |
| 2 | Globes | globes.co.il | https://www.globes.co.il/news/article.aspx?did=1001541793 | Soft paywall; JSON-LD `articleBody` contains only the free excerpt. Cookie-based session detection. |
| 3 | Calcalist | calcalist.co.il | https://www.calcalist.co.il/local_news/article/rkektilzwl | Same paywall pattern as Globes (same owner). JS-heavy. Financial tables not useful prose. |
| 4 | Israel Hayom | israelhayom.co.il | https://www.israelhayom.co.il/news/local/article/20337945 | Fully free. JS-rendered but JSON-LD present in `<head>` before hydration. `articleBody` reliable. Good target. |
| 5 | N12 | n12.co.il | https://www.mako.co.il/news-military/2026_q2/Article-1ce26da30d58d91027.htm | **Important:** N12 articles are served from `mako.co.il`, not `n12.co.il`. The `n12.co.il` domain is only the SPA shell — it delivers no article HTML. Users must submit a `mako.co.il` article URL directly. |
| 6 | Arutz 7 | inn.co.il | https://www.inn.co.il/news/690111 | Moderate JS. Standard `<article>` tags. JSON-LD and OpenGraph present. No paywall. Relatively clean extraction target. |
| 7 | Reshet 13 | 13tv.co.il | https://13tv.co.il/item/news/politics/security/u56qn-905077498/ | Full SPA shell; JSON-LD occasionally present in `<head>`. Low HTML extraction quality without JS rendering. |
| 8 | Wikipedia (Hebrew) | he.wikipedia.org | https://he.wikipedia.org/wiki/ירושלים | Static, no paywall, no bot detection. Consistent `#mw-content-text` container. Sections with `<h2>/<h3>` — no single article body. No JSON-LD `articleBody`. |
| 9 | Knesset | knesset.gov.il | https://main.knesset.gov.il/Activity/Legislation/Laws/pages/lawprimary.aspx?t=lawlaws&st=lawlawsbasic&lawitemid=2000046 | Legacy government HTML. Mix of table-based layout and semantic markup depending on subsection. PDFs are primary document format; HTML pages are summaries. |
| 10 | Sport5 | sport5.co.il | https://www.sport5.co.il/articles.aspx?FolderID=413&docID=527982 | JS-heavy for live score pages. Editorial articles are server-rendered with JSON-LD. Live match pages have no extractable prose — distinguishing article from scoreboard pages is needed. |

### 1.3 Non-News Hebrew Sites (New)

| # | Site | URL | Category | Test URL | Extraction Challenges |
|---|------|-----|----------|----------|-----------------------|
| 1 | Academy of the Hebrew Language | hebrew-academy.org.il | Education / Linguistics | https://hebrew-academy.org.il/topic/hahlatot/missingvocalizationspelling/ | Mostly static HTML. Content is scholarly decisions on Hebrew usage — well-structured, good extraction target. No JSON-LD `articleBody`; `WebPage` type. Infoboxes and structured term entries require filtering from prose. |
| 2 | Israeli Government Portal | gov.il | Government / Services | https://www.gov.il/he/service/driving_license_renewal | Unified government CMS. Pages are service guides with steps, links, and form references — not narrative articles. JSON-LD type is `GovernmentService` or `WebPage`. Content is actionable steps, not prose. Readability extracts something useful but the user should expect structured steps, not flowing text. |
| 3 | Tapuz | tapuz.co.il | Community Forums | https://www.tapuz.co.il/threads/אשכול-זכרונות-ילדות-חזקים-ואותנטים-מבית-אבא.12025334/ | Highly fragmented: original post + paginated reply threads. No concept of a single article body. Timestamps, user info, and quoted replies interleave with content. Only the first page is reachable with a single fetch. No JSON-LD. Forum-type content is the most mismatched with the app's article translation use case. |
| 4 | ZAP | zap.co.il | E-commerce / Price Comparison | https://www.zap.co.il/compmodels.aspx?modelid=849318 | Product specs displayed as structured data tables, not prose. Description field (if any) is short marketing copy. No JSON-LD `articleBody`. Content type (`Product` / `ItemPage`) doesn't map to article extraction. Readability will likely pick up spec tables as text. Fundamentally not an article-extraction use case. |
| 5 | Drushim | drushim.co.il | Job Board | https://www.drushim.co.il/job/36876191/8043c0df/ | Job postings have a prose description field — genuinely extractable. JSON-LD `JobPosting` type present on many listings, with a `description` field. However `description` is often raw HTML that needs stripping. Location, salary, and company info are metadata, not body text. |
| 6 | Yad Vashem | yadvashem.org | Education / Memorial | https://www.yadvashem.org/he/holocaust/about.html | Extensive, well-written Hebrew educational content. Static HTML. Strong semantic structure with `<article>` and `<main>`. No paywall. Excellent extraction candidate — long-form prose in clean HTML. OpenGraph metadata present; JSON-LD type `WebPage`. |
| 7 | Mako (Food & Recipes) | mako.co.il | Recipes / Lifestyle | https://www.mako.co.il/food-cooking_magazine/Article-a984537aa247b41006.htm | Dual structure: narrative blog introduction + structured recipe list. JSON-LD `Recipe` type present on dedicated recipe pages with `recipeIngredient` and `recipeInstructions` fields. Article-format pages like this test URL use standard `Article` JSON-LD. Readability captures prose well; recipe-specific structured data requires the Recipe extractor path. |

### 1.4 Children's & Hebrew Learning Sites (New)

| # | Site | URL | Category | Test URL | Extraction Challenges |
|---|------|-----|----------|----------|-----------------------|
| 1 | HaMatzav | hamatzav.co.il | Children's news | https://hamatzav.co.il/9-11/article/682 | Clean article structure with very short, simple paragraphs for ages 6–14. No paywall, no JS rendering. Excellent extraction target — arguably the easiest site on this list. Quality gate (≥3 paragraphs × ≥40 chars) passes comfortably; paragraphs are short by adult standards but numerous. Nikud (vowel marks) may appear in titles. |
| 2 | Kan Kids | kankids.org.il | Children's educational TV | https://www.kankids.org.il/content/kids/kids-podcasts/p-432148/433302/ | Primarily a video platform. Per-episode pages have a title and a 1–2 sentence synopsis — no article body. JSON-LD type is `VideoObject` or `TVEpisode`, not `Article`. Readability scores these pages very low (too much navigation, too little prose). Quality gate will reject most pages as too sparse. The synopsis is the only extractable text. |
| 3 | Ulpan Online | ulpan-online.com | Hebrew learning / Ulpan | https://www.ulpan-online.com/document/68349,7499,167.aspx | Lesson pages mix Hebrew prose content with English UI labels, navigation, and instructions. Interactive fill-in-the-blank exercises and conjugation tables render as blank inputs and garbled columns in extracted text. The Hebrew lesson body (reading passages, dialogues) is extractable, but Readability must compete with surrounding English UI. Hebrew density on the full HTML may be low; density should be measured on the extracted body only. |
| 4 | Kan Lomdim | kanlomdim.co.il | School curriculum / Hebrew language arts | https://www.kanlomdim.co.il/%D7%97%D7%95%D7%9E%D7%A8%D7%99-%D7%9C%D7%99%D7%9E%D7%95%D7%93/%D7%A7%D7%98%D7%92%D7%95%D7%A8%D7%99%D7%94/%D7%A2%D7%91%D7%A8%D7%99%D7%AA-%D7%9C%D7%9B%D7%99%D7%AA%D7%94-%D7%91 | Resource-index site: HTML pages are structured lists of links to downloadable PDF worksheets and tests — the prose is in the PDFs, not the HTML. Each category page has almost no extractable body text. This is a content-in-files pattern (similar to Knesset PDFs) that the extractor cannot reach. Quality gate will reject correctly, but should surface a clearer error message. |
| 5 | Kolzchut | kolzchut.org.il | Accessible Hebrew / Immigrants' rights | https://www.kolzchut.org.il/he/%D7%9E%D7%99%D7%9E%D7%95%D7%9F_%D7%9C%D7%99%D7%9E%D7%95%D7%93%D7%99_%D7%94%D7%A9%D7%A4%D7%94_%D7%94%D7%A2%D7%91%D7%A8%D7%99%D7%AA_%D7%91%D7%90%D7%95%D7%9C%D7%A4%D7%9E_%D7%9C%D7%A2%D7%95%D7%9C%D7%99%D7%9D_%D7%97%D7%93%D7%A9%D7%99%D7%9D | Wikipedia-style civic information site, written in deliberately simplified Hebrew for new immigrants and Hebrew learners. Static HTML, no paywall, excellent semantic structure. JSON-LD type `WebPage`. Heavy internal cross-links and "see also" boxes may appear in extracted text. Short factual sentences, not flowing prose — quality gate passes but paragraphs are terse. One of the cleaner extraction targets. |

### 1.5 Cross-Cutting Challenges (Revised)

**From news sites:**
- **Client-side JS rendering** (Walla, N12, Reshet 13, Sport5 live): raw fetch returns a skeleton — no extraction possible without JS execution.
- **Paywalls** (Haaretz, Globes, Calcalist): silently return HTTP 200 with truncated content — no error raised, but user gets a stub.
- **Cloudflare** (beyond Rocket Loader): JS challenge pages on first request; current browser-like `User-Agent` mitigates but does not eliminate this.

**From non-news sites:**
- **Non-article content types**: Product pages (ZAP), forum threads (Tapuz), and live scoreboards (Sport5) have no single prose body. Extraction produces garbage or noise, not readable text.
- **Structured-data content**: Recipes (Mako) and job postings (Drushim) encode their primary content in JSON-LD fields (`recipeIngredient`, `recipeInstructions`, `JobPosting.description`) that the current strategy ignores — it only reads `articleBody`.
- **Step-based government content**: gov.il pages use numbered guide steps, not narrative paragraphs. Readability can extract these, but the quality gate (paragraph count) may reject them because each step is short.
- **Forum pagination**: Tapuz and similar sites continue content across pages; a single-URL fetch captures only page 1 of a thread.
- **Low Hebrew density on mixed pages**: E-commerce and job pages may have high proportions of English brand names, model numbers, and technical terms.

**New challenges revealed by children's and learning sites:**
- **Video-primary pages** (Kan Kids): JSON-LD type `VideoObject` or `TVEpisode` — no `articleBody`, only a short synopsis. The quality gate correctly rejects these as too sparse, but the error message should indicate *why* (video page, not a text article). Without a specific handler, the user gets a generic "failed to extract" error.
- **Content in downloadable files** (Kan Lomdim): Hebrew learning worksheets and grammar exercises live inside PDF files linked from index pages. The HTML itself has no prose body. This is the same pattern as Knesset PDFs — recognisably a resource-index page, not extractable as prose.
- **Mixed-language learning pages** (Ulpan Online): English UI surrounds Hebrew lesson content. The Hebrew density check must be applied to the Readability-extracted body, not the full raw HTML — otherwise the English navigation drags the density below threshold and the valid Hebrew lesson content is incorrectly rejected.
- **Interactive exercise elements** (Ulpan Online): Fill-in-the-blank inputs, conjugation tables, and vocabulary drills are part of the lesson page but cannot be rendered as prose. Readability strips these elements, leaving only the surrounding explanatory text — which may itself be sparse. The extracted text is a partial lesson, not the full exercise.
- **Nikud (vowel marks)** (children's sites, ulpan): Simplified Hebrew for beginners often uses full nikud. Nikud characters (U+05B0–U+05C7) are within the Hebrew Unicode block and are already counted by the `[א-ת]` range in the Hebrew density check. No code change needed — noted here as a confirmed non-issue.

---

## 2. General-Purpose Extraction Strategy (Revised)

The original strategy assumed all content is a news-article-style prose body. The non-news sites reveal that this assumption breaks for product pages, forums, recipes, job postings, and government guides. The revised strategy introduces a content-type detection step and specific handling for the JSON-LD types that appear on non-news sites.

### 2.1 Core Principle: Type-Aware Cascading Extraction

```
Step 0 — Detect content type (from JSON-LD @type or page signals)
  ↓
Step 1 — Type-specific structured data extraction
  ↓ (if quality gate passes)
  → Done
  ↓ (if not)
Step 2 — Readability-based semantic HTML extraction
  ↓ (if quality gate passes)
  → Done
  ↓ (if not)
Step 3 — Heuristic HTML extraction (current approach, as last resort)
  ↓
Step 4 — Post-extraction validation and user-facing error routing
```

The addition of Step 0 is the most significant change from v1. Different JSON-LD types require different field mapping — not all useful content lives in `articleBody`.

### 2.2 Step 0 — Content Type Detection

Parse the first JSON-LD block found and inspect `@type`. Map it to one of four extraction modes:

| JSON-LD `@type` | Mode | Primary fields |
|-----------------|------|----------------|
| `NewsArticle`, `Article`, `ReportageNewsArticle`, `BlogPosting`, `TechArticle` | **Article** | `headline`, `description`, `articleBody` |
| `WebPage`, `GovernmentService`, `AboutPage` | **Article** (fallback to Readability) | `name` as title, no `articleBody` expected |
| `Recipe` | **Recipe** | `name`, `description`, `recipeIngredient`, `recipeInstructions` |
| `JobPosting` | **Job** | `title`, `hiringOrganization.name`, `description` (HTML) |
| `FAQPage` | **FAQ** | `mainEntity[].name` + `mainEntity[].acceptedAnswer.text` |
| `VideoObject`, `TVEpisode`, `Movie` | **Video synopsis** | `name` as title, `description` as body — with user-facing note |
| `Product`, `ItemPage` | **Unsupported** | Warn user and skip extraction |
| Not found / unknown | **Article** (standard cascade) | Attempt Readability |

**Unsupported type handling:** For `Product` and `ItemPage`, surface a user-facing message immediately: *"This appears to be a product page. Try a news article, blog post, or editorial page instead."* This avoids returning spec-table noise as "content."

**Video synopsis mode:** For `VideoObject`, `TVEpisode`, and `Movie`, extract `name` as the title and `description` as the body — then prepend a note to the extracted content: *"[תיאור הסרטון בלבד — תוכן הוידאו אינו נגיש לחילוץ טקסט]"* (Video description only — video content is not accessible for text extraction). This is better than a hard failure, since the synopsis may itself be useful Hebrew text to translate.

**Forum detection:** No JSON-LD type signals a forum thread reliably. Use a heuristic: if the page has no `<article>` tag and the content density of individual comment `<div>` elements exceeds that of any single block, flag it as a forum and warn: *"This appears to be a forum thread. Only the first page can be extracted and content from multiple authors will be merged."*

### 2.3 Step 1 — Type-Specific Structured Data Extraction

**Article mode** (unchanged from v1, with additions):
- Parse JSON-LD: `headline` → title, `description` → description, `articleBody` → body.
- Also accept `name` as title fallback for `WebPage` and `GovernmentService` types.
- Handle Cloudflare Rocket Loader obfuscation (already done for Maariv).
- OpenGraph `og:title` / `og:description` as metadata fallbacks.

**Recipe mode** (new):
- Title: `name`
- Description: `description`
- Body: join `recipeIngredient` array with `\n` (ingredient list), then `\n\n`, then join `recipeInstructions` steps with `\n\n`. If `recipeInstructions` contains `HowToStep` objects, extract the `.text` field of each.
- Result is: ingredients block + instructions block — a readable, translatable body.

**Job mode** (new):
- Title: `title` (job title) + optionally append ` — ` + `hiringOrganization.name`
- Description: omit (there is no separate description field)
- Body: `description` field, which is typically raw HTML — strip tags using the same heuristic HTML cleaner used in Step 3. `</p>`, `</li>` → `\n\n`.

**FAQ mode** (new, useful for gov.il help pages):
- Title: page `<title>` tag or `og:title`
- Body: for each FAQ item, format as `שאלה: [question]\n\n[answer]` joined with `\n\n`.

### 2.4 Step 2 — Readability-Based Semantic HTML

This is unchanged from v1. Mozilla Readability (via `deno-dom`) is the replacement for the hand-rolled HTML parser. It generalises across:
- Long-form educational content (Yad Vashem, Hebrew Academy)
- Government guide pages (gov.il) — step-list content extracts as paragraphs
- Wikipedia sections — main content area scored highest by Readability
- Blog posts and editorials not covered by structured data

**Output format (preserving current contract):**
- Title: `article.title`, falling back to Level 1 title or `<title>` tag.
- Description: `article.excerpt` (auto-generated first sentence) if no `og:description`.
- Body: `article.content` (cleaned HTML) — strip tags, convert `</p>`, `</h2>`, `</h3>` → `\n\n`.

**Deno compatibility:** Readability is a pure DOM library. Use alongside `linkedom` or `deno-dom` as a lightweight HTML parser. No browser required.

### 2.5 Step 3 — Heuristic HTML Fallback

Keep the current `extractTextFromHtml` for pages that pass neither structured data nor Readability's scoring threshold. This includes very short pages, legacy government HTML (Knesset), and pages without a dominant content block.

Hebrew-specific noise filters (תמונה, צילום, עקבו, etc.) remain here as a safety net.

### 2.6 Quality Gate (Revised)

The v1 quality gate (≥ 3 paragraphs of ≥ 40 characters, ≥ 20% Hebrew) is too strict for some non-news content types. Revise per mode:

| Mode | Minimum content | Hebrew threshold |
|------|----------------|-----------------|
| Article | ≥ 3 paragraphs × ≥ 40 chars | ≥ 20% Hebrew |
| Recipe | ≥ 3 ingredients OR ≥ 2 instruction steps | ≥ 10% Hebrew (ingredient names may be transliterations) |
| Job | ≥ 1 block × ≥ 100 chars | ≥ 15% Hebrew (may contain English brand names) |
| FAQ | ≥ 1 Q&A pair | ≥ 15% Hebrew |
| Video synopsis | ≥ 1 sentence (any length) | ≥ 10% Hebrew (titles may be transliterated show names) |
| Readability / Heuristic | ≥ 2 paragraphs × ≥ 40 chars | ≥ 15% Hebrew |

**Hebrew density measurement scope:** Apply the density check to the **extracted body text only**, not the raw HTML. This is critical for mixed-language learning sites (e.g. Ulpan Online) where the full HTML may be ≤15% Hebrew due to English UI navigation, but the Readability-extracted content is >80% Hebrew lesson text. Measuring density on raw HTML would incorrectly reject valid lesson pages.

### 2.7 Content Decision Logic

```
detect contentType from JSON-LD @type

if contentType == "Unsupported":
    → return error: "This page type cannot be extracted"

if contentType == "Recipe":
    body = join(recipeIngredient) + "\n\n" + join(recipeInstructions)
    if passes Recipe quality gate: → done

if contentType == "Job":
    body = strip_html(JobPosting.description)
    if passes Job quality gate: → done

if contentType == "FAQ":
    body = flatten(FAQPage.mainEntity)
    if passes FAQ quality gate: → done

# Default: Article mode (includes WebPage, GovernmentService, unknown)
if articleBody present and passes Article quality gate:
    body = normalizeArticleBody(articleBody)
    → done

if Readability(html) passes Article/Readability quality gate:
    body = readabilityResult.content
    → done

body = extractTextFromHtml(html)  # Level 3 heuristic
if body passes Readability quality gate:
    → done

→ return error: "Failed to extract readable content"

# Always: prepend title and description if not already in body
```

### 2.8 Handling JavaScript-Rendered Pages

Unchanged from v1 — a plain server-side `fetch()` cannot execute JavaScript.

| Option | Pros | Cons |
|--------|------|------|
| **Accept the limitation** (current approach) | Zero complexity, no cost | Silently fails for JS-heavy sites |
| **Headless browser in Edge Function** | Handles all JS-rendered content | Infeasible: Supabase Edge Function timeout and memory limits |
| **Third-party rendering API** | Outsources JS rendering | External dependency, per-request cost, new secret |

**Recommendation:** Keep accepting the limitation, but surface it explicitly. Maintain a fast-fail domain list for known SPA-only sites (Walla, N12, Reshet 13) that skips the fetch entirely and returns: *"This site loads content dynamically and cannot be extracted automatically. Please use the Paste / Type option instead."*

The non-news sites add no new sites to this fast-fail list. Children's sites (HaMatzav, Kan Kids) and learning sites (Ulpan Online, Kolzchut) are either static or partially server-rendered — the HTML fetch succeeds. Kan Kids is a different failure mode: the HTML arrives fine, but the content is a video player with a short synopsis. That is handled by the `VideoObject` content type path (Section 2.2), not by fast-fail.

### 2.9 Paywall Detection

Unchanged from v1. After extraction, scan the body for Hebrew paywall markers:

`מנויים`, `לקריאת הכתבה המלאה`, `התחברו כמנויים`, `הירשמו לקריאה`

Return: *"This article is behind a paywall. Only a preview is available."*

---

## 3. Codebase Review: Where Should This Logic Live?

### 3.1 Current Architecture

```
Client (React)               Supabase Edge Function
─────────────────            ──────────────────────────────────────
useTranslationPanel.ts       gemini-translate/index.ts  (dispatcher)
  └─ loadFromUrl()             └─ handleExtractUrl()
       ├─ sefaria_cache          extract-url.ts
       │   (cache check)           ├─ extractArticleStructuredData()
       └─ fetch /extract-url       ├─ extractTextFromHtml()
                                   └─ normalizeArticleBody()
```

### 3.2 Security: What Must Stay Server-Side

URL extraction requires **no secret keys** — it is a plain `fetch()` of a public webpage. The reason it lives in the Edge Function is **CORS**: browsers block cross-origin requests. This is correct and should not change.

### 3.3 Scalability: Client-Side Offload Opportunities

Extraction is CPU-light. The bottleneck is the outbound `fetch()`. No further client-side offload is beneficial beyond what is already in place:
- Request deduplication via `requestDeduplicator.ts`.
- Cache check first via `sefaria_cache`.

### 3.4 File Structure Recommendation

The current single-file `extract-url.ts` (393 lines) will grow significantly with type-aware extraction. Split it:

| File | Responsibility |
|------|---------------|
| `extract-url.ts` | `handleExtractUrl()` — orchestration, fetch, response assembly |
| `extraction/detect-type.ts` | Content type detection from JSON-LD `@type` |
| `extraction/structured-data.ts` | Article / Recipe / Job / FAQ JSON-LD extraction |
| `extraction/readability.ts` | Readability-based HTML extraction (new) |
| `extraction/heuristic.ts` | Current `extractTextFromHtml` as fallback |
| `extraction/normalize.ts` | `normalizeArticleBody`, paragraph normalisation, Hebrew noise filters |
| `extraction/quality-gate.ts` | Per-mode quality gate checks and Hebrew density measurement |

### 3.5 Architectural Flag: Is There a Better Approach?

**The current architecture is sound.** No structural change is needed.

The main substantive improvement within the current architecture is replacing the hand-rolled HTML parser with Mozilla Readability (same idea, battle-tested implementation) and adding type-aware structured data extraction for `Recipe`, `JobPosting`, and `FAQPage` types. Both are in-place improvements to `extract-url.ts`.

---

## 4. Summary of Recommendations

| Priority | Recommendation |
|----------|---------------|
| **High** | Integrate Mozilla Readability (via `deno-dom`) as Level 2, replacing the hand-rolled HTML parser |
| **High** | Add content type detection (Step 0) and type-specific extraction for `Recipe`, `JobPosting`, `FAQPage`, `VideoObject`/`TVEpisode` |
| **High** | Add paywall marker detection with a user-facing error |
| **High** | Add `Product` / `ItemPage` unsupported-type early exit with user-facing message |
| **High** | Apply Hebrew density check to the extracted body, not raw HTML — fixes false rejections on mixed-language learning pages |
| **Medium** | Revise quality gate thresholds per content type (looser for recipes, jobs, and video synopses) |
| **Medium** | Add fast-fail domain list for known SPA-only sites (Walla, N12, Reshet 13) |
| **Medium** | Extend JSON-LD `ARTICLE_TYPES` to include `BlogPosting`, `TechArticle`, `WebPage`, `GovernmentService` |
| **Medium** | For `VideoObject`/`TVEpisode` pages, return synopsis with a Hebrew-language note explaining only the description was extracted |
| **Low** | Add forum detection heuristic with a user-facing warning |
| **Low** | For resource-index pages (Kan Lomdim pattern), detect and surface a specific error: *"This page links to downloadable files. There is no readable text to extract."* |
| **Low** | Split `extract-url.ts` into the sub-module structure above |
| **Low** | Consider separating `text-extract` into its own Edge Function, independent of `gemini-translate` |
| **Not recommended** | Headless browser / Puppeteer in Edge Functions — infeasible given Supabase timeout and memory limits |
| **Not recommended** | Any client-side HTML fetching or parsing — CORS makes this impossible for cross-origin URLs |
