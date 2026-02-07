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
    /<div[^>]*class="[^"]*(?:caption|credit|photo|image|img|media|video|gallery|sidebar|related|comment|ad|advertisement|promo|banner)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
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

  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<\/div>/gi, "\n");
  text = text.replace(/<\/h[1-6]>/gi, "\n\n");

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
    if (trimmed.length === 0) return false;
    if (trimmed.length < 10) return false;
    if (/^(תמונה|צילום|photo|credit|image):/i.test(trimmed)) return false;
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(trimmed)) return false;
    return true;
  });

  text = filteredLines.join("\n");
  text = text.replace(/\n\s*\n\s*\n/g, "\n\n");
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

  let title = structuredData.title || "";
  let content = "";

  const htmlExtracted = extractTextFromHtml(html);

  if (structuredData.articleBody && structuredData.articleBody.length > htmlExtracted.length * 0.7) {
    const parts = [];
    if (title) parts.push(title);
    if (structuredData.description && !structuredData.articleBody.includes(structuredData.description)) {
      parts.push(structuredData.description);
    }
    parts.push(structuredData.articleBody);
    content = parts.join("\n\n\n\n");
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
