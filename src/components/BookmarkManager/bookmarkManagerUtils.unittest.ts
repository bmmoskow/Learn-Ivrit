import { describe, it, expect } from "vitest";
import {
  toggleFolderExpanded,
  getBookmarksInFolder,
  getSubfolders,
  folderHasContents,
  countFolderContents,
  isValidFolderName,
  isValidBookmarkName,
} from "./bookmarkManagerUtils";
import { BookmarkFolder, Bookmark } from "../../hooks/useBookmarks";

// Mock data
const mockFolders: BookmarkFolder[] = [
  {
    id: "folder-1",
    user_id: "user-1",
    name: "Torah",
    parent_folder_id: null,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "folder-2",
    user_id: "user-1",
    name: "Genesis",
    parent_folder_id: "folder-1",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "folder-3",
    user_id: "user-1",
    name: "Exodus",
    parent_folder_id: "folder-1",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "folder-4",
    user_id: "user-1",
    name: "Prophets",
    parent_folder_id: null,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
];

const mockBookmarks: Bookmark[] = [
  {
    id: "bookmark-1",
    user_id: "user-1",
    folder_id: null,
    name: "Shema",
    hebrew_text: "שמע ישראל",
    source: "Deuteronomy 6:4",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "bookmark-2",
    user_id: "user-1",
    folder_id: "folder-1",
    name: "Bereshit",
    hebrew_text: "בראשית ברא אלהים",
    source: "Genesis 1:1",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "bookmark-3",
    user_id: "user-1",
    folder_id: "folder-2",
    name: "Creation",
    hebrew_text: "ויהי אור",
    source: "Genesis 1:3",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
];

describe("bookmarkManagerUtils", () => {
  describe("toggleFolderExpanded", () => {
    it("should add folder to set when not present", () => {
      const initial = new Set<string>();
      const result = toggleFolderExpanded(initial, "folder-1");
      expect(result.has("folder-1")).toBe(true);
      expect(result.size).toBe(1);
    });

    it("should remove folder from set when present", () => {
      const initial = new Set(["folder-1", "folder-2"]);
      const result = toggleFolderExpanded(initial, "folder-1");
      expect(result.has("folder-1")).toBe(false);
      expect(result.has("folder-2")).toBe(true);
      expect(result.size).toBe(1);
    });

    it("should not mutate original set", () => {
      const initial = new Set(["folder-1"]);
      toggleFolderExpanded(initial, "folder-1");
      expect(initial.has("folder-1")).toBe(true);
    });
  });

  describe("getBookmarksInFolder", () => {
    it("should return bookmarks in root folder (null)", () => {
      const result = getBookmarksInFolder(mockBookmarks, null);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("bookmark-1");
    });

    it("should return bookmarks in specific folder", () => {
      const result = getBookmarksInFolder(mockBookmarks, "folder-1");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("bookmark-2");
    });

    it("should return empty array for folder with no bookmarks", () => {
      const result = getBookmarksInFolder(mockBookmarks, "folder-4");
      expect(result).toHaveLength(0);
    });
  });

  describe("getSubfolders", () => {
    it("should return root folders (null parent)", () => {
      const result = getSubfolders(mockFolders, null);
      expect(result).toHaveLength(2);
      expect(result.map((f) => f.id)).toContain("folder-1");
      expect(result.map((f) => f.id)).toContain("folder-4");
    });

    it("should return subfolders of specific folder", () => {
      const result = getSubfolders(mockFolders, "folder-1");
      expect(result).toHaveLength(2);
      expect(result.map((f) => f.name)).toContain("Genesis");
      expect(result.map((f) => f.name)).toContain("Exodus");
    });

    it("should return empty array for folder with no subfolders", () => {
      const result = getSubfolders(mockFolders, "folder-2");
      expect(result).toHaveLength(0);
    });
  });

  describe("folderHasContents", () => {
    it("should return true when folder has subfolders", () => {
      const result = folderHasContents(mockFolders, mockBookmarks, "folder-1");
      expect(result).toBe(true);
    });

    it("should return true when folder has bookmarks", () => {
      const result = folderHasContents(mockFolders, mockBookmarks, "folder-2");
      expect(result).toBe(true);
    });

    it("should return false when folder is empty", () => {
      const result = folderHasContents(mockFolders, mockBookmarks, "folder-4");
      expect(result).toBe(false);
    });
  });

  describe("countFolderContents", () => {
    it("should count direct bookmarks", () => {
      const result = countFolderContents(mockFolders, mockBookmarks, "folder-2");
      expect(result.bookmarks).toBe(1);
      expect(result.folders).toBe(0);
    });

    it("should count subfolders and nested bookmarks recursively", () => {
      const result = countFolderContents(mockFolders, mockBookmarks, "folder-1");
      expect(result.folders).toBe(2); // Genesis and Exodus
      expect(result.bookmarks).toBe(2); // Bereshit + Creation (nested)
    });

    it("should return zeros for empty folder", () => {
      const result = countFolderContents(mockFolders, mockBookmarks, "folder-4");
      expect(result.folders).toBe(0);
      expect(result.bookmarks).toBe(0);
    });
  });

  describe("isValidFolderName", () => {
    it("should return true for valid names", () => {
      expect(isValidFolderName("Torah")).toBe(true);
      expect(isValidFolderName("My Folder")).toBe(true);
      expect(isValidFolderName(" Trimmed ")).toBe(true);
    });

    it("should return false for empty or whitespace-only names", () => {
      expect(isValidFolderName("")).toBe(false);
      expect(isValidFolderName("   ")).toBe(false);
      expect(isValidFolderName("\t\n")).toBe(false);
    });
  });

  describe("isValidBookmarkName", () => {
    it("should return true for valid names", () => {
      expect(isValidBookmarkName("Shema")).toBe(true);
      expect(isValidBookmarkName("Genesis 1:1")).toBe(true);
    });

    it("should return false for empty or whitespace-only names", () => {
      expect(isValidBookmarkName("")).toBe(false);
      expect(isValidBookmarkName("   ")).toBe(false);
    });
  });
});
