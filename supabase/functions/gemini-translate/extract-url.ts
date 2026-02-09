import { createJsonResponse, createErrorResponse } from "./shared.ts";

export interface ExtractUrlRequest {
  url: string;
}

function extractArticleStructuredData(html: string): {
  title?: string;
  description?: string;
  articleBody?: string;
} {
  const result: { title?: string; description?: string; articleBody?: string } = {};

  const jsonLdMatches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );

  for (const match of jsonLdMatches) {
    try {
      const jsonData = JSON.parse(match[1]);

      if (jsonData["@type"] === "NewsArticle" || jsonData["@type"] === "Article") {
        if (jsonData.headline && !result.title) {
          result.title = jsonData.headline;
        }
        if (jsonData.description && !result.description) {
          result.description = jsonData.description;
        }
        if (jsonData.articleBody && !result.articleBody) {
          result.articleBody = jsonData.articleBody;
        }
      }
    } catch {
      // Ignore JSON parse errors for structured data extraction
    }
  }

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
  text = text.replace(/<\/div>/gi, "\n\n"); // Changed from \n to \n\n
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
    // Filter trailing site UI text
    if (/^(אין לשלוח|תגובות|כתבו לנו|המייל האדום)/i.test(trimmed)) return false;
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(trimmed)) return false;
    // Filter common navigation/UI text
    if (/^(ערוצי|ערוצים נוספים|אתרים נוספים|צור קשר|מדיניות|תנאי שימוש|מפת האתר)/i.test(trimmed)) return false;
    return true;
  });

  text = filteredLines.join("\n");

  // Normalize paragraph breaks: multiple newlines become exactly two
  text = text.replace(/\n\s*\n\s*\n+/g, "\n\n");
  // Single newlines followed by content that looks like a new paragraph (starts with capital or Hebrew letter after whitespace)
  // Keep single newlines that are actually paragraph breaks
  text = text.replace(/\n(?=\s*[א-ת])/g, "\n\n");
  // Clean up excessive breaks
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.trim();

  return text;
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
  console.log("Structured data found:", structuredData);

  const htmlExtracted = extractTextFromHtml(html);

  let title = structuredData.title || "";
  let content = "";

  // Always prefer HTML extraction as it preserves paragraph structure with \n\n breaks
  // JSON-LD articleBody often collapses all paragraphs into a single string
  // Only use articleBody if HTML extraction completely failed
  if (htmlExtracted && htmlExtracted.length > 100) {
    content = htmlExtracted;
    // Some sites (e.g. ynet) put the title and first paragraph/subtitle outside the article body container
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
  } else if (structuredData.articleBody) {
    // Fallback to articleBody only if HTML extraction failed
    // Many sites (e.g. ynet) separate paragraphs with multiple spaces in articleBody
    let articleText = structuredData.articleBody;
    // Convert sequences of 3+ whitespace chars (spaces/tabs) to paragraph breaks
    articleText = articleText.replace(/ {3,}/g, "\n\n");
    // Also handle tab-separated paragraphs
    articleText = articleText.replace(/\t+/g, "\n\n");
    // Clean up excessive breaks
    articleText = articleText.replace(/\n{3,}/g, "\n\n");

    content = articleText.trim();
    console.log("Using articleBody fallback with space-to-paragraph conversion");
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
