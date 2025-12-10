import { describe, it, expect } from "vitest";
import {
  getErrorMessage,
  filterBookmarksByFolder,
  filterSubfolders,
  removeFolder,
  removeBookmark,
  removeBookmarksInFolder,
  updateFolderName,
  updateBookmarkName,
  updateBookmarkFolder,
  type Bookmark,
  type BookmarkFolder,
} from "./bookmarksUtils";

describe("bookmarksUtils", () => {
  describe("getErrorMessage", () => {
    it('returns duplicate error message for code "23505"', () => {
      expect(getErrorMessage("23505", "folder")).toBe(
        "A folder with this name already exists in this location"
      );
      expect(getErrorMessage("23505", "bookmark")).toBe(
        "A bookmark with this name already exists in this location"
      );
    });

    it("returns generic error message for unknown code", () => {
      expect(getErrorMessage("12345", "folder")).toBe("Failed to process folder");
      expect(getErrorMessage(undefined, "bookmark")).toBe("Failed to process bookmark");
    });
  });

  describe("filterBookmarksByFolder", () => {
    const bookmarks: Bookmark[] = [
      {
        id: "b1",
        user_id: "u1",
        folder_id: "f1",
        name: "Bookmark 1",
        hebrew_text: "text1",
        source: null,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
      {
        id: "b2",
        user_id: "u1",
        folder_id: "f1",
        name: "Bookmark 2",
        hebrew_text: "text2",
        source: null,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
      {
        id: "b3",
        user_id: "u1",
        folder_id: "f2",
        name: "Bookmark 3",
        hebrew_text: "text3",
        source: null,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
      {
        id: "b4",
        user_id: "u1",
        folder_id: null,
        name: "Bookmark 4",
        hebrew_text: "text4",
        source: null,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
    ];

    it("filters bookmarks by folder id", () => {
      const result = filterBookmarksByFolder(bookmarks, "f1");
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("b1");
      expect(result[1].id).toBe("b2");
    });

    it("filters bookmarks with null folder id", () => {
      const result = filterBookmarksByFolder(bookmarks, null);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("b4");
    });

    it("returns empty array when no matches", () => {
      const result = filterBookmarksByFolder(bookmarks, "nonexistent");
      expect(result).toHaveLength(0);
    });
  });

  describe("filterSubfolders", () => {
    const folders: BookmarkFolder[] = [
      {
        id: "f1",
        user_id: "u1",
        name: "Folder 1",
        parent_folder_id: null,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
      {
        id: "f2",
        user_id: "u1",
        name: "Folder 2",
        parent_folder_id: "f1",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
      {
        id: "f3",
        user_id: "u1",
        name: "Folder 3",
        parent_folder_id: "f1",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
      {
        id: "f4",
        user_id: "u1",
        name: "Folder 4",
        parent_folder_id: "f2",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
    ];

    it("filters subfolders by parent id", () => {
      const result = filterSubfolders(folders, "f1");
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("f2");
      expect(result[1].id).toBe("f3");
    });

    it("filters root folders (null parent)", () => {
      const result = filterSubfolders(folders, null);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("f1");
    });

    it("returns empty array when no matches", () => {
      const result = filterSubfolders(folders, "nonexistent");
      expect(result).toHaveLength(0);
    });
  });

  describe("removeFolder", () => {
    const folders: BookmarkFolder[] = [
      {
        id: "f1",
        user_id: "u1",
        name: "Folder 1",
        parent_folder_id: null,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
      {
        id: "f2",
        user_id: "u1",
        name: "Folder 2",
        parent_folder_id: null,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
    ];

    it("removes folder by id", () => {
      const result = removeFolder(folders, "f1");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("f2");
    });

    it("returns unchanged array if id not found", () => {
      const result = removeFolder(folders, "nonexistent");
      expect(result).toHaveLength(2);
    });
  });

  describe("removeBookmark", () => {
    const bookmarks: Bookmark[] = [
      {
        id: "b1",
        user_id: "u1",
        folder_id: null,
        name: "Bookmark 1",
        hebrew_text: "text1",
        source: null,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
      {
        id: "b2",
        user_id: "u1",
        folder_id: null,
        name: "Bookmark 2",
        hebrew_text: "text2",
        source: null,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
    ];

    it("removes bookmark by id", () => {
      const result = removeBookmark(bookmarks, "b1");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("b2");
    });

    it("returns unchanged array if id not found", () => {
      const result = removeBookmark(bookmarks, "nonexistent");
      expect(result).toHaveLength(2);
    });
  });

  describe("removeBookmarksInFolder", () => {
    const bookmarks: Bookmark[] = [
      {
        id: "b1",
        user_id: "u1",
        folder_id: "f1",
        name: "Bookmark 1",
        hebrew_text: "text1",
        source: null,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
      {
        id: "b2",
        user_id: "u1",
        folder_id: "f1",
        name: "Bookmark 2",
        hebrew_text: "text2",
        source: null,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
      {
        id: "b3",
        user_id: "u1",
        folder_id: "f2",
        name: "Bookmark 3",
        hebrew_text: "text3",
        source: null,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
    ];

    it("removes all bookmarks in folder", () => {
      const result = removeBookmarksInFolder(bookmarks, "f1");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("b3");
    });

    it("returns unchanged array if folder id not found", () => {
      const result = removeBookmarksInFolder(bookmarks, "nonexistent");
      expect(result).toHaveLength(3);
    });
  });

  describe("updateFolderName", () => {
    const folders: BookmarkFolder[] = [
      {
        id: "f1",
        user_id: "u1",
        name: "Old Name",
        parent_folder_id: null,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
      {
        id: "f2",
        user_id: "u1",
        name: "Other Folder",
        parent_folder_id: null,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
    ];

    it("updates folder name", () => {
      const result = updateFolderName(folders, "f1", "New Name");
      expect(result[0].name).toBe("New Name");
      expect(result[1].name).toBe("Other Folder");
    });

    it("returns unchanged array if id not found", () => {
      const result = updateFolderName(folders, "nonexistent", "New Name");
      expect(result[0].name).toBe("Old Name");
      expect(result[1].name).toBe("Other Folder");
    });
  });

  describe("updateBookmarkName", () => {
    const bookmarks: Bookmark[] = [
      {
        id: "b1",
        user_id: "u1",
        folder_id: null,
        name: "Old Name",
        hebrew_text: "text1",
        source: null,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
      {
        id: "b2",
        user_id: "u1",
        folder_id: null,
        name: "Other Bookmark",
        hebrew_text: "text2",
        source: null,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
    ];

    it("updates bookmark name", () => {
      const result = updateBookmarkName(bookmarks, "b1", "New Name");
      expect(result[0].name).toBe("New Name");
      expect(result[1].name).toBe("Other Bookmark");
    });

    it("returns unchanged array if id not found", () => {
      const result = updateBookmarkName(bookmarks, "nonexistent", "New Name");
      expect(result[0].name).toBe("Old Name");
      expect(result[1].name).toBe("Other Bookmark");
    });
  });

  describe("updateBookmarkFolder", () => {
    const bookmarks: Bookmark[] = [
      {
        id: "b1",
        user_id: "u1",
        folder_id: "f1",
        name: "Bookmark 1",
        hebrew_text: "text1",
        source: null,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
      {
        id: "b2",
        user_id: "u1",
        folder_id: null,
        name: "Bookmark 2",
        hebrew_text: "text2",
        source: null,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
    ];

    it("updates bookmark folder", () => {
      const result = updateBookmarkFolder(bookmarks, "b1", "f2");
      expect(result[0].folder_id).toBe("f2");
      expect(result[1].folder_id).toBe(null);
    });

    it("can set folder to null", () => {
      const result = updateBookmarkFolder(bookmarks, "b1", null);
      expect(result[0].folder_id).toBe(null);
    });

    it("returns unchanged array if id not found", () => {
      const result = updateBookmarkFolder(bookmarks, "nonexistent", "f2");
      expect(result[0].folder_id).toBe("f1");
      expect(result[1].folder_id).toBe(null);
    });
  });
});
