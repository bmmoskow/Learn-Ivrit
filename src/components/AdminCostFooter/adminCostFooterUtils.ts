export function formatTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export function formatType(type: string): string {
  const labels: Record<string, string> = {
    translate: "Translation",
    define: "Definition",
    ocr: "OCR",
    passage_generation: "Passage",
  };
  return labels[type] || type;
}
