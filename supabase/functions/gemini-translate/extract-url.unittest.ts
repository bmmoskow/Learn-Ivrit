import { describe, it, expect } from "vitest";
import {
  _parseAllJsonLd,
  _detectContentType,
  _extractArticleFromJsonLd,
  _extractRecipeBody,
  _extractJobBody,
  _extractFaqBody,
  _extractVideoBody,
  _normalizeArticleBody,
  _extractTitleFromHtml,
  _extractWithReadability,
  _hebrewDensity,
  _checkQualityGate,
  _selectBestContent,
  _buildContentWithPreamble,
  _isDefinitePaywall,
  _detectPaywall,
  _detectSpaShell,
  _stripHtmlToText,
  _extractTextFromHtml,
  _isTlsError,
  _parseCertBundle,
} from "./extract-url.ts";

// ---------------------------------------------------------------------------
// _parseAllJsonLd
// ---------------------------------------------------------------------------

describe("_parseAllJsonLd", () => {
  it("returns empty array for HTML with no JSON-LD", () => {
    expect(_parseAllJsonLd("<html><body><p>hello</p></body></html>")).toEqual([]);
  });

  it("parses a standard script block", () => {
    const html = `
      <script type="application/ld+json">
        {"@type":"NewsArticle","headline":"כותרת","articleBody":"גוף המאמר"}
      </script>`;
    const blocks = _parseAllJsonLd(html);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]["@type"]).toBe("NewsArticle");
    expect(blocks[0]["headline"]).toBe("כותרת");
  });

  it("flattens @graph arrays", () => {
    const html = `
      <script type="application/ld+json">
        {"@context":"https://schema.org","@graph":[{"@type":"WebSite"},{"@type":"NewsArticle","headline":"כותרת"}]}
      </script>`;
    const blocks = _parseAllJsonLd(html);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]["@type"]).toBe("WebSite");
    expect(blocks[1]["@type"]).toBe("NewsArticle");
  });

  it("parses multiple script blocks", () => {
    const html = `
      <script type="application/ld+json">{"@type":"WebSite"}</script>
      <script type="application/ld+json">{"@type":"NewsArticle","headline":"כותרת"}</script>`;
    const blocks = _parseAllJsonLd(html);
    expect(blocks).toHaveLength(2);
  });

  it("ignores invalid JSON blocks without throwing", () => {
    const html = `
      <script type="application/ld+json">{ invalid json }</script>
      <script type="application/ld+json">{"@type":"Article"}</script>`;
    const blocks = _parseAllJsonLd(html);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]["@type"]).toBe("Article");
  });

  it("parses Cloudflare Rocket Loader obfuscated JSON-LD", () => {
    const inner = JSON.stringify({ "@type": "NewsArticle", "headline": "מבחן" });
    const escaped = inner.replace(/"/g, '\\"');
    const html = `self.__next_s.push([0,{"type":"application/ld+json","children":"${escaped}"}])`;
    const blocks = _parseAllJsonLd(html);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]["@type"]).toBe("NewsArticle");
    expect(blocks[0]["headline"]).toBe("מבחן");
  });
});

// ---------------------------------------------------------------------------
// _detectContentType
// ---------------------------------------------------------------------------

describe("_detectContentType", () => {
  it("returns 'unknown' for empty blocks", () => {
    expect(_detectContentType([])).toBe("unknown");
  });

  it("detects NewsArticle as 'article'", () => {
    expect(_detectContentType([{ "@type": "NewsArticle" }])).toBe("article");
  });

  it("detects Article as 'article'", () => {
    expect(_detectContentType([{ "@type": "Article" }])).toBe("article");
  });

  it("detects WebPage as 'article'", () => {
    expect(_detectContentType([{ "@type": "WebPage" }])).toBe("article");
  });

  it("detects BlogPosting as 'article'", () => {
    expect(_detectContentType([{ "@type": "BlogPosting" }])).toBe("article");
  });

  it("detects Recipe as 'recipe'", () => {
    expect(_detectContentType([{ "@type": "Recipe" }])).toBe("recipe");
  });

  it("detects JobPosting as 'job'", () => {
    expect(_detectContentType([{ "@type": "JobPosting" }])).toBe("job");
  });

  it("detects FAQPage as 'faq'", () => {
    expect(_detectContentType([{ "@type": "FAQPage" }])).toBe("faq");
  });

  it("detects VideoObject as 'video'", () => {
    expect(_detectContentType([{ "@type": "VideoObject" }])).toBe("video");
  });

  it("detects TVEpisode as 'video'", () => {
    expect(_detectContentType([{ "@type": "TVEpisode" }])).toBe("video");
  });

  it("detects Product as 'unsupported'", () => {
    expect(_detectContentType([{ "@type": "Product" }])).toBe("unsupported");
  });

  it("detects ItemPage as 'unsupported'", () => {
    expect(_detectContentType([{ "@type": "ItemPage" }])).toBe("unsupported");
  });

  it("handles array @type field", () => {
    expect(_detectContentType([{ "@type": ["WebPage", "Article"] }])).toBe("article");
  });

  it("returns 'unknown' for unrecognised type", () => {
    expect(_detectContentType([{ "@type": "MadeUpType" }])).toBe("unknown");
  });

  it("unsupported takes priority over article in same block list", () => {
    expect(_detectContentType([{ "@type": "Product" }, { "@type": "NewsArticle" }])).toBe(
      "unsupported",
    );
  });
});

// ---------------------------------------------------------------------------
// _extractArticleFromJsonLd
// ---------------------------------------------------------------------------

