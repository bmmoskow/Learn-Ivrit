import { describe, it, expect } from "vitest";
import { formatTokens, formatType } from "./adminCostFooterUtils";

describe("formatTokens", () => {
  it("returns plain number for values under 1000", () => {
    expect(formatTokens(500)).toBe("500");
  });

  it("formats 1000 as 1.0k", () => {
    expect(formatTokens(1000)).toBe("1.0k");
  });

  it("formats 1500 as 1.5k", () => {
    expect(formatTokens(1500)).toBe("1.5k");
  });

  it("formats 2000 as 2.0k", () => {
    expect(formatTokens(2000)).toBe("2.0k");
  });

  it("returns '0' for zero", () => {
    expect(formatTokens(0)).toBe("0");
  });
});

describe("formatType", () => {
  it("maps 'translate' to 'Translation'", () => {
    expect(formatType("translate")).toBe("Translation");
  });

  it("maps 'define' to 'Definition'", () => {
    expect(formatType("define")).toBe("Definition");
  });

  it("maps 'ocr' to 'OCR'", () => {
    expect(formatType("ocr")).toBe("OCR");
  });

  it("maps 'passage_generation' to 'Passage'", () => {
    expect(formatType("passage_generation")).toBe("Passage");
  });

  it("returns unknown types as-is", () => {
    expect(formatType("unknown_type")).toBe("unknown_type");
  });
});
