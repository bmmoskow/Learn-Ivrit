import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import { createJsonResponse, createErrorResponse } from "./shared.ts";
import { PAYWALL_MARKERS, DEFINITIVE_PAYWALL_MARKERS, ARTICLE_TYPES } from "./config.ts";
import { APP_NAME, RESEND_API_URL, RESEND_FROM_ALERTS } from "../_shared/resend.ts";

// TLS_EXTRA_CA_CERT: PEM bundle of intermediate certs for CAs that sites commonly omit from
// their TLS chain. Concatenate multiple PEM certs to cover more than one CA.
// Included: GoDaddy G2, DigiCert SHA2, DigiCert TLS RSA 2020, GlobalSign RSA OV 2018, Sectigo RSA DV
// To add a cert: download the DER from the CA's repository, convert to PEM, append to the secret.
//   GoDaddy G2:   http://certificates.godaddy.com/repository/gdig2.crt
//                 SHA-256: 27:AC:93:69:FA:F2:52:07:BB:26:27:CE:FA:CC:BE:4E:F9:C3:19:B8:D4:55:2F:03:1B:A6:35:3F:28:B6:84:BA
//   DigiCert:     https://cacerts.digicert.com/DigiCertSHA2SecureServerCA.crt
//   DigiCert:     https://cacerts.digicert.com/DigiCertTLSRSASHA2562020CA1-1.crt
//   GlobalSign:   https://secure.globalsign.com/cacert/gsrsaovsslca2018.crt
//   Sectigo:      http://crt.sectigo.com/SectigoRSADomainValidationSecureServerCA.crt
// If a new site fails TLS even after retry, an alert email is sent with the failing URL.
async function sendTlsAlert(url: string, errorMsg: string): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const adminEmail = Deno.env.get("ADMIN_EMAIL");
  if (!apiKey || !adminEmail) return;
  try {
    await fetch(RESEND_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: RESEND_FROM_ALERTS,
        to: [adminEmail],
        subject: `[${APP_NAME}] TLS certificate alert — new intermediate cert may be needed`,
        text: `A URL failed with a TLS error even after retrying with the CA bundle.\n\nURL: ${url}\nError: ${errorMsg}\n\nYou may need to add the missing intermediate certificate to the TLS_EXTRA_CA_CERT secret.\nSee the comment in extract-url.ts for instructions.`,
        html: `<p>A URL failed with a TLS error even after retrying with the CA bundle.</p><p><strong>URL:</strong> ${url}</p><p><strong>Error:</strong> ${errorMsg}</p><p>You may need to add the missing intermediate certificate to the <code>TLS_EXTRA_CA_CERT</code> secret. See the comment in <code>extract-url.ts</code> for instructions.</p>`,
      }),
    });
  } catch {
    // Alert failure must not affect the main error response
  }
}

export function _isTlsError(err: unknown): boolean {
  const msg = String(err instanceof Error ? err.message : err).toLowerCase();
  return msg.includes("certificate") || msg.includes("tls") || msg.includes("ssl");
}

export function _parseCertBundle(bundle: string): string[] {
  return bundle
    .split("-----END CERTIFICATE-----")
    .map((s) => s.trim())
    .filter((s) => s.includes("-----BEGIN CERTIFICATE-----"))
    .map((s) => s + "\n-----END CERTIFICATE-----");
}

async function fetchWithCertFallback(url: string, headers: HeadersInit): Promise<Response> {
  try {
    return await fetch(url, { headers });
  } catch (err) {
    if (_isTlsError(err)) {
      const certBundle = Deno.env.get("TLS_EXTRA_CA_CERT");
      if (!certBundle) throw err;
      const msg = String(err instanceof Error ? err.message : err).toLowerCase();
      console.log("TLS error on first attempt, retrying with CA bundle:", msg);
      const certs = _parseCertBundle(certBundle);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = (Deno as any).createHttpClient({ caCerts: certs });
      try {
        return await fetch(url, { client, headers });
      } catch (retryErr) {
        if (_isTlsError(retryErr)) {
          await sendTlsAlert(url, String(retryErr instanceof Error ? retryErr.message : retryErr).toLowerCase());
        }
        throw retryErr;
      } finally {
        client.close();
      }
    }
    throw err;
  }
}

