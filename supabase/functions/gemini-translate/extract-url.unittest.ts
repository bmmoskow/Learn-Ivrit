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
  _extractWithReadability,
  _hebrewDensity,
  _checkQualityGate,
  _detectPaywall,
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
