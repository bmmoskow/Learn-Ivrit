import { createJsonResponse, createErrorResponse } from "./shared.ts";

export interface ExtractUrlRequest {
  url: string;
}

/**
 * Process a JSON-LD candidate object, extracting article fields into result.
 */
function processJsonLdCandidate(
  candidate: Record<string, unknown>,
  result: { title?: string; description?: string; articleBody?: string },
): void {
  const type = candidate["@type"];
  const ARTICLE_TYPES = ["NewsArticle", "Article", "WebPage", "ReportageNewsArticle"];
  const isArticle =
    (typeof type === "string" && ARTICLE_TYPES.includes(type)) ||
    (Array.isArray(type) && type.some((t: string) => ARTICLE_TYPES.includes(t)));

  // Also accept any object that has articleBody regardless of type
  if (isArticle || candidate.articleBody) {
    if (candidate.headline && !result.title) {
      result.title = candidate.headline as string;
    }
    if (candidate.description && !result.description) {
      result.description = candidate.description as string;
    }
    if (candidate.articleBody && !result.articleBody) {
      result.articleBody = candidate.articleBody as string;
    }
  }
}

/**
 * Process a parsed JSON-LD object (may contain @graph array).
 */
function processJsonLdObject(
  jsonData: Record<string, unknown>,
  result: { title?: string; description?: string; articleBody?: string },
): void {
  const candidates = jsonData["@graph"]
    ? [...(jsonData["@graph"] as Record<string, unknown>[]), jsonData]
    : [jsonData];

  for (const candidate of candidates) {
    processJsonLdCandidate(candidate, result);
  }
}

function extractArticleStructuredData(html: string): {
  title?: string;
  description?: string;
  articleBody?: string;
} {
  const result: { title?: string; description?: string; articleBody?: string } = {};

  // 1. Standard <script type="application/ld+json"> blocks
  const jsonLdMatches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const match of jsonLdMatches) {
    try {
      processJsonLdObject(JSON.parse(match[1]), result);
    } catch {
      // Ignore JSON parse errors
    }
  }

  // 2. Next.js / Cloudflare Rocket Loader obfuscated JSON-LD
  // Sites like Maariv use Cloudflare Rocket Loader which rewrites script types.
  // The JSON-LD ends up inside: self.__next_s.push([0,{"type":"application/ld+json","children":"..."}])
  // Extract by finding the pattern and parsing the children string
  const nextLdJsonPattern = /"type"\s*:\s*"application\/ld\+json"\s*,\s*"children"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let nextMatch;
  while ((nextMatch = nextLdJsonPattern.exec(html)) !== null) {
    try {
      // The children value is a JSON string that's been escaped (quotes are \")
      // We need to unescape it first by parsing it as a JSON string value
      const childrenStr = JSON.parse(`"${nextMatch[1]}"`);
      const jsonData = JSON.parse(childrenStr);
      processJsonLdObject(jsonData, result);
    } catch {
      // Ignore parse errors
    }
  }

  // 3. Fallback: og:title and og:description meta tags
  if (!result.title) {
    const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    if (ogTitle) result.title = ogTitle[1];
  }

  if (!result.description) {
    const ogDesc = html.match(
      /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i,
    );
    if (ogDesc) result.description = ogDesc[1];
  }

  return result;
}