export interface ExtractUrlRequest {
  url: string;
}

export type ContentType = "article" | "recipe" | "job" | "faq" | "video" | "unsupported" | "unknown";

const RECIPE_TYPES = ["Recipe"];
const JOB_TYPES = ["JobPosting"];
const FAQ_TYPES = ["FAQPage"];
const VIDEO_TYPES = ["VideoObject", "TVEpisode", "Movie"];
const UNSUPPORTED_TYPES = ["Product", "ItemPage"];

function blockHasType(block: Record<string, unknown>, types: string[]): boolean {
  const t = block["@type"];
  if (typeof t === "string") return types.includes(t);
  if (Array.isArray(t)) return (t as string[]).some((x) => types.includes(x));
  return false;
}

export function _parseAllJsonLd(html: string): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];

  // Standard <script type="application/ld+json"> blocks
  const jsonLdMatches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const match of jsonLdMatches) {
    try {
      const parsed = JSON.parse(match[1]) as Record<string, unknown>;
      if (Array.isArray(parsed["@graph"])) {
        results.push(...(parsed["@graph"] as Record<string, unknown>[]));
      } else {
        results.push(parsed);
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  // Cloudflare Rocket Loader obfuscated JSON-LD (Maariv pattern):
  // self.__next_s.push([0,{"type":"application/ld+json","children":"..."}])
  const nextLdJsonPattern =
    /"type"\s*:\s*"application\/ld\+json"\s*,\s*"children"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let nextMatch;
  while ((nextMatch = nextLdJsonPattern.exec(html)) !== null) {
    try {
      const childrenStr = JSON.parse(`"${nextMatch[1]}"`);
      const parsed = JSON.parse(childrenStr) as Record<string, unknown>;
      if (Array.isArray(parsed["@graph"])) {
        results.push(...(parsed["@graph"] as Record<string, unknown>[]));
      } else {
        results.push(parsed);
      }
    } catch {
      // Ignore parse errors
    }
  }

  return results;
}

export function _detectContentType(blocks: Record<string, unknown>[]): ContentType {
  for (const block of blocks) {
    if (blockHasType(block, UNSUPPORTED_TYPES)) return "unsupported";
    if (blockHasType(block, RECIPE_TYPES)) return "recipe";
    if (blockHasType(block, JOB_TYPES)) return "job";
    if (blockHasType(block, FAQ_TYPES)) return "faq";
    if (blockHasType(block, VIDEO_TYPES)) return "video";
    if (blockHasType(block, ARTICLE_TYPES)) return "article";
  }
  return "unknown";
}

export function _extractArticleFromJsonLd(
  blocks: Record<string, unknown>[],
): { title?: string; description?: string; articleBody?: string; isAccessibleForFree?: string | boolean } {
  const result: { title?: string; description?: string; articleBody?: string; isAccessibleForFree?: string | boolean } = {};

  for (const block of blocks) {
    const isArticleType = blockHasType(block, ARTICLE_TYPES);
    if (isArticleType || block.articleBody) {
      if (!result.title) {
        result.title =
          (block.headline as string | undefined) || (block.name as string | undefined) || undefined;
      }
      if (!result.description) {
        result.description = (block.description as string | undefined) || undefined;
      }
      if (!result.articleBody) {
        result.articleBody = (block.articleBody as string | undefined) || undefined;
      }
      if (result.isAccessibleForFree === undefined && block.isAccessibleForFree !== undefined) {
        result.isAccessibleForFree = block.isAccessibleForFree as string | boolean;
      }
    }
    if (result.title && result.description && result.articleBody) break;
  }

  return result;
}

export function _extractRecipeBody(block: Record<string, unknown>): string {
  const parts: string[] = [];

  const ingredients = block.recipeIngredient as string[] | undefined;
  if (Array.isArray(ingredients) && ingredients.length > 0) {
    parts.push("מצרכים:\n" + ingredients.map(_decodeHtmlEntities).join("\n"));
  }

  const instructions = block.recipeInstructions;
  if (Array.isArray(instructions) && instructions.length > 0) {
    const steps = (instructions as (string | Record<string, unknown>)[])
      .map((step, i) => {
        if (typeof step === "string") return `${i + 1}. ${_decodeHtmlEntities(step)}`;
        if (step && typeof step === "object") {
          const text = (step as Record<string, unknown>).text as string | undefined;
          return text ? `${i + 1}. ${_decodeHtmlEntities(text)}` : "";
        }
        return "";
      })
      .filter(Boolean);
    if (steps.length > 0) {
      parts.push("הוראות הכנה:\n" + steps.join("\n\n"));
    }
  }

  return parts.join("\n\n");
}

export function _stripHtmlToText(html: string): string {
  let text = html;
  text = text.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "");
  text = text.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, "");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<\/div>/gi, "\n\n");
  text = text.replace(/<\/h[1-6]>/gi, "\n\n");
  text = text.replace(/<\/li>/gi, "\n");
  text = text.replace(/<[^>]+>/g, "");
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
  text = text.replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(Number(d)));
  text = text.replace(/&#x([0-9A-Fa-f]+);/g, (_m, h) => String.fromCharCode(parseInt(h, 16)));
  text = text.replace(/\n{3,}/g, "\n\n").trim();
  return text;
}

