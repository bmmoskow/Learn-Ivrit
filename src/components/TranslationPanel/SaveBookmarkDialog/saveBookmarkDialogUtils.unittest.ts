import { describe, it, expect } from "vitest";
import {
  validateBookmarkName,
  validateFolderName,
  toggleFolderInSet,
  truncateSource,
} from "./saveBookmarkDialogUtils";

describe("saveBookmarkDialogUtils", () => {
  describe("validateBookmarkName", () => {
    it("returns valid for non-empty name", () => {
      const result = validateBookmarkName("My Bookmark");
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it("returns invalid for empty string", () => {
      const result = validateBookmarkName("");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Please enter a name for the bookmark");
    });

    it("returns invalid for whitespace-only string", () => {
      const result = validateBookmarkName("   ");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Please enter a name for the bookmark");
    });

    it("returns valid for name with leading/trailing whitespace", () => {
      const result = validateBookmarkName("  Valid Name  ");
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it("returns invalid for name exceeding 200 characters", () => {
      const longName = "a".repeat(201);
      const result = validateBookmarkName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Bookmark name must be 200 characters or less");
    });

    it("returns valid for exactly 200 characters", () => {
      const exactName = "a".repeat(200);
      const result = validateBookmarkName(exactName);
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe("validateFolderName", () => {
    it("returns valid for non-empty name", () => {
      const result = validateFolderName("My Folder");
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it("returns invalid for empty string", () => {
      const result = validateFolderName("");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Please enter a folder name");
    });

    it("returns invalid for whitespace-only string", () => {
      const result = validateFolderName("   ");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Please enter a folder name");
    });

    it("returns invalid for name exceeding 100 characters", () => {
      const longName = "a".repeat(101);
      const result = validateFolderName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Folder name must be 100 characters or less");
    });

    it("returns valid for exactly 100 characters", () => {
      const exactName = "a".repeat(100);
      const result = validateFolderName(exactName);
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe("toggleFolderInSet", () => {
    it("adds folder ID to empty set", () => {
      const set = new Set<string>();
      const result = toggleFolderInSet(set, "folder-1");
      expect(result.has("folder-1")).toBe(true);
      expect(result.size).toBe(1);
    });

    it("adds folder ID to non-empty set", () => {
      const set = new Set<string>(["folder-1"]);
      const result = toggleFolderInSet(set, "folder-2");
      expect(result.has("folder-1")).toBe(true);
      expect(result.has("folder-2")).toBe(true);
      expect(result.size).toBe(2);
    });

    it("removes folder ID if already present", () => {
      const set = new Set<string>(["folder-1", "folder-2"]);
      const result = toggleFolderInSet(set, "folder-1");
      expect(result.has("folder-1")).toBe(false);
      expect(result.has("folder-2")).toBe(true);
      expect(result.size).toBe(1);
    });

    it("does not mutate original set", () => {
      const original = new Set<string>(["folder-1"]);
      const result = toggleFolderInSet(original, "folder-1");
      expect(original.has("folder-1")).toBe(true);
      expect(result.has("folder-1")).toBe(false);
    });
  });

  describe("truncateSource", () => {
    it("returns unchanged string if within limit", () => {
      const result = truncateSource("Short source");
      expect(result).toBe("Short source");
    });

    it("truncates long string with ellipsis", () => {
      const longSource = "a".repeat(60);
      const result = truncateSource(longSource, 50);
      expect(result.length).toBe(50);
      expect(result.endsWith("...")).toBe(true);
    });

    it("returns unchanged string at exact limit", () => {
      const exactSource = "a".repeat(50);
      const result = truncateSource(exactSource, 50);
      expect(result).toBe(exactSource);
    });

    it("uses default max length of 50", () => {
      const longSource = "a".repeat(60);
      const result = truncateSource(longSource);
      expect(result.length).toBe(50);
    });

    it("handles custom max length", () => {
      const source = "This is a test source string";
      const result = truncateSource(source, 10);
      expect(result).toBe("This is...");
    });
  });
});