function extractTextFromHtml(html: string): string {
  let text = html;

  // Try to find the main article content first
  // Use GREEDY matching to capture all content within containers
  // Match specific article body containers first (e.g. ynet's ArticleBodyComponent)
  const contentMatch = text.match(/<div[^>]*(?:class="[^"]*(?:article-body|ArticleBodyComponent|ArticleBody|post-content|entry-content|story-body)[^"]*"|id="[^"]*(?:ArticleBody|article-body|ArticleBodyComponent)[^"]*")[^>]*>([\s\S]*)<\/div>/i);
  const articleMatch = text.match(/<article[^>]*>([\s\S]*)<\/article>/i);
  const mainMatch = text.match(/<main[^>]*>([\s\S]*)<\/main>/i);

  if (contentMatch) {
    text = contentMatch[1];
  } else if (articleMatch) {
    text = articleMatch[1];
  } else if (mainMatch) {
    text = mainMatch[1];
  }

  // Insert paragraph breaks before Draft.js paragraph blocks and similar patterns
  // This preserves paragraph structure from CMS editors
  text = text.replace(/<div[^>]*class="[^"]*text_editor_paragraph[^"]*"[^>]*>/gi, "\n\n");
  text = text.replace(/<div[^>]*data-block="true"[^>]*>/gi, "\n\n");

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

  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&apos;/g, "'");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&#(\d+);/g, (_match, dec) => String.fromCharCode(dec));
  text = text.replace(/&#x([0-9A-Fa-f]+);/g, (_match, hex) => String.fromCharCode(parseInt(hex, 16)));

  text = text.replace(/^[\s\S]*?<body[^>]*>/i, "");
  text = text.replace(/<\/body>[\s\S]*$/i, "");

  const lines = text.split("\n");
  const filteredLines = lines.filter((line) => {
    const trimmed = line.trim();
    if (trimmed.length === 0) return true;
    if (trimmed.length < 15) return false;
    if (/^(תמונה|צילום|photo|credit|image|עקבו|הוספת תגובה|הדפסה|מצאתם טעות|מצאתם טעות\?)/i.test(trimmed)) return false;
    if (/^(אין לשלוח|תגובות|כתבו לנו|המייל האדום)/i.test(trimmed)) return false;
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(trimmed)) return false;
    if (/^(ערוצי|ערוצים נוספים|אתרים נוספים|צור קשר|מדיניות|תנאי שימוש|מפת האתר)/i.test(trimmed)) return false;
    return true;
  });

  text = filteredLines.join("\n");

  // Normalize paragraph breaks
  text = text.replace(/\n\s*\n\s*\n+/g, "\n\n");
  text = text.replace(/\n(?=\s*[א-ת])/g, "\n\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.trim();

  return text;
}

/**
 * Normalize articleBody text into clean paragraphs.
 * Different sites use different separators between paragraphs in their JSON-LD articleBody:
 * - ynet: multiple spaces (3+) between paragraphs
 * - Maariv: \r\n between paragraphs (single line break = paragraph break)
 * - Others: tabs, double newlines, etc.
 * Since articleBody is a flat string (no HTML), any line break likely represents a paragraph boundary.
 */