describe("_extractArticleFromJsonLd", () => {
  it("extracts headline, description, and articleBody", () => {
    const result = _extractArticleFromJsonLd([
      {
        "@type": "NewsArticle",
        headline: "כותרת הכתבה",
        description: "תיאור קצר",
        articleBody: "גוף המאמר המלא",
      },
    ]);
    expect(result.title).toBe("כותרת הכתבה");
    expect(result.description).toBe("תיאור קצר");
    expect(result.articleBody).toBe("גוף המאמר המלא");
  });

  it("falls back to name when headline is absent", () => {
    const result = _extractArticleFromJsonLd([
      { "@type": "WebPage", name: "שם הדף", description: "תיאור" },
    ]);
    expect(result.title).toBe("שם הדף");
  });

  it("accepts block with articleBody regardless of @type", () => {
    const result = _extractArticleFromJsonLd([
      { "@type": "UnknownType", articleBody: "גוף המאמר" },
    ]);
    expect(result.articleBody).toBe("גוף המאמר");
  });

  it("returns empty object for non-article blocks", () => {
    const result = _extractArticleFromJsonLd([{ "@type": "Recipe", name: "מתכון" }]);
    expect(result.title).toBeUndefined();
    expect(result.articleBody).toBeUndefined();
  });

  it("uses first matching block for each field across multiple blocks", () => {
    const result = _extractArticleFromJsonLd([
      { "@type": "WebSite" },
      { "@type": "NewsArticle", headline: "כותרת", articleBody: "גוף" },
    ]);
    expect(result.title).toBe("כותרת");
  });

  it("extracts isAccessibleForFree string 'False' (paywalled article)", () => {
    const result = _extractArticleFromJsonLd([
      { "@type": "NewsArticle", headline: "כתבה נעולה", isAccessibleForFree: "False" },
    ]);
    expect(result.isAccessibleForFree).toBe("False");
  });

  it("extracts isAccessibleForFree boolean false", () => {
    const result = _extractArticleFromJsonLd([
      { "@type": "NewsArticle", headline: "כתבה נעולה", isAccessibleForFree: false },
    ]);
    expect(result.isAccessibleForFree).toBe(false);
  });

  it("extracts isAccessibleForFree 'True' for open-access articles", () => {
    const result = _extractArticleFromJsonLd([
      { "@type": "NewsArticle", headline: "כתבה חופשית", isAccessibleForFree: "True" },
    ]);
    expect(result.isAccessibleForFree).toBe("True");
  });

  it("returns undefined isAccessibleForFree when field is absent", () => {
    const result = _extractArticleFromJsonLd([
      { "@type": "NewsArticle", headline: "כתבה" },
    ]);
    expect(result.isAccessibleForFree).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// _extractRecipeBody
// ---------------------------------------------------------------------------

describe("_extractRecipeBody", () => {
  it("assembles ingredients and string instruction steps", () => {
    const block = {
      recipeIngredient: ["2 ביצים", "1 כוס קמח"],
      recipeInstructions: ["ערבבו את הביצים", "הוסיפו קמח"],
    };
    const result = _extractRecipeBody(block);
    expect(result).toContain("מצרכים:");
    expect(result).toContain("2 ביצים");
    expect(result).toContain("הוראות הכנה:");
    expect(result).toContain("1. ערבבו את הביצים");
  });

  it("handles HowToStep objects in instructions", () => {
    const block = {
      recipeIngredient: ["100 גרם חמאה"],
      recipeInstructions: [
        { "@type": "HowToStep", text: "המיסו את החמאה" },
        { "@type": "HowToStep", text: "הוסיפו סוכר" },
      ],
    };
    const result = _extractRecipeBody(block);
    expect(result).toContain("1. המיסו את החמאה");
    expect(result).toContain("2. הוסיפו סוכר");
  });

  it("returns empty string for empty recipe", () => {
    expect(_extractRecipeBody({})).toBe("");
  });

  it("handles missing ingredients", () => {
    const block = {
      recipeInstructions: ["ערבבו הכל"],
    };
    const result = _extractRecipeBody(block);
    expect(result).not.toContain("מצרכים:");
    expect(result).toContain("1. ערבבו הכל");
  });
});

// ---------------------------------------------------------------------------
// _extractJobBody
// ---------------------------------------------------------------------------

describe("_extractJobBody", () => {
  it("returns plain text description", () => {
    const block = { description: "משרה לפיתוח תוכנה בחברה מובילה" };
    expect(_extractJobBody(block)).toBe("משרה לפיתוח תוכנה בחברה מובילה");
  });

  it("strips HTML tags from description", () => {
    const block = { description: "<p>תיאור המשרה</p><ul><li>דרישה ראשונה</li></ul>" };
    const result = _extractJobBody(block);
    expect(result).not.toContain("<p>");
    expect(result).toContain("תיאור המשרה");
    expect(result).toContain("דרישה ראשונה");
  });

  it("returns empty string when description is absent", () => {
    expect(_extractJobBody({})).toBe("");
  });
});

// ---------------------------------------------------------------------------
// _extractFaqBody
// ---------------------------------------------------------------------------

describe("_extractFaqBody", () => {
  it("formats Q&A pairs", () => {
    const block = {
      mainEntity: [
        {
          "@type": "Question",
          name: "מה שעות הפתיחה?",
          acceptedAnswer: { "@type": "Answer", text: "ימים א-ה 09:00-17:00" },
        },
      ],
    };
    const result = _extractFaqBody(block);
    expect(result).toContain("שאלה: מה שעות הפתיחה?");
    expect(result).toContain("ימים א-ה 09:00-17:00");
  });

  it("joins multiple Q&A pairs with separator", () => {
    const block = {
      mainEntity: [
        { name: "שאלה 1", acceptedAnswer: { text: "תשובה 1" } },
        { name: "שאלה 2", acceptedAnswer: { text: "תשובה 2" } },
      ],
    };
    const result = _extractFaqBody(block);
    expect(result).toContain("---");
    expect(result).toContain("שאלה: שאלה 2");
  });

  it("returns empty string when mainEntity is absent", () => {
    expect(_extractFaqBody({})).toBe("");
  });
});

// ---------------------------------------------------------------------------
// _extractVideoBody
// ---------------------------------------------------------------------------

describe("_extractVideoBody", () => {
  it("prepends Hebrew note and appends description", () => {
    const block = { description: "תוכנית ילדים מצחיקה" };
    const result = _extractVideoBody(block);
    expect(result).toContain("תיאור הסרטון בלבד");
    expect(result).toContain("תוכנית ילדים מצחיקה");
  });

  it("still includes the note when description is empty", () => {
    const result = _extractVideoBody({});
    expect(result).toContain("תיאור הסרטון בלבד");
  });
});

// ---------------------------------------------------------------------------
// _extractTitleFromHtml
// ---------------------------------------------------------------------------

describe("_extractTitleFromHtml", () => {
  it("extracts h1 from inside article element", () => {
    const html = `
      <html><body>
        <header><h1>כותרת האתר</h1></header>
        <article>
          <h1>כותרת הכתבה האמיתית</h1>
          <p>תוכן הכתבה</p>
        </article>
      </body></html>`;
    expect(_extractTitleFromHtml(html)).toBe("כותרת הכתבה האמיתית");
  });

  it("prefers h1 inside article over h1 in site header", () => {
    const html = `
      <html><body>
        <header><h1>שם האתר</h1></header>
        <article>
          <h1>כותרת הכתבה הנכונה</h1>
          <p>תוכן</p>
        </article>
      </body></html>`;
    expect(_extractTitleFromHtml(html)).toBe("כותרת הכתבה הנכונה");
  });

  it("finds h1 inside article-level header (Walla regression)", () => {
    // Walla wraps the article h1 inside <article><header><h1>
    // We must NOT remove <header> before searching inside <article>
    const html = `
      <html><body>
        <header><nav><ul><li>ניווט</li></ul></nav></header>
        <article>
          <header>
            <h1>במדבר העיראקי: ישראל הקימה 2 בסיסים חשאיים</h1>
          </header>
          <p>תוכן הכתבה</p>
        </article>
      </body></html>`;
    expect(_extractTitleFromHtml(html)).toBe("במדבר העיראקי: ישראל הקימה 2 בסיסים חשאיים");
  });

  it("falls back to first h1 outside article when no article element exists", () => {
    const html = `
      <html><body>
        <div class="content">
          <h1>כותרת הדף</h1>
          <p>תוכן</p>
        </div>
      </body></html>`;
    expect(_extractTitleFromHtml(html)).toBe("כותרת הדף");
  });

  it("returns null when no h1 found", () => {
    const html = `<html><body><p>תוכן ללא כותרת</p></body></html>`;
    expect(_extractTitleFromHtml(html)).toBeNull();
  });

  it("decodes HTML entities in h1 (Walla regression: quotation marks in headline)", () => {
    const html = `
      <html><body>
        <article>
          <h1>תעלומת &quot;מלאך המוות&quot; מאושוויץ: שווייץ תפתח את הארכיונים</h1>
        </article>
      </body></html>`;
    expect(_extractTitleFromHtml(html)).toBe('תעלומת "מלאך המוות" מאושוויץ: שווייץ תפתח את הארכיונים');
  });

  it("strips nested HTML tags from h1 content", () => {
    const html = `
      <html><body>
        <article>
          <h1><span class="prefix">בלעדי:</span> כותרת הכתבה המלאה</h1>
        </article>
      </body></html>`;
    expect(_extractTitleFromHtml(html)).toBe("בלעדי: כותרת הכתבה המלאה");
  });
});

// ---------------------------------------------------------------------------
// _normalizeArticleBody
// ---------------------------------------------------------------------------

describe("_normalizeArticleBody", () => {
  it("converts multiple spaces (ynet pattern) to paragraph breaks", () => {
    const result = _normalizeArticleBody("פסקה ראשונה   פסקה שנייה");
    expect(result).toContain("פסקה ראשונה\n\nפסקה שנייה");
  });

  it("converts \\r\\n (Maariv pattern) to paragraph breaks", () => {
    const result = _normalizeArticleBody("פסקה ראשונה\r\nפסקה שנייה");
    expect(result).toContain("פסקה ראשונה\n\nפסקה שנייה");
  });

  it("converts tabs to paragraph breaks", () => {
    const result = _normalizeArticleBody("פסקה\tמשך");
    expect(result).toContain("פסקה\n\nמשך");
  });

  it("collapses excessive newlines to double", () => {
    const result = _normalizeArticleBody("א\n\n\n\nב");
    expect(result).toBe("א\n\nב");
  });

  it("trims surrounding whitespace", () => {
    expect(_normalizeArticleBody("  מאמר  ")).toBe("מאמר");
  });

  it("decodes HTML entities embedded in JSON-LD articleBody", () => {
    // Sites like Mako/N12 and Reshet 13 put HTML entities in articleBody
    const result = _normalizeArticleBody('פעילות צה&quot;ל בבינת ג&#x27;ביל');
    expect(result).toBe('פעילות צה"ל בבינת ג\'ביל');
  });

  it("decodes &amp; last so &amp;quot; becomes &quot; not \"", () => {
    const result = _normalizeArticleBody("AT&amp;T");
    expect(result).toBe("AT&T");
  });

  it("decodes double-encoded &amp;nbsp; to space (Drupal meta attribute encoding)", () => {
    const result = _normalizeArticleBody("טקסט&amp;nbsp;עם&amp;nbsp;רווחים");
    expect(result).toBe("טקסט עם רווחים");
  });

  it("decodes double-encoded &amp;ldquo; and &amp;rdquo; to curly quotes (Yad Vashem Drupal encoding)", () => {
    const result = _normalizeArticleBody("&amp;ldquo;ציטוט&amp;rdquo;");
    expect(result).toBe("“ציטוט”");
  });

  it("decodes double-encoded &amp;quot; to straight double-quote (Drupal meta attribute encoding)", () => {
    const result = _normalizeArticleBody('מצה&amp;quot;ל');
    expect(result).toBe('מצה"ל');
  });

  it("decodes double-encoded &amp;lsquo; and &amp;rsquo; to curly single quotes (Drupal encoding)", () => {
    const result = _normalizeArticleBody("&amp;lsquo;מילה&amp;rsquo;");
    expect(result).toBe("‘מילה’");
  });
});

// ---------------------------------------------------------------------------
// _stripHtmlToText
// ---------------------------------------------------------------------------

describe("_stripHtmlToText", () => {
  it("removes tags and converts paragraph breaks", () => {
    const result = _stripHtmlToText("<p>שלום</p><p>עולם</p>");
    expect(result).toContain("שלום");
    expect(result).toContain("עולם");
    expect(result).not.toContain("<p>");
  });

  it("removes script and style content", () => {
    const result = _stripHtmlToText(
      "<style>body{color:red}</style><p>תוכן</p><script>alert(1)</script>",
    );
    expect(result).toContain("תוכן");
    expect(result).not.toContain("body{color:red}");
    expect(result).not.toContain("alert");
  });

  it("decodes HTML entities", () => {
    const result = _stripHtmlToText("&amp; &lt;b&gt; &nbsp; &quot;");
    expect(result).toContain("&");
    expect(result).toContain("<b>");
    expect(result).toContain('"');
  });
});

// ---------------------------------------------------------------------------
// _hebrewDensity
// ---------------------------------------------------------------------------

describe("_hebrewDensity", () => {
  it("returns 0 for empty string", () => {
    expect(_hebrewDensity("")).toBe(0);
  });

  it("returns close to 1 for all-Hebrew text", () => {
    expect(_hebrewDensity("שלום עולם")).toBeGreaterThan(0.8);
  });

  it("returns 0 for all-English text", () => {
    expect(_hebrewDensity("hello world")).toBe(0);
  });

  it("returns intermediate value for mixed text", () => {
    const density = _hebrewDensity("שלום hello");
    expect(density).toBeGreaterThan(0);
    expect(density).toBeLessThan(1);
  });

  it("counts nikud characters as Hebrew", () => {
    // בְּ contains a bet with dagesh and shva (nikud)
    const withNikud = "בְּרֵאשִׁית";
    expect(_hebrewDensity(withNikud)).toBeGreaterThan(0.5);
  });
});

// ---------------------------------------------------------------------------
// _checkQualityGate
// ---------------------------------------------------------------------------

describe("_checkQualityGate", () => {
  const longHebrewPara = "שלום עולם זהו משפט ארוך מספיק עבור בדיקת האיכות של החילוץ";

  it("passes article mode with 3+ Hebrew paragraphs", () => {
    const text = [longHebrewPara, longHebrewPara, longHebrewPara].join("\n\n");
    expect(_checkQualityGate(text, "article")).toBe(true);
  });

  it("fails article mode with only 2 paragraphs", () => {
    const text = [longHebrewPara, longHebrewPara].join("\n\n");
    expect(_checkQualityGate(text, "article")).toBe(false);
  });

  it("fails article mode with low Hebrew density", () => {
    const text = [
      "this is english text that is long enough to be a paragraph",
      "more english text here in a second paragraph with enough length",
      "third paragraph full of english words without any hebrew at all",
    ].join("\n\n");
    expect(_checkQualityGate(text, "article")).toBe(false);
  });

  it("passes recipe mode with Hebrew ingredients", () => {
    const text =
      "מצרכים:\n2 ביצים גדולות\n1 כוס קמח לבן\nחצי כוס סוכר\n\nהוראות הכנה:\n1. ערבבו את הביצים עם הסוכר היטב\n2. הוסיפו את הקמח בהדרגה תוך כדי ערבוב";
    expect(_checkQualityGate(text, "recipe")).toBe(true);
  });

  it("fails recipe mode for text that is too short", () => {
    expect(_checkQualityGate("מ", "recipe")).toBe(false);
  });

  it("passes job mode with Hebrew description", () => {
    const text =
      "חברה מובילה בתחום הטכנולוגיה מחפשת מפתח בכיר עם ניסיון של לפחות שלוש שנים בפיתוח תוכנה מודרנית ובעלי ניסיון בעבודה עם מערכות מורכבות";
    expect(_checkQualityGate(text, "job")).toBe(true);
  });

  it("passes faq mode with Q&A format", () => {
    const text = "שאלה: מה שעות הפתיחה?\n\nימים א-ה 09:00-17:00";
    expect(_checkQualityGate(text, "faq")).toBe(true);
  });

  it("fails faq mode without 'שאלה:' marker", () => {
    const text = "מה שעות הפתיחה? ימים א-ה 09:00-17:00";
    expect(_checkQualityGate(text, "faq")).toBe(false);
  });

  it("passes video mode with a synopsis string", () => {
    // _extractVideoBody always prepends a Hebrew note, so even a short description passes
    const text = _extractVideoBody({ description: "תכנית ילדים מצחיקה" });
    expect(_checkQualityGate(text, "video")).toBe(true);
  });

  it("passes unknown mode with 2 Hebrew paragraphs", () => {
    const text = [longHebrewPara, longHebrewPara].join("\n\n");
    expect(_checkQualityGate(text, "unknown")).toBe(true);
  });

  it("fails unknown mode with only 1 paragraph", () => {
    expect(_checkQualityGate(longHebrewPara, "unknown")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// _isDefinitePaywall
// ---------------------------------------------------------------------------

describe("_isDefinitePaywall", () => {
  it("returns true for Schema.org isAccessibleForFree string 'False'", () => {
    expect(_isDefinitePaywall("<html></html>", "False")).toBe(true);
  });

  it("returns true for Schema.org isAccessibleForFree string 'false' (lowercase)", () => {
    expect(_isDefinitePaywall("<html></html>", "false")).toBe(true);
  });

  it("returns true for Schema.org isAccessibleForFree string 'FALSE' (uppercase)", () => {
    expect(_isDefinitePaywall("<html></html>", "FALSE")).toBe(true);
  });

  it("returns true for Schema.org isAccessibleForFree boolean false", () => {
    expect(_isDefinitePaywall("<html></html>", false)).toBe(true);
  });

  it("returns true when מוגבלת למנויים appears in raw HTML (Haaretz pattern)", () => {
    expect(_isDefinitePaywall('<p>כתבה זו מוגבלת למנויים</p>')).toBe(true);
  });

  it("returns true when מוגבל למנויים appears in raw HTML", () => {
    expect(_isDefinitePaywall('<span>התוכן מוגבל למנויים בלבד</span>')).toBe(true);
  });

  it("returns true for HTML with paywall class attribute", () => {
    expect(_isDefinitePaywall('<div class="paywall-wall">תוכן נעול</div>')).toBe(true);
  });

  it("returns true when לקריאת הכתבה המלאה appears in raw HTML", () => {
    expect(_isDefinitePaywall('<p>לקריאת הכתבה המלאה הירשמו לאתר</p>')).toBe(true);
  });

  it("returns true when התחברו כמנויים appears in raw HTML", () => {
    expect(_isDefinitePaywall('<p>התחברו כמנויים לצפייה בתוכן המלא</p>')).toBe(true);
  });

  it("returns true when הירשמו לקריאה appears in raw HTML", () => {
    expect(_isDefinitePaywall('<p>הירשמו לקריאה של כל הכתבות שלנו</p>')).toBe(true);
  });

  it("returns false when only מנויים appears — ambiguous, not a definitive signal", () => {
    expect(_isDefinitePaywall('<p>תוכן זמין למנויים בלבד</p>')).toBe(false);
  });

  it("returns false for clean HTML with no paywall signals", () => {
    expect(_isDefinitePaywall('<article><p>כתבה פתוחה לכולם ללא תשלום</p></article>')).toBe(false);
  });

  it("returns false for isAccessibleForFree 'True'", () => {
    expect(_isDefinitePaywall("<html></html>", "True")).toBe(false);
  });

  it("returns false for isAccessibleForFree boolean true", () => {
    expect(_isDefinitePaywall("<html></html>", true)).toBe(false);
  });

  it("does not trigger on paywall id/class inside a <script> element (ynet ga4paywall regression)", () => {
    // ynet includes <script id="ga4paywall" src="...ga4_ynet_paywall..."> for analytics.
    // This must not be mistaken for a DOM paywall gate.
    expect(_isDefinitePaywall('<script id="ga4paywall" src="https://example.com/ga4_ynet_paywall.js"></script><article><p>כתבה פתוחה</p></article>')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// _buildContentWithPreamble
// ---------------------------------------------------------------------------

describe("_buildContentWithPreamble", () => {
  const body = "גוף המאמר עם תוכן חשוב";

  it("prepends title before content", () => {
    const result = _buildContentWithPreamble(body, "כותרת הכתבה");
    expect(result).toBe(`כותרת הכתבה\n\n${body}`);
  });

  it("returns content unchanged when title is empty", () => {
    const result = _buildContentWithPreamble(body, "");
    expect(result).toBe(body);
  });

  it("places title first even when its text already appears in content", () => {
    const content = `כותרת הכתבה\n\n${body}`;
    const result = _buildContentWithPreamble(content, "כותרת הכתבה");
    expect(result.startsWith("כותרת הכתבה")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// _selectBestContent
// ---------------------------------------------------------------------------

describe("_selectBestContent", () => {
  // Enough Hebrew text to pass quality gates
  const longPara = "זהו פסקה ארוכה בעברית המכילה מידע חשוב ומפורט לגבי הנושא הנדון במאמר זה";

  function makeArticle(n: number): string {
    return Array.from({ length: n }, () => longPara).join("\n\n");
  }

  it("prefers Readability over articleBody when lengths are similar (ynet regression test)", () => {
    // Simulates ynet: articleBody has same content as Readability but with embedded captions
    const readability = makeArticle(3);
    const articleBody = makeArticle(3) + "\n\nצילום: שם הצלם\n\nמקור: הכתב הצבאי";
    const result = _selectBestContent(readability, articleBody, "article");
    expect(result).toBe(readability);
  });

  it("prefers articleBody when it is more than 1.5x longer than Readability", () => {
    // Simulates a site where Readability missed half the content
    const readability = makeArticle(3);
    const articleBody = makeArticle(8); // much longer
    expect(articleBody.length).toBeGreaterThan(readability.length * 1.5);
    const result = _selectBestContent(readability, articleBody, "article");
    expect(result).toBe(articleBody);
  });

  it("uses Readability when articleBody is null", () => {
    const readability = makeArticle(3);
    expect(_selectBestContent(readability, null, "article")).toBe(readability);
  });

  it("uses articleBody when Readability is null", () => {
    const articleBody = makeArticle(3);
    expect(_selectBestContent(null, articleBody, "article")).toBe(articleBody);
  });

  it("uses articleBody when Readability fails quality gate but articleBody passes", () => {
    const shortReadability = "קצר מדי"; // fails quality gate
    const articleBody = makeArticle(3);
    expect(_selectBestContent(shortReadability, articleBody, "article")).toBe(articleBody);
  });

  it("uses Readability when articleBody fails quality gate but Readability passes", () => {
    const readability = makeArticle(3);
    const shortArticleBody = "קצר מדי"; // fails quality gate
    expect(_selectBestContent(readability, shortArticleBody, "article")).toBe(readability);
  });

  it("falls back to Readability when neither passes quality gate", () => {
    const shortReadability = "קצר";
    const shortArticleBody = "גם קצר";
    expect(_selectBestContent(shortReadability, shortArticleBody, "article")).toBe(shortReadability);
  });

  it("falls back to articleBody when Readability is null and articleBody fails quality gate", () => {
    const shortArticleBody = "קצר";
    expect(_selectBestContent(null, shortArticleBody, "article")).toBe(shortArticleBody);
  });

  it("returns empty string when both are null", () => {
    expect(_selectBestContent(null, null, "article")).toBe("");
  });

  it("applies unknown quality gate (looser) for unknown content type", () => {
    // unknown mode requires only 2 paragraphs — articleBody with 2 paras should pass
    const readability = makeArticle(2); // passes "unknown" gate (2 paras)
    const articleBody = makeArticle(2);
    const result = _selectBestContent(readability, articleBody, "unknown");
    expect(result).toBe(readability); // Readability preferred when both pass and lengths similar
  });
});

// ---------------------------------------------------------------------------
// _detectPaywall
// ---------------------------------------------------------------------------

describe("_detectPaywall", () => {
  it("returns false for normal Hebrew text", () => {
    expect(_detectPaywall("זוהי כתבה רגילה ללא חסם")).toBe(false);
  });

  it("detects מנויים marker", () => {
    expect(_detectPaywall("התוכן הזה זמין למנויים בלבד")).toBe(true);
  });

  it("detects לקריאת הכתבה המלאה marker", () => {
    expect(_detectPaywall("לקריאת הכתבה המלאה הירשמו")).toBe(true);
  });

  it("detects התחברו כמנויים marker", () => {
    expect(_detectPaywall("התחברו כמנויים לצפייה בתוכן זה")).toBe(true);
  });

  it("detects הירשמו לקריאה marker", () => {
    expect(_detectPaywall("הירשמו לקריאה של כל הכתבות שלנו")).toBe(true);
  });

  // Schema.org isAccessibleForFree signal
  it("returns true for isAccessibleForFree string 'False'", () => {
    expect(_detectPaywall("", undefined, "False")).toBe(true);
  });

  it("returns true for isAccessibleForFree string 'false' (lowercase)", () => {
    expect(_detectPaywall("", undefined, "false")).toBe(true);
  });

  it("returns true for isAccessibleForFree string 'FALSE' (uppercase)", () => {
    expect(_detectPaywall("", undefined, "FALSE")).toBe(true);
  });

  it("returns true for isAccessibleForFree boolean false", () => {
    expect(_detectPaywall("", undefined, false)).toBe(true);
  });

  it("returns false for isAccessibleForFree 'True'", () => {
    expect(_detectPaywall("", undefined, "True")).toBe(false);
  });

  it("returns false for isAccessibleForFree boolean true", () => {
    expect(_detectPaywall("", undefined, true)).toBe(false);
  });

  it("returns true via Schema.org signal even when extracted text has no markers", () => {
    expect(_detectPaywall("כתבה רגילה ללא מילות מפתח", undefined, "False")).toBe(true);
  });

  it("detects מוגבלת למנויים in raw HTML (Haaretz pattern)", () => {
    expect(_detectPaywall("", '<p>כתבה זו מוגבלת למנויים</p>')).toBe(true);
  });

  it("detects מוגבל למנויים in raw HTML", () => {
    expect(_detectPaywall("", '<span>התוכן מוגבל למנויים בלבד</span>')).toBe(true);
  });

  // HTML class/id attribute signal
  it("detects paywall via class attribute", () => {
    expect(_detectPaywall("", '<div class="paywall">הירשמו</div>')).toBe(true);
  });

  it("detects paywall via compound class name containing 'paywall'", () => {
    expect(_detectPaywall("", '<div class="article-paywall-overlay">...</div>')).toBe(true);
  });

  it("detects paywall via id attribute", () => {
    expect(_detectPaywall("", '<div id="paywall">תוכן נעול</div>')).toBe(true);
  });

  it("returns false when 'paywall' appears only in text content, not in an attribute", () => {
    expect(_detectPaywall("", "<p>this article is behind the paywall</p>")).toBe(false);
  });

  it("returns false for clean HTML with no paywall signals", () => {
    expect(_detectPaywall("כתבה רגילה", '<article><p>תוכן פתוח</p></article>')).toBe(false);
  });

  it("detects Hebrew paywall marker in raw HTML even when extracted text is empty", () => {
    // Paywall UI is often stripped during extraction — we must also check raw HTML
    expect(_detectPaywall("", '<div class="subscription-box">הירשמו לקריאה של כל הכתבות</div>')).toBe(true);
  });

  it("does not trigger on paywall id/class inside a <script> element (ynet ga4paywall regression)", () => {
    expect(_detectPaywall("", '<script id="ga4paywall" src="https://example.com/ga4_ynet_paywall.js"></script><article><p>כתבה פתוחה</p></article>')).toBe(false);
  });

  it("does not trigger on מנויים in raw HTML only — common in free-article nav (ynet regression)", () => {
    // "מנויים" appears in ynet free-article sidebar/nav ("כתבות למנויים") and must not
    // trigger a false paywall warning. Only definitive markers are checked against raw HTML.
    expect(_detectPaywall("רק שתי פסקאות חופשיות", '<div>תוכן זמין למנויים בלבד</div>')).toBe(false);
  });

  it("still detects מנויים marker when present in extracted text", () => {
    expect(_detectPaywall("התוכן הזה זמין למנויים בלבד")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// _detectSpaShell
// ---------------------------------------------------------------------------

describe("_detectSpaShell", () => {
  it("returns null for normal article HTML with plenty of text", () => {
    const html = `
      <html><head><title>כתבה בדיקה</title></head>
      <body>
        <header>אתר החדשות שלנו | בית | ספורט | כלכלה | בריאות | טכנולוגיה</header>
        <article>
          <h1>כותרת הכתבה הראשית של הדף</h1>
          <p>זוהי כתבה עם תוכן רב ומפורט. היא מכילה פסקאות ארוכות ומידע חשוב
          לקוראים. הכתבה ממשיכה עם פרטים נוספים ומעמיקים בנושא הנדון.</p>
          <p>פסקה שנייה עם עוד מידע חשוב ורלוונטי לנושא שנדון בכתבה זו בהרחבה.</p>
        </article>
        <footer>כל הזכויות שמורות | צור קשר | מדיניות פרטיות</footer>
      </body></html>`;
    expect(_detectSpaShell(html)).toBeNull();
  });

  it("returns 'spa' for empty React root mount point", () => {
    const html = `<html><body><div id="root"></div><script src="bundle.js"></script></body></html>`;
    expect(_detectSpaShell(html)).toBe("spa");
  });

  it("returns 'sparse' for empty Vue app shell (id=app not a SPA signal, caught by sparse text)", () => {
    // id="app" is too generic to trigger alone; this is caught by the sparse-text signal
    const html = `<html><body><div id="app"></div><script src="app.js"></script></body></html>`;
    expect(_detectSpaShell(html)).toBe("sparse");
  });

  it("returns null for id=app with substantial SSR content", () => {
    // News sites commonly use id="app" as a layout wrapper around server-rendered content
    const html = `
      <html><head><title>כתבה - אתר חדשות</title></head>
      <body>
        <header>ראשי | חדשות | ספורט | כלכלה | תרבות | בריאות</header>
        <div id="app">
          <article>
            <h1>כותרת הכתבה שנטענה בצד השרת</h1>
            <p>זוהי כתבה שהוגשה בצד השרת (SSR). היא מכילה תוכן עברי חשוב ומעניין
            שמוצג ישירות בHTML ולא נטען דינמית על ידי JavaScript בדפדפן.</p>
            <p>פסקה נוספת עם מידע שנטען בצד השרת ולא בצד הלקוח כלל. זה מאמר
            ארוך ומפורט שמוכיח שהדף הזה הוא SSR אמיתי עם תוכן מלא.</p>
          </article>
        </div>
        <footer>צור קשר | מדיניות פרטיות | תנאי שימוש</footer>
      </body></html>`;
    expect(_detectSpaShell(html)).toBeNull();
  });

  it("returns 'spa' for empty Next.js mount point", () => {
    const html = `<html><body><div id="__next"></div><script src="/_next/static/chunks/main.js"></script></body></html>`;
    expect(_detectSpaShell(html)).toBe("spa");
  });

  it("returns null for Next.js with SSR content inside __next", () => {
    const html = `
      <html><head><title>כתבה - אתר חדשות</title></head>
      <body>
        <header>ראשי | חדשות | ספורט | כלכלה | תרבות | בריאות</header>
        <div id="__next">
          <article>
            <h1>כותרת הכתבה שנטענה בצד השרת</h1>
            <p>זוהי כתבה שהוגשה בצד השרת (SSR). היא מכילה תוכן עברי חשוב ומעניין
            שמוצג ישירות בHTML ולא נטען דינמית על ידי JavaScript בדפדפן.</p>
            <p>פסקה נוספת עם מידע שנטען בצד השרת ולא בצד הלקוח כלל. זה מאמר
            ארוך ומפורט שמוכיח שהדף הזה הוא SSR אמיתי עם תוכן מלא.</p>
          </article>
        </div>
        <footer>צור קשר | מדיניות פרטיות | תנאי שימוש</footer>
      </body></html>`;
    expect(_detectSpaShell(html)).toBeNull();
  });

  it("returns 'spa' for explicit JS-required noscript message", () => {
    // "enable JavaScript" phrasing used by React/Angular apps
    const html = `
      <html><body>
        <noscript>You need to enable JavaScript to run this app.</noscript>
        <div id="root"></div>
      </body></html>`;
    expect(_detectSpaShell(html)).toBe("spa");
  });

  it("returns null for analytics noscript that does not require JavaScript", () => {
    // Analytics tags commonly include "javascript" in noscript fallback pixels
    const html = `
      <html><head><title>כתבה בדיקה</title></head>
      <body>
        <noscript><img src="https://analytics.example.com/collect?tid=UA-12345&amp;t=pageview" /></noscript>
        <header>אתר החדשות שלנו | בית | ספורט | כלכלה | בריאות | טכנולוגיה</header>
        <article>
          <h1>כותרת הכתבה הראשית של הדף</h1>
          <p>זוהי כתבה עם תוכן רב ומפורט. היא מכילה פסקאות ארוכות ומידע חשוב
          לקוראים. הכתבה ממשיכה עם פרטים נוספים ומעמיקים בנושא הנדון.</p>
          <p>פסקה שנייה עם עוד מידע חשוב ורלוונטי לנושא שנדון בכתבה זו בהרחבה.</p>
        </article>
        <footer>כל הזכויות שמורות | צור קשר | מדיניות פרטיות</footer>
      </body></html>`;
    expect(_detectSpaShell(html)).toBeNull();
  });

  it("returns 'sparse' for pages with extremely sparse visible text", () => {
    const html = `<html><head><title>App</title></head><body><script>/* big bundle */</script></body></html>`;
    expect(_detectSpaShell(html)).toBe("sparse");
  });
});

// ---------------------------------------------------------------------------
// _extractWithReadability
// ---------------------------------------------------------------------------

describe("_extractWithReadability", () => {
  it("extracts article content from standard HTML", () => {
    const html = `
      <html lang="he">
        <head><title>מאמר בדיקה</title></head>
        <body>
          <nav>ניווט</nav>
          <article>
            <h1>כותרת המאמר</h1>
            <p>זוהי פסקה ראשונה של המאמר בעברית. היא מכילה מידע חשוב ורלוונטי.</p>
            <p>זוהי פסקה שנייה. היא ממשיכה את הנושא ומוסיפה פרטים נוספים לקורא.</p>
            <p>פסקה שלישית מסכמת את הנושא ומסיימת את המאמר בצורה ברורה.</p>
          </article>
          <footer>כותרת תחתית</footer>
        </body>
      </html>`;
    const result = _extractWithReadability(html);
    expect(result).not.toBeNull();
    expect(result).toContain("פסקה ראשונה");
    expect(result).toContain("פסקה שנייה");
  });

  it("returns null for HTML with no meaningful content", () => {
    const result = _extractWithReadability("<html><body></body></html>");
    expect(result).toBeNull();
  });

  it("removes elements with 'paywall' in class from DOM before extraction", () => {
    const html = `
      <html>
        <body>
          <article>
            <p>פסקה ראשונה של המאמר עם תוכן חשוב ומפורט.</p>
            <p>פסקה שנייה של המאמר ממשיכה את הנושא.</p>
            <div class="paywall-overlay">הירשמו לקריאת המאמר המלא. תוכן זה זמין למנויים בלבד.</div>
          </article>
        </body>
      </html>`;
    const result = _extractWithReadability(html);
    expect(result).not.toBeNull();
    expect(result).not.toContain("הירשמו לקריאת המאמר");
    expect(result).not.toContain("תוכן זה זמין למנויים");
    expect(result).toContain("פסקה ראשונה");
    expect(result).toContain("פסקה שנייה");
  });

  it("removes h1 from output since title comes from metadata", () => {
    const html = `
      <html>
        <body>
          <article>
            <h1>כותרת הכתבה הראשית</h1>
            <p>פסקה ראשונה של המאמר עם תוכן חשוב ומפורט לגבי הנושא.</p>
            <p>פסקה שנייה של המאמר ממשיכה את הנושא ומוסיפה פרטים.</p>
            <p>פסקה שלישית מסכמת את הכתבה בצורה ברורה ומפורטת.</p>
          </article>
        </body>
      </html>`;
    const result = _extractWithReadability(html);
    expect(result).not.toBeNull();
    expect(result).not.toContain("כותרת הכתבה הראשית");
    expect(result).toContain("פסקה ראשונה");
  });

  it("strips figure captions from output", () => {
    const html = `
      <html>
        <body>
          <article>
            <p>פסקה ראשונה של המאמר עם תוכן חשוב ומפורט.</p>
            <figure>
              <img src="photo.jpg" />
              <figcaption>צילום: שם הצלם הידוע</figcaption>
            </figure>
            <p>פסקה שנייה של המאמר ממשיכה את הנושא.</p>
            <p>פסקה שלישית מסכמת את הכתבה בצורה ברורה.</p>
          </article>
        </body>
      </html>`;
    const result = _extractWithReadability(html);
    expect(result).not.toBeNull();
    expect(result).not.toContain("צילום:");
    expect(result).not.toContain("שם הצלם");
    expect(result).toContain("פסקה ראשונה");
    expect(result).toContain("פסקה שנייה");
  });

  it("removes nav elements from DOM before extraction (Walla regression)", () => {
    const html = `
      <html>
        <body>
          <nav>
            <ul><li>צפייה ישירה</li><li>חדשות</li><li>ספורט</li></ul>
          </nav>
          <article>
            <p>פסקה ראשונה של המאמר עם תוכן חשוב ומפורט.</p>
            <p>פסקה שנייה של המאמר ממשיכה את הנושא ומוסיפה פרטים.</p>
            <p>פסקה שלישית מסכמת את הכתבה בצורה ברורה ומפורטת.</p>
          </article>
        </body>
      </html>`;
    const result = _extractWithReadability(html);
    expect(result).not.toBeNull();
    expect(result).not.toContain("צפייה ישירה");
    expect(result).toContain("פסקה ראשונה");
  });

  it("removes header elements from DOM before extraction (Walla regression)", () => {
    const html = `
      <html>
        <body>
          <header>
            <div class="title">צפייה ישירה</div>
            <nav><ul><li>חדשות</li><li>ספורט</li><li>כלכלה</li></ul></nav>
          </header>
          <article>
            <p>פסקה ראשונה של המאמר עם תוכן חשוב ומפורט.</p>
            <p>פסקה שנייה של המאמר ממשיכה את הנושא ומוסיפה פרטים.</p>
            <p>פסקה שלישית מסכמת את הכתבה בצורה ברורה ומפורטת.</p>
          </article>
        </body>
      </html>`;
    const result = _extractWithReadability(html);
    expect(result).not.toBeNull();
    expect(result).not.toContain("צפייה ישירה");
    expect(result).toContain("פסקה ראשונה");
  });

  it("does not include nav or footer in output", () => {
    const html = `
      <html>
        <body>
          <nav>ניווט ראשי - לא צריך להיות בפלט</nav>
          <article>
            <p>תוכן המאמר שצריך להיות בפלט כי הוא חשוב.</p>
            <p>עוד תוכן חשוב שצריך להישאר בפלט לאחר החילוץ.</p>
          </article>
          <footer>כותרת תחתית - לא צריך להיות בפלט</footer>
        </body>
      </html>`;
    const result = _extractWithReadability(html);
    if (result) {
      expect(result).not.toContain("ניווט ראשי");
      expect(result).not.toContain("כותרת תחתית");
    }
  });

  it("removes paragraphs whose content is entirely <a> link text (Globes related-article bullets)", () => {
    const html = `
      <html lang="he"><body>
        <article>
          <p>פסקה ראשונה עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
          <p>● <a href="/article/1">כותרת כתבה קשורה אחת שלא צריכה להופיע בפלט</a><br />● <a href="/article/2">כותרת כתבה קשורה שנייה שלא צריכה להופיע</a></p>
          <p>פסקה שנייה עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
          <p>פסקה שלישית עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
        </article>
      </body></html>`;
    const result = _extractWithReadability(html);
    expect(result).not.toBeNull();
    expect(result).not.toContain("כותרת כתבה קשורה אחת");
    expect(result).not.toContain("כותרת כתבה קשורה שנייה");
    expect(result).toContain("פסקה ראשונה");
    expect(result).toContain("פסקה שנייה");
  });

  it("removes <li> elements whose content is entirely link text (Sport5 promo-list regression)", () => {
    // Sport5 embeds promotional <ul><li><a>...</a></li></ul> blocks inside the article body.
    // These contain no non-link text so the same link-density filter used for <p> should remove them.
    const html = `
      <html lang="he"><body>
        <article>
          <p>פסקה ראשונה עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
          <ul>
            <li><strong><a href="https://hevre.sport5.co.il/">הטירוף התחיל — משחק ניחושי תוצאות המונדיאל</a></strong></li>
            <li><strong><a href="https://fantasywc.sport5.co.il/">הצטרפו לפנטזי מונדיאל של בנק יהב</a></strong></li>
          </ul>
          <p>פסקה שנייה עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
          <p>פסקה שלישית עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
        </article>
      </body></html>`;
    const result = _extractWithReadability(html);
    expect(result).not.toBeNull();
    expect(result).not.toContain("הטירוף התחיל");
    expect(result).not.toContain("הצטרפו לפנטזי");
    expect(result).toContain("פסקה ראשונה");
    expect(result).toContain("פסקה שנייה");
  });

  it("removes link-only bullet paragraphs even when &#32; entity trails after the last link", () => {
    const html = `
      <html lang="he"><body>
        <article>
          <p>פסקה ראשונה עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
          <p>● <a href="/article/1">בית ההשקעות שהידרדר לתחתית טבלת התשואות<br /></a>● <a href="/article/2">בדרך למשבר בשווקים? האנליסט שמציע להיזהר</a>&#32;</p>
          <p>פסקה שנייה עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
          <p>פסקה שלישית עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
        </article>
      </body></html>`;
    const result = _extractWithReadability(html);
    expect(result).not.toBeNull();
    expect(result).not.toContain("בית ההשקעות שהידרדר");
    expect(result).not.toContain("בדרך למשבר בשווקים");
    expect(result).toContain("פסקה ראשונה");
    expect(result).toContain("פסקה שנייה");
  });

  it("removes standalone parenthetical photo credits (Sport5 caption regression)", () => {
    const html = `
      <html lang="he"><body>
        <article>
          <p>פסקה ראשונה עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
          <p>(מאור אלקסלסי)</p>
          <p>פסקה שנייה עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
          <p>פסקה שלישית עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
        </article>
      </body></html>`;
    const result = _extractWithReadability(html);
    expect(result).not.toBeNull();
    expect(result).not.toContain("(מאור אלקסלסי)");
    expect(result).toContain("פסקה ראשונה");
    expect(result).toContain("פסקה שנייה");
  });

  it("removes Sport5 video-holder image caption (div.desc inside div.video-holder)", () => {
    const html = `
      <html lang="he"><body>
        <article>
          <div class="video-holder img_videobackground">
            <div class="desc"><span>ההתאחדות לכדורגל</span></div>
            <img src="photo.jpg" alt="ההתאחדות לכדורגל" />
          </div>
          <p>פסקה ראשונה עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
          <p>פסקה שנייה עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
          <p>פסקה שלישית עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
        </article>
      </body></html>`;
    const result = _extractWithReadability(html);
    expect(result).not.toBeNull();
    expect(result).not.toContain("ההתאחדות לכדורגל");
    expect(result).toContain("פסקה ראשונה");
  });

  it("preserves <h3> section headings as standalone paragraph blocks", () => {
    const html = `
      <html lang="he"><body>
        <article>
          <p>פסקה ראשונה עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
          <p>פסקה שנייה עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
          <h3><span class="roundBox">1</span>כותרת ביניים</h3>
          <p>פסקה שלישית עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
          <p>פסקה רביעית עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
        </article>
      </body></html>`;
    const result = _extractWithReadability(html);
    expect(result).not.toBeNull();
    // heading should be its OWN \n\n-separated block, not merged into the following paragraph
    const paragraphs = result!.split(/\n\n+/).filter((p) => p.trim().length > 0);
    const headingParaIndex = paragraphs.findIndex((p) => p.includes("כותרת ביניים"));
    expect(headingParaIndex).toBeGreaterThanOrEqual(0);
    // heading paragraph must NOT contain the following paragraph's text
    expect(paragraphs[headingParaIndex]).not.toContain("פסקה שלישית");
    // the paragraph immediately after the heading should contain the following paragraph's text
    expect(paragraphs[headingParaIndex + 1]).toContain("פסקה שלישית");
  });

  it("removes .ex_list navigation cards before extraction (Yad Vashem sub-article nav regression)", () => {
    // Yad Vashem Drupal pages embed div.ex_list grids of linked sub-article cards inside the
    // article body. Without removal, Readability includes their snippet text as article content.
    const html = `
      <html lang="he"><body>
        <article>
          <p>פסקה ראשונה עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
          <div class="ex_list">
            <div class="item"><a href="/he/link1">כותרת ערך קשור ראשון מרשימת הניווט</a><span>קטע מהערך הקשור שאסור שיופיע</span></div>
            <div class="item"><a href="/he/link2">כותרת ערך קשור שני מרשימת הניווט</a><span>קטע מהערך השני שאסור שיופיע</span></div>
          </div>
          <p>פסקה שנייה עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
          <p>פסקה שלישית עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
        </article>
      </body></html>`;
    const result = _extractWithReadability(html);
    expect(result).not.toBeNull();
    expect(result).not.toContain("כותרת ערך קשור ראשון");
    expect(result).not.toContain("קטע מהערך הקשור");
    expect(result).toContain("פסקה ראשונה");
    expect(result).toContain("פסקה שנייה");
  });

  it("strips HTML comments before parsing to prevent --> artifact (Yad Vashem regression)", () => {
    // linkedom can leave --> in the text when HTML comments are not stripped before parsing.
    const html = `
      <html lang="he"><body>
        <article>
          <!-- תוכן גרסה 2.0 -->
          <p>פסקה ראשונה עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
          <!-- עדכון אחרון 2024 -->
          <p>פסקה שנייה עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
          <p>פסקה שלישית עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
        </article>
      </body></html>`;
    const result = _extractWithReadability(html);
    expect(result).not.toBeNull();
    expect(result).not.toContain("-->");
    expect(result).toContain("פסקה ראשונה");
  });

  it("removes .messages Drupal site-wide notices before extraction (Yad Vashem upgrade banner regression)", () => {
    const html = `
      <html lang="he"><body>
        <div class="messages warning">
          <p>שימו לב: האתר עובר שדרוג. חלק מהשירותים עשויים להיות מוגבלים זמנית.</p>
        </div>
        <article>
          <p>פסקה ראשונה עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
          <p>פסקה שנייה עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
          <p>פסקה שלישית עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
        </article>
      </body></html>`;
    const result = _extractWithReadability(html);
    expect(result).not.toBeNull();
    expect(result).not.toContain("האתר עובר שדרוג");
    expect(result).toContain("פסקה ראשונה");
  });

  it("removes .modal-body Bootstrap modal dialogs before extraction (Drupal redirect notice regression)", () => {
    const html = `
      <html lang="he"><body>
        <div class="modal fade"><div class="modal-body">
          <p>הדף הזה עבר לכתובת חדשה. לחץ כאן להמשך לאתר המעודכן.</p>
        </div></div>
        <article>
          <p>פסקה ראשונה עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
          <p>פסקה שנייה עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
          <p>פסקה שלישית עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
        </article>
      </body></html>`;
    const result = _extractWithReadability(html);
    expect(result).not.toBeNull();
    expect(result).not.toContain("הדף הזה עבר לכתובת חדשה");
    expect(result).toContain("פסקה ראשונה");
  });

  it("removes elements with 'visible-False' in class before extraction (ulpan-online hidden lesson screens)", () => {
    // ulpan-online marks non-visible elements with class="row visible-False" (lesson-completion
    // screens, hidden audio players). Readability ignores CSS so extracts them without removal.
    const html = `
      <html lang="he"><body>
        <article>
          <p>פסקה ראשונה עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
          <p>פסקה שנייה עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
          <p>פסקה שלישית עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
        </article>
        <div class="row visible-False">
          <h2>יופי! התקדמת! סיימת את השיעור</h2>
          <p>תוכן שאסור שיופיע כי הוא מוסתר מהמשתמש</p>
        </div>
      </body></html>`;
    const result = _extractWithReadability(html);
    expect(result).not.toBeNull();
    expect(result).not.toContain("יופי! התקדמת");
    expect(result).not.toContain("תוכן שאסור שיופיע");
    expect(result).toContain("פסקה ראשונה");
  });

  it("prepends subtitle captured from subTitleWrapper h2 when Readability excludes it (ynet regression)", () => {
    // ynet puts the subtitle in <div class="subTitleWrapper"><h2> inside a container that
    // Readability penalises (role="header" / "header" in class), so the subtitle disappears
    // from extracted output. The fix captures it BEFORE any DOM removal and re-injects it.
    //
    // Test mechanism: subtitle is placed inside <header> (which our code removes before
    // Readability runs). This cleanly exercises the capture-then-re-inject path: subtitle
    // is read from the DOM, the <header> is removed, Readability only sees the article
    // paragraphs, and the fix prepends the captured subtitle.
    const subtitle = "נתניהו הורה לתקוף את המטרות בלבנון לאחר הסלמה";
    const html = `
      <html lang="he"><head><title>כתבה בדיקה</title></head><body>
        <header>
          <div class="subTitleWrapper"><h2><span class="subTitle">${subtitle}</span></h2></div>
        </header>
        <article>
          <p>פסקה ראשונה של הכתבה עם תוכן מפורט ומעניין בנושא הלחימה בצפון הארץ.</p>
          <p>פסקה שנייה של הכתבה מפרטת את ההחלטות שהתקבלו בדרג המדיני ואת השלכותיהן.</p>
          <p>פסקה שלישית של הכתבה מסכמת את ההתפתחויות האחרונות ומנתחת את המשמעויות.</p>
        </article>
      </body></html>`;
    const result = _extractWithReadability(html);
    expect(result).not.toBeNull();
    expect(result).toContain(subtitle);
    expect(result).toContain("פסקה ראשונה");
  });

  it("does not duplicate subtitle when Readability already includes it", () => {
    // When the subtitle container does NOT have role=header (or a penalising class),
    // Readability extracts it normally. The fix must not double-prepend it.
    const subtitle = "תת-כותרת שמופיעה בגוף המאמר";
    const html = `
      <html lang="he"><body>
        <article>
          <div class="subTitleWrapper"><h2>${subtitle}</h2></div>
          <p>פסקה ראשונה עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
          <p>פסקה שנייה עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
          <p>פסקה שלישית עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>
        </article>
      </body></html>`;
    const result = _extractWithReadability(html);
    expect(result).not.toBeNull();
    // Count occurrences — must appear exactly once
    const occurrences = (result!.match(new RegExp(subtitle.substring(0, 15), "g")) || []).length;
    expect(occurrences).toBe(1);
  });

  it("extracts intro-box content and ignores footer fine-print (kolzchut regression)", () => {
    // kolzchut.org.il: the page has only 2 <p> tags — one real article paragraph (410 chars)
    // inside div.intro-box-content and one legal disclaimer in <footer> (730 chars).
    // Without footer removal, Readability's retry cascade strips class weights on Pass 3
    // and the footer's longer <p> wins on raw character count. Removing <footer> first
    // fixes the cascade so the intro-box content is returned.
    const realContent = "שכירים? כאן המקום לקבל תשובות לשאלות כמו: כמה ימי מחלה עומדים לזכותי? האם מגיע לי פיצויי פיטורין? ומה עוד שכירים צריכים לדעת על זכויותיהם?";
    const fineprint = "האתר פונה לנשים וגברים כאחד. השימוש בלשון זכר נעשה מטעמי נוחות בלבד. המידע באתר הוא מידע כללי ואינו מידע מחייב ואינו תחליף לייעוץ מקצועי.";
    const html = `
      <html lang="he"><head><title>תעסוקה וזכויות עובדים</title></head>
      <body>
        <main id="content">
          <article id="bodyContent">
            <div id="mw-content-text">
              <div class="mw-parser-output">
                <div class="article-intro clearfix">
                  <div class="article-summary intro-box-wrapper">
                    <div class="intro-box">
                      <div class="intro-box-content">
                        <p>${realContent}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <h2>מהלך תקופת העבודה</h2><ul><li><a href="/he/x">ימי מחלה</a></li><li><a href="/he/y">חופשה שנתית</a></li></ul>
                <h2>זכויות לפי אוכלוסיות</h2><ul><li><a href="/he/z">עובדים זרים</a></li></ul>
              </div>
            </div>
          </article>
        </main>
        <footer class="footer layout-footer">
          <div class="footer-bottom">
            <section id="disclaimers"><p>${fineprint}</p></section>
          </div>
        </footer>
      </body></html>`;
    const result = _extractWithReadability(html);
    expect(result).not.toBeNull();
    expect(result).toContain("שכירים");
    expect(result).not.toContain("לשון זכר");
  });

  it("strips \\r characters so \\r\\n\\r\\n between paragraphs does not create blank paragraph slots", () => {
    // Source HTML with Windows-style CRLF line endings between elements.
    // Without \r stripping, \r\n\r\n produces non-consecutive \n chars that
    // \n{3,} doesn't collapse, leaving whitespace-only paragraph slots that
    // show as blank rows in the synced display.
    const html =
      "<html lang=\"he\"><body><article>" +
      "<p>פסקה ראשונה עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>\r\n\r\n" +
      "<p>פסקה שנייה עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>\r\n\r\n" +
      "<p>פסקה שלישית עם תוכן מאמר אמיתי שנמשך לפחות ארבעים תווים כדי לעמוד בסף.</p>" +
      "</article></body></html>";
    const result = _extractWithReadability(html);
    expect(result).not.toBeNull();
    const paragraphs = result!.split(/\n\n+/).filter((p) => p.trim().length > 0);
    const allParagraphs = result!.split(/\n\n+/);
    // All split pieces must have non-whitespace content — no blank-slot paragraphs
    expect(allParagraphs.every((p) => p.trim().length > 0 || p.length === 0)).toBe(true);
    expect(paragraphs.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// _extractTextFromHtml (heuristic fallback)
// ---------------------------------------------------------------------------

describe("_extractTextFromHtml", () => {
  it("extracts text from article element", () => {
    const html = `
      <html><body>
        <article>
          <p>זוהי כתבה בעברית עם תוכן חשוב שצריך להיחלץ מהדף.</p>
        </article>
      </body></html>`;
    const result = _extractTextFromHtml(html);
    expect(result).toContain("כתבה בעברית");
  });

  it("filters Hebrew noise patterns", () => {
    const html = `
      <html><body>
        <article>
          <p>תמונה: צלם ידוע</p>
          <p>תוכן המאמר האמיתי שצריך להישאר בפלט לאחר הסינון</p>
        </article>
      </body></html>`;
    const result = _extractTextFromHtml(html);
    expect(result).not.toContain("תמונה:");
    expect(result).toContain("תוכן המאמר");
  });

  it("removes script and style blocks", () => {
    const html = `
      <html><body>
        <script>var x = 1;</script>
        <style>body { color: red; }</style>
        <p>תוכן ראוי לחילוץ הנמצא בדף זה עם מספיק תווים</p>
      </body></html>`;
    const result = _extractTextFromHtml(html);
    expect(result).not.toContain("var x");
    expect(result).not.toContain("color: red");
    expect(result).toContain("תוכן ראוי");
  });
});

// ---------------------------------------------------------------------------
// _isTlsError
// ---------------------------------------------------------------------------

describe("_isTlsError", () => {
  it("returns true for error containing 'certificate'", () => {
    expect(_isTlsError(new Error("certificate verify failed"))).toBe(true);
  });

  it("returns true for error containing 'tls'", () => {
    expect(_isTlsError(new Error("tls handshake failed"))).toBe(true);
  });

  it("returns true for error containing 'ssl'", () => {
    expect(_isTlsError(new Error("ssl error occurred"))).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(_isTlsError(new Error("TLS handshake error"))).toBe(true);
    expect(_isTlsError(new Error("SSL_ERROR_RX_RECORD_TOO_LONG"))).toBe(true);
    expect(_isTlsError(new Error("Certificate expired"))).toBe(true);
  });

  it("returns false for unrelated network errors", () => {
    expect(_isTlsError(new Error("network timeout"))).toBe(false);
    expect(_isTlsError(new Error("fetch failed"))).toBe(false);
    expect(_isTlsError(new Error("404 not found"))).toBe(false);
  });

  it("handles non-Error string values", () => {
    expect(_isTlsError("tls error string")).toBe(true);
    expect(_isTlsError("network error")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// _parseCertBundle
// ---------------------------------------------------------------------------

describe("_parseCertBundle", () => {
  const CERT_A = "-----BEGIN CERTIFICATE-----\nABCDEFGHIJKLMN\n-----END CERTIFICATE-----";
  const CERT_B = "-----BEGIN CERTIFICATE-----\nOPQRSTUVWXYZAB\n-----END CERTIFICATE-----";

  it("returns empty array for empty string", () => {
    expect(_parseCertBundle("")).toEqual([]);
  });

  it("parses a single cert", () => {
    const result = _parseCertBundle(CERT_A);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("-----BEGIN CERTIFICATE-----");
    expect(result[0]).toContain("-----END CERTIFICATE-----");
    expect(result[0]).toContain("ABCDEFGHIJKLMN");
  });

  it("parses a two-cert bundle", () => {
    const result = _parseCertBundle(CERT_A + "\n" + CERT_B);
    expect(result).toHaveLength(2);
    expect(result[0]).toContain("ABCDEFGHIJKLMN");
    expect(result[1]).toContain("OPQRSTUVWXYZAB");
  });

  it("parses a five-cert bundle", () => {
    const bundle = Array.from(
      { length: 5 },
      (_, i) => `-----BEGIN CERTIFICATE-----\nCERT${i}DATA\n-----END CERTIFICATE-----`,
    ).join("\n");
    expect(_parseCertBundle(bundle)).toHaveLength(5);
  });

  it("handles extra blank lines between certs", () => {
    expect(_parseCertBundle(CERT_A + "\n\n\n" + CERT_B)).toHaveLength(2);
  });

  it("ignores segments with no BEGIN marker", () => {
    const bundle = "stray text\n-----END CERTIFICATE-----\n" + CERT_A;
    const result = _parseCertBundle(bundle);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("ABCDEFGHIJKLMN");
  });

  it("every returned cert ends with -----END CERTIFICATE-----", () => {
    const result = _parseCertBundle(CERT_A + "\n" + CERT_B);
    result.forEach((cert) => {
      expect(cert.trimEnd().endsWith("-----END CERTIFICATE-----")).toBe(true);
    });
  });
});