export function _extractJobBody(block: Record<string, unknown>): string {
  const desc = block.description as string | undefined;
  if (!desc) return "";
  return _stripHtmlToText(desc);
}

export function _extractFaqBody(block: Record<string, unknown>): string {
  const entities = block.mainEntity as Record<string, unknown>[] | undefined;
  if (!Array.isArray(entities)) return "";

  return entities
    .map((item) => {
      const question = _decodeHtmlEntities((item.name as string) || "");
      const answerData = item.acceptedAnswer as Record<string, unknown> | undefined;
      const answer = _decodeHtmlEntities((answerData?.text as string) || "");
      if (!question) return "";
      return `שאלה: ${question}\n\n${answer}`;
    })
    .filter((qa) => qa.trim())
    .join("\n\n---\n\n");
}

export function _extractVideoBody(block: Record<string, unknown>): string {
  const description = _decodeHtmlEntities((block.description as string) || "");
  return `[תיאור הסרטון בלבד — תוכן הוידאו אינו נגיש לחילוץ טקסט]\n\n${description}`;
}

function _decodeHtmlEntities(text: string): string {
  return text
    // Double-encoded entities (e.g. Drupal sometimes writes &amp;nbsp; / &amp;ldquo; in meta attributes)
    .replace(/&amp;nbsp;/g, " ")
    .replace(/&amp;quot;/g, '"')
    .replace(/&amp;apos;/g, "'")
    .replace(/&amp;ldquo;/g, "“")
    .replace(/&amp;rdquo;/g, "”")
    .replace(/&amp;lsquo;/g, "‘")
    .replace(/&amp;rsquo;/g, "’")
    .replace(/&amp;mdash;/g, "—")
    .replace(/&amp;ndash;/g, "–")
    .replace(/&amp;lt;/g, "<")
    .replace(/&amp;gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&ldquo;/g, "“")
    .replace(/&rdquo;/g, "”")
    .replace(/&lsquo;/g, "‘")
    .replace(/&rsquo;/g, "’")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…")
    .replace(/&bull;/g, "•")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9A-Fa-f]+);/g, (_m, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&"); // last so &amp;quot; => &quot;, not "
}