function normalizeArticleBody(articleBody: string): string {
  let text = articleBody;
  // Normalize all line-break variants to \n\n (paragraph breaks)
  // In articleBody, each \r\n or \n typically represents a real paragraph boundary
  text = text.replace(/\r\n/g, "\n\n");
  // Convert remaining single \n to double (paragraph break) if not already doubled
  text = text.replace(/(?<!\n)\n(?!\n)/g, "\n\n");
  // Convert sequences of 2+ spaces to paragraph breaks (ynet pattern)
  text = text.replace(/ {2,}/g, "\n\n");
  // Convert tabs to paragraph breaks
  text = text.replace(/\t+/g, "\n\n");
  // Clean up excessive breaks
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

export async function handleExtractUrl(req: Request): Promise<Response> {
  const { url: targetUrl }: ExtractUrlRequest = await req.json();

  if (!targetUrl) {
    return createErrorResponse("URL is required", 400);
  }

  const urlToFetch = targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`;
  console.log("Fetching URL:", urlToFetch);

  const response = await fetch(urlToFetch, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "he,en-US;q=0.9,en;q=0.8",
    },
  });

  console.log("Response status:", response.status);

  if (!response.ok) {
    throw new Error(`Failed to fetch URL (${response.status}): ${response.statusText}`);
  }

  const html = await response.text();
  console.log("HTML length:", html.length);

  if (html.length < 100) {
    throw new Error("Received too little content from URL");
  }

  const structuredData = extractArticleStructuredData(html);
  console.log("Structured data found:", {
    title: structuredData.title ? `${structuredData.title.substring(0, 50)}...` : undefined,
    description: structuredData.description ? `${structuredData.description.substring(0, 50)}...` : undefined,
    articleBody: structuredData.articleBody ? `length: ${structuredData.articleBody.length}` : undefined,
  });




  const htmlExtracted = extractTextFromHtml(html);

  let title = structuredData.title || "";
  let content = "";

  // Decide between HTML extraction and articleBody
  // HTML extraction preserves paragraph structure via <p> tags but may fail on some sites
  // (e.g. Maariv) where the article body is only available via JSON-LD articleBody.
  // articleBody is a flat string that often loses paragraph boundaries.
  const normalizedArticleBody = structuredData.articleBody
    ? normalizeArticleBody(structuredData.articleBody)
    : "";

  const htmlIsSubstantial = htmlExtracted && htmlExtracted.length > 100;
  const htmlParagraphs = htmlExtracted ? htmlExtracted.split(/\n\n+/).filter(p => p.trim().length > 0).length : 0;
  const articleBodyParagraphs = normalizedArticleBody ? normalizedArticleBody.split(/\n\n+/).filter(p => p.trim().length > 0).length : 0;

  // Prefer HTML extraction when:
  // 1. It has substantial content, AND
  // 2. It has more paragraphs than articleBody (meaning HTML preserved structure that articleBody lost), OR
  //    articleBody isn't substantially longer (meaning HTML captured the full content)
  const htmlHasBetterStructure = htmlParagraphs > articleBodyParagraphs;
  const articleBodyIsMuchLonger = normalizedArticleBody.length > htmlExtracted.length * 1.5;
  const preferHtml = htmlIsSubstantial && (htmlHasBetterStructure || !articleBodyIsMuchLonger);

  console.log("Content decision:", {
    htmlLen: htmlExtracted.length, htmlParas: htmlParagraphs,
    abLen: normalizedArticleBody.length, abParas: articleBodyParagraphs,
    preferHtml,
  });

  if (preferHtml) {
    content = htmlExtracted;
    // Prepend title and description if not already included in the extracted content
    const preamble: string[] = [];
    if (title) {
      const titleStart = title.substring(0, 40);
      if (!content.includes(titleStart)) {
        preamble.push(title);
      }
    }
    if (structuredData.description) {
      const descStart = structuredData.description.substring(0, 50);
      if (!content.includes(descStart)) {
        preamble.push(structuredData.description);
      }
    }
    if (preamble.length > 0) {
      content = preamble.join("\n\n") + "\n\n" + content;
    }
    console.log("Using HTML extraction, length:", content.length);
  } else if (normalizedArticleBody.length > 0) {
    // Use articleBody — prepend title and description
    const preamble: string[] = [];
    if (title) preamble.push(title);
    if (structuredData.description) {
      const descStart = structuredData.description.substring(0, 50);
      if (!normalizedArticleBody.includes(descStart)) {
        preamble.push(structuredData.description);
      }
    }
    content = preamble.length > 0
      ? preamble.join("\n\n") + "\n\n" + normalizedArticleBody
      : normalizedArticleBody;
    console.log("Using articleBody, paragraphs:", content.split(/\n\n+/).length);
  } else {
    content = htmlExtracted;
  }

  if (!title) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    title = titleMatch ? titleMatch[1].trim() : "Untitled";
  }

  if (!content || content.length < 50) {
    throw new Error(
      "Failed to extract readable content from URL. The page might not be an article or is blocking extraction.",
    );
  }

  return createJsonResponse({
    title,
    content,
    excerpt: content.substring(0, 200),
  });
}
