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

  it("returns true for Schema.org isAccessibleForFree boolean false", () => {
    expect(_isDefinitePaywall("<html></html>", false)).toBe(true);
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
});

// ---------------------------------------------------------------------------
// _buildContentWithPreamble
// ---------------------------------------------------------------------------

describe("_buildContentWithPreamble", () => {
  const body = "גוף המאמר עם תוכן חשוב";

  it("always places title first regardless of whether it appears in content", () => {
    const content = `כותרת הכתבה\n\n${body}`;
    const result = _buildContentWithPreamble(content, "כותרת הכתבה", undefined);
    expect(result.startsWith("כותרת הכתבה")).toBe(true);
  });

  it("prepends description after title when description is not in content", () => {
    const result = _buildContentWithPreamble(body, "כותרת", "תיאור קצר של הכתבה");
    const lines = result.split("\n\n");
    expect(lines[0]).toBe("כותרת");
    expect(lines[1]).toBe("תיאור קצר של הכתבה");
    expect(result).toContain(body);
  });

  it("does not prepend description when it already appears in content", () => {
    const description = "תיאור שכבר קיים בגוף הכתבה ומופיע בהתחלה";
    const content = `${description}\n\n${body}`;
    const result = _buildContentWithPreamble(content, "כותרת", description);
    const occurrences = result.split(description).length - 1;
    expect(occurrences).toBe(1);
  });

  it("returns content unchanged when title is empty and description is in content", () => {
    const description = "תיאור שכבר קיים";
    const content = `${description}\n\n${body}`;
    const result = _buildContentWithPreamble(content, "", description);
    expect(result).toBe(content);
  });

  it("handles undefined description without error", () => {
    const result = _buildContentWithPreamble(body, "כותרת", undefined);
    expect(result).toBe(`כותרת\n\n${body}`);
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

  it("detects מנויים marker in raw HTML even when not in extracted text", () => {
    expect(_detectPaywall("רק שתי פסקאות חופשיות", '<div>תוכן זמין למנויים בלבד</div>')).toBe(true);
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