export function _normalizeArticleBody(articleBody: string): string {
  let text = _decodeHtmlEntities(articleBody);
  text = text.replace(/\r\n/g, "\n\n");
  text = text.replace(/(?<!\n)\n(?!\n)/g, "\n\n");
  text = text.replace(/ {2,}/g, "\n\n");
  text = text.replace(/\t+/g, "\n\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

export function _extractWithReadability(html: string): string | null {
  try {
    const { document } = parseHTML(html.replace(/<!--[\s\S]*?-->/g, ""));

    // Capture the article subtitle before any DOM removal.
    // ynet wraps the subtitle in <div class="subTitleWrapper"><h2>…</h2></div> inside a
    // container with role="header", which Readability penalises and excludes. We read it
    // first so we can re-inject it if Readability drops it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = document as any;
    let articleSubtitle: string | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subtitleEl: any = doc.querySelector(
      '[class*="subTitleWrapper"] h2, [class*="subtitleWrapper"] h2, h2[class*="subTitle"], h2[class*="subtitle"]',
    );
    if (subtitleEl) {
      const st = _decodeHtmlEntities((subtitleEl.textContent || "").trim());
      if (st.length > 10) articleSubtitle = st;
    }

    // Remove elements from the DOM before Readability runs so their text
    // can't bleed into the extracted article content
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    doc.querySelectorAll('[class*="paywall"],[id*="paywall"]').forEach((el: any) => el.remove());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    doc.querySelectorAll("h1,nav,header").forEach((el: any) => el.remove()); // title from metadata; nav/header are site chrome
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    doc.querySelectorAll(".video-holder").forEach((el: any) => el.remove()); // image/video embed wrappers (Sport5) — captions inside pollute article text
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    doc.querySelectorAll(".ex_list").forEach((el: any) => el.remove()); // sub-article navigation cards (Yad Vashem) — snippets from linked pages pollute body
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    doc.querySelectorAll(".messages").forEach((el: any) => el.remove()); // Drupal site-wide notices (upgrade banners, alerts)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    doc.querySelectorAll(".modal-body").forEach((el: any) => el.remove()); // Bootstrap modal dialogs (Drupal redirect notices, popups)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    doc.querySelectorAll('[class*="visible-False"]').forEach((el: any) => el.remove()); // ulpan-online app-level visibility flag — lesson-completion screens, hidden audio players

    const reader = new Readability(doc);
    const article = reader.parse();
    if (!article?.content) return null;

    // Remove non-article elements from Readability's cleaned HTML before stripping tags
    let text = article.content;
    text = text.replace(/<figure[\s\S]*?<\/figure>/gi, "");
    text = text.replace(/<figcaption[\s\S]*?<\/figcaption>/gi, "");

    // Remove <p> elements whose only content is <a> link text — related-article bullets
    // (e.g. Globes "● <a>title</a><br/>● <a>title</a>" pattern). These cause paragraph
    // count mismatches between source and translation in the synced display.
    text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (match, inner) => {
      const withoutLinks = inner.replace(/<a[\s\S]*?<\/a>/gi, "");
      const residual = withoutLinks
        .replace(/<[^>]+>/g, "")
        .replace(/&[#\w]+;/g, " ") // decode HTML entities (e.g. &#32;) to spaces before checking
        .replace(/[●•·\s]/g, "");
      return residual.length === 0 ? "" : match;
    });

    // Strip <li> elements whose content is entirely link text — same rationale as <p> above.
    // Catches promotional link-lists embedded in article bodies (e.g. Sport5 World Cup promo).
    text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (match, inner) => {
      const withoutLinks = inner.replace(/<a[\s\S]*?<\/a>/gi, "");
      const residual = withoutLinks
        .replace(/<[^>]+>/g, "")
        .replace(/&[#\w]+;/g, " ")
        .replace(/[●•·\s]/g, "");
      return residual.length === 0 ? "" : match;
    });

    // Convert block elements to paragraph breaks, then strip remaining tags
    text = text.replace(/<\/p>/gi, "\n\n");
    text = text.replace(/<\/h[1-6]>/gi, "\n\n"); // headings become their own paragraph blocks
    text = text.replace(/<\/li>/gi, "\n");
    text = text.replace(/<br\s*\/?>/gi, "\n");
    text = text.replace(/<[^>]+>/g, "");
    text = _decodeHtmlEntities(text);
    text = text.replace(/\r/g, ""); // strip carriage returns — Windows \r\n in source HTML breaks \n{3,} matching
    text = text.replace(/\n{3,}/g, "\n\n").trim();

    // Normalize each paragraph: collapse whitespace-only internal lines, then drop
    // standalone parenthetical photo credits like "(Photographer Name)".
    text = text.split("\n\n")
      .map((p) => p.replace(/[ \t]*\n[ \t]*/g, "\n").replace(/\n{2,}/g, "\n").trim())
      .filter((p) => p.length > 0 && !/^\([^)\n]{1,59}\)$/.test(p))
      .join("\n\n");

    // Prepend the captured subtitle if Readability excluded it (common on ynet where the
    // subtitle lives inside a role="header" container that Readability scores negatively).
    if (articleSubtitle) {
      // Strip punctuation/spaces for comparison so minor encoding differences don't break it
      const strip = (s: string) => s.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
      if (!strip(text).includes(strip(articleSubtitle.substring(0, 40)))) {
        text = articleSubtitle + "\n\n" + text;
      }
    }

    return text || null;
  } catch {
    return null;
  }
}

export function _extractTitleFromHtml(html: string): string | null {
  try {
    const { document } = parseHTML(html);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = document as any;
    // Prefer h1 scoped inside <article> — no DOM removal needed since <article>
    // already excludes site navigation. (Removing <header> first would also remove
    // article-level <header> elements that wrap the h1 on many news sites.)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let h1: any = doc.querySelector("article h1");
    if (!h1) {
      // Fallback: no <article> element — remove site chrome then take first h1
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      doc.querySelectorAll("header,nav").forEach((el: any) => el.remove());
      h1 = doc.querySelector("h1");
    }
    if (!h1) return null;
    const text = _decodeHtmlEntities((h1.textContent || "").trim());
    return text || null;
  } catch {
    return null;
  }
}

export function _hebrewDensity(text: string): number {
  // Hebrew letters (U+05D0–U+05EA) and nikud (U+05B0–U+05C7)
  const hebrewChars = (text.match(/[ְ-ׇא-ת]/g) || []).length;
  const totalNonSpace = (text.match(/[^\s\n]/g) || []).length;
  return totalNonSpace > 0 ? hebrewChars / totalNonSpace : 0;
}

export function _checkQualityGate(text: string, mode: ContentType): boolean {
  const density = _hebrewDensity(text);

  switch (mode) {
    case "article": {
      const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length >= 40);
      return paragraphs.length >= 3 && density >= 0.2;
    }
    case "recipe":
      return text.length >= 50 && density >= 0.1;
    case "job":
      return text.length >= 100 && density >= 0.15;
    case "faq":
      return text.includes("שאלה:") && density >= 0.15;
    case "video":
      return text.length >= 20 && density >= 0.1;
    default: {
      // "unknown" — Readability / heuristic fallback, slightly looser
      const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length >= 40);
      return paragraphs.length >= 2 && density >= 0.15;
    }
  }
}

export function _selectBestContent(
  readabilityContent: string | null,
  articleBodyContent: string | null,
  contentType: ContentType,
): string {
  const articleBodyPasses = !!articleBodyContent && _checkQualityGate(articleBodyContent, contentType);
  const readabilityPasses = !!readabilityContent && _checkQualityGate(readabilityContent, contentType);

  if (readabilityPasses && articleBodyPasses) {
    // Readability is semantically aware and filters captions/figures — prefer it unless
    // articleBody has substantially more content (suggesting Readability missed paragraphs)
    const articleBodyIsMuchLonger = articleBodyContent!.length > readabilityContent!.length * 1.5;
    return articleBodyIsMuchLonger ? articleBodyContent! : readabilityContent!;
  }
  if (readabilityPasses) return readabilityContent!;
  if (articleBodyPasses) return articleBodyContent!;
  // Neither passes quality gate — return whatever exists rather than nothing
  return readabilityContent || articleBodyContent || "";
}

export function _isDefinitePaywall(
  html: string,
  isAccessibleForFree?: string | boolean,
): boolean {
  if (isAccessibleForFree === "False" || isAccessibleForFree === false) return true;
  if (/(?:class|id)="[^"]*paywall[^"]*"/i.test(html)) return true;
  return DEFINITIVE_PAYWALL_MARKERS.some((marker) => html.includes(marker));
}

export function _buildContentWithPreamble(
  content: string,
  title: string,
): string {
  return title ? title + "\n\n" + content : content;
}

export function _detectPaywall(
  text: string,
  html?: string,
  isAccessibleForFree?: string | boolean,
): boolean {
  // Schema.org standard: isAccessibleForFree = "False" (string) or false (boolean)
  if (isAccessibleForFree === "False" || isAccessibleForFree === false) return true;
  // Common HTML pattern: paywall element identified by class or id attribute
  if (html && /(?:class|id)="[^"]*paywall[^"]*"/i.test(html)) return true;
  // Text-marker fallback: paywall phrases in extracted content or raw HTML
  // Check HTML too — the paywall UI is often stripped during extraction
  return PAYWALL_MARKERS.some((marker) => text.includes(marker) || (html || "").includes(marker));
}

export function _detectSpaShell(html: string): "spa" | "sparse" | null {
  const visibleText = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Empty React/Next.js mount point — definitive SPA signal.
  // id="app" intentionally excluded — too generic, used by many SSR news sites.
  if (
    /<div[^>]+id=["'](root|__next)["'][^>]*>\s*<\/div>/i.test(html) &&
    visibleText.length < 1000
  ) return "spa";

  // Explicit JS-required message in a noscript block (React/Angular style).
  // Plain "javascript" excluded — analytics noscripts use it too.
  for (const match of html.matchAll(/<noscript[^>]*>([\s\S]*?)<\/noscript>/gi)) {
    if (/enable javascript|javascript.*required|requires javascript/i.test(match[1])) return "spa";
  }

  // Extremely sparse visible text without the above SPA signals — page has too little content.
  if (visibleText.length < 200) return "sparse";

  return null;
}

export function _extractTextFromHtml(html: string): string {
  let text = html;

  // Try to find the main article content first
  const contentMatch = text.match(
    /<div[^>]*(?:class="[^"]*(?:article-body|ArticleBodyComponent|ArticleBody|post-content|entry-content|story-body)[^"]*"|id="[^"]*(?:ArticleBody|article-body|ArticleBodyComponent)[^"]*")[^>]*>([\s\S]*)<\/div>/i,
  );
  const articleMatch = text.match(/<article[^>]*>([\s\S]*)<\/article>/i);
  const mainMatch = text.match(/<main[^>]*>([\s\S]*)<\/main>/i);

  if (contentMatch) text = contentMatch[1];
  else if (articleMatch) text = articleMatch[1];
  else if (mainMatch) text = mainMatch[1];

  // Preserve paragraph structure from CMS editors
  text = text.replace(/<div[^>]*class="[^"]*text_editor_paragraph[^"]*"[^>]*>/gi, "\n\n");
  text = text.replace(/<div[^>]*data-block="true"[^>]*>/gi, "\n\n");

  // Remove noise elements
  text = text.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "");
  text = text.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, "");
  text = text.replace(/<nav[^>]*>([\s\S]*?)<\/nav>/gi, "");
  text = text.replace(/<header[^>]*>([\s\S]*?)<\/header>/gi, "");
  text = text.replace(/<footer[^>]*>([\s\S]*?)<\/footer>/gi, "");
  text = text.replace(/<aside[^>]*>([\s\S]*?)<\/aside>/gi, "");
  text = text.replace(/<form[^>]*>([\s\S]*?)<\/form>/gi, "");
  text = text.replace(/<figure[^>]*>([\s\S]*?)<\/figure>/gi, "");
  text = text.replace(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/gi, "");
  text = text.replace(/<img[^>]*>/gi, "");
  text = text.replace(/<picture[^>]*>([\s\S]*?)<\/picture>/gi, "");
  text = text.replace(
    /<div[^>]*class="[^"]*(?:caption|credit|photo|image|img|media|video|gallery|sidebar|related|comment|ad|advertisement|promo|banner|social|share|tags|breadcrumb|navigation|menu)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    "",
  );
  text = text.replace(
    /<span[^>]*class="[^"]*(?:caption|credit|photo|image)[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
    "",
  );
  text = text.replace(
    /<p[^>]*class="[^"]*(?:caption|credit|photo|image)[^"]*"[^>]*>([\s\S]*?)<\/p>/gi,
    "",
  );

  // Convert block elements to paragraph breaks
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<\/div>/gi, "\n\n");
  text = text.replace(/<\/h[1-6]>/gi, "\n\n");
  text = text.replace(/<\/li>/gi, "\n");
  text = text.replace(/<\/blockquote>/gi, "\n\n");
  text = text.replace(/<[^>]+>/g, "");

  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
  text = text.replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(Number(d)));
  text = text.replace(/&#x([0-9A-Fa-f]+);/g, (_m, h) => String.fromCharCode(parseInt(h, 16)));

  text = text.replace(/^[\s\S]*?<body[^>]*>/i, "");
  text = text.replace(/<\/body>[\s\S]*$/i, "");

  // Hebrew-specific noise filters
  const lines = text.split("\n");
  const filteredLines = lines.filter((line) => {
    const trimmed = line.trim();
    if (trimmed.length === 0) return true;
    if (trimmed.length < 15) return false;
    if (
      /^(תמונה|צילום|photo|credit|image|עקבו|הוספת תגובה|הדפסה|מצאתם טעות|מצאתם טעות\?)/i.test(
        trimmed,
      )
    )
      return false;
    if (/^(אין לשלוח|תגובות|כתבו לנו|המייל האדום)/i.test(trimmed)) return false;
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(trimmed)) return false;
    if (
      /^(ערוצי|ערוצים נוספים|אתרים נוספים|צור קשר|מדיניות|תנאי שימוש|מפת האתר)/i.test(trimmed)
    )
      return false;
    return true;
  });

  text = filteredLines.join("\n");
  text = text.replace(/\n\s*\n\s*\n+/g, "\n\n");
  text = text.replace(/\n(?=\s*[א-ת])/g, "\n\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

export async function handleExtractUrl(req: Request): Promise<Response> {
  const { url: targetUrl }: ExtractUrlRequest = await req.json();

  if (!targetUrl) {
    return createErrorResponse("URL is required", 400);
  }

  const trimmed = targetUrl.trim();
  if (!/^(https?:\/\/)?[\w.-]+\.[a-z]{2,}/i.test(trimmed)) {
    return createErrorResponse(
      "Invalid URL. Please enter a valid web address (e.g., https://www.example.com).",
      400,
    );
  }

  let urlToFetch = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;

  // Percent-encode non-ASCII characters in the path/query (e.g. Hebrew Wikipedia titles)
  try {
    urlToFetch = new URL(urlToFetch).toString();
  } catch {
    // keep urlToFetch as-is if URL parsing fails
  }

  console.log("Fetching URL:", urlToFetch);

  let response: Response;
  try {
    response = await fetchWithCertFallback(urlToFetch, {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "he,en-US;q=0.9,en;q=0.8",
    });
  } catch (fetchError) {
    console.error("Fetch error:", fetchError);
    return createErrorResponse(
      'Unable to reach this URL. The site may be temporarily unavailable. Try again later, or use the "Paste / Type" option to enter the text manually.',
      400,
    );
  }

  console.log("Response status:", response.status);

  if (!response.ok) {
    if (response.status === 404) {
      return createErrorResponse(
        "The page was not found. Please check the URL and try again.",
        404,
      );
    } else if (response.status === 403) {
      return createErrorResponse(
        'This website blocks automated text extraction. Try copying and pasting the article text manually using the "Paste / Type" option instead.',
        403,
      );
    } else if (response.status >= 500) {
      return createErrorResponse(
        "Server error while processing the URL. Please try again or use a different source.",
        502,
      );
    } else {
      return createErrorResponse(
        `Failed to fetch URL (${response.status}): ${response.statusText}`,
        response.status,
      );
    }
  }

  const html = await response.text();
  console.log("HTML length:", html.length);

  if (html.length < 100) {
    return createErrorResponse("Received too little content from the URL.", 422);
  }

  const spaReason = _detectSpaShell(html);
  if (spaReason) {
    console.log("SPA/sparse detection:", spaReason);
    if (spaReason === "sparse") {
      return createErrorResponse(
        'This page doesn\'t contain enough readable text to extract. Try a different page on this site, or use the "Paste / Type" option to enter the text manually.',
        422,
      );
    }
    return createErrorResponse(
      'This site loads content dynamically and cannot be extracted automatically. Please use the "Paste / Type" option instead.',
      422,
    );
  }

  // Parse all JSON-LD blocks and detect content type
  const jsonLdBlocks = _parseAllJsonLd(html);
  const contentType = _detectContentType(jsonLdBlocks);
  console.log("Content type detected:", contentType, "from", jsonLdBlocks.length, "JSON-LD blocks");

  // Extract metadata from OpenGraph / <title> as universal fallbacks
  const ogTitle = html.match(
    /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
  )?.[1];
  const htmlTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();

  let title = _decodeHtmlEntities(ogTitle || htmlTitle || "Untitled");
  let content = "";
  let paywallDetected = false;

  // Unsupported type: product/e-commerce pages produce only spec tables, not prose
  if (contentType === "unsupported") {
    return createErrorResponse(
      'This appears to be a product or e-commerce page. Try a news article, blog post, or editorial page instead.',
      422,
    );
  }

  // Recipe pages: assemble ingredients + instructions from JSON-LD
  if (contentType === "recipe") {
    const recipeBlock = jsonLdBlocks.find((b) => blockHasType(b, RECIPE_TYPES));
    if (recipeBlock) {
      title = _decodeHtmlEntities((recipeBlock.name as string) || "") || title;
      content = _extractRecipeBody(recipeBlock);
    }
  }

  // Job postings: extract HTML description field from JobPosting schema
  else if (contentType === "job") {
    const jobBlock = jsonLdBlocks.find((b) => blockHasType(b, JOB_TYPES));
    if (jobBlock) {
      const jobTitle = (jobBlock.title as string) || "";
      const org = jobBlock.hiringOrganization as Record<string, unknown> | undefined;
      const orgName = (org?.name as string) || "";
      title = orgName ? `${jobTitle} — ${orgName}` : jobTitle || title;
      content = _extractJobBody(jobBlock);
    }
  }

  // FAQ pages: format as Q&A pairs
  else if (contentType === "faq") {
    const faqBlock = jsonLdBlocks.find((b) => blockHasType(b, FAQ_TYPES));
    if (faqBlock) {
      title = ogTitle || htmlTitle || "שאלות ותשובות";
      content = _extractFaqBody(faqBlock);
    }
  }

  // Video pages: extract synopsis with user-facing note
  else if (contentType === "video") {
    const videoBlock = jsonLdBlocks.find((b) => blockHasType(b, VIDEO_TYPES));
    if (videoBlock) {
      title = _decodeHtmlEntities((videoBlock.name as string) || "") || title;
      const desc = (videoBlock.description as string) || "";
      if (desc.trim().length > 0) {
        content = _extractVideoBody(videoBlock);
      }
    }
  }

  // Article / unknown: always compare Readability and articleBody, pick the better one.
  // Even for definitive paywalls, Readability on the visible HTML typically beats a short
  // JSON-LD articleBody (e.g. Haaretz preview ≈ 300 chars). For client-side paywalls
  // (e.g. ynet) the full article is in the HTML anyway, so Readability wins cleanly.
  // Sites that put the full article in articleBody (more than 1.5× what Readability sees)
  // are still handled correctly by _selectBestContent's length threshold.
  else {
    const articleData = _extractArticleFromJsonLd(jsonLdBlocks);
    if (articleData.title) title = _decodeHtmlEntities(articleData.title);

    // In-page <h1> is the most accurate "on screen" title — prefer it over metadata
    const h1Title = _extractTitleFromHtml(html);
    if (h1Title) title = h1Title;

    if (_detectPaywall("", html, articleData.isAccessibleForFree)) paywallDetected = true;
    const articleBodyCandidate = articleData.articleBody
      ? _normalizeArticleBody(articleData.articleBody)
      : null;
    const readabilityCandidate = _extractWithReadability(html);
    content = _selectBestContent(readabilityCandidate, articleBodyCandidate, contentType);
    if (content) console.log("Content selected, length:", content.length);
  }

  // Quality gate for structured non-article types (recipe, job, faq, video)
  if (content && contentType !== "article" && contentType !== "unknown") {
    if (!_checkQualityGate(content, contentType)) {
      console.log("Quality gate failed for", contentType, "content, length:", content.length);
      content = "";
    }
  }

  // Paywall detection: sites return HTTP 200 with truncated preview + subscription prompt
  if (content && _detectPaywall(content, html)) {
    paywallDetected = true;
    console.log("Paywall detected in extracted content");
  }

  if (content) {
    content = _buildContentWithPreamble(content, title);
    console.log("Final content length:", content.length);
  }

  if (!content || content.length < 50) {
    if (paywallDetected) {
      return createErrorResponse(
        'This article appears to require a subscription. If you have access, try pasting the article text manually.',
        422,
      );
    }
    const typeHint =
      contentType === "video"
        ? "This appears to be a video page with no text synopsis available."
        : 'Failed to extract readable content from this page. The page might not contain an article, or it may be loading content dynamically. Try using the "Paste / Type" option instead.';
    return createErrorResponse(typeHint, 422);
  }

  return createJsonResponse({
    title,
    content,
    excerpt: content.substring(0, 200),
    paywallDetected,
  });
}
