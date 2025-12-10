import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useBookmarks } from "./useBookmarks";
import { supabase } from "../../../supabase/client";
import { useAuth } from "../../contexts/AuthContext/AuthContext";
import type { BookmarkFolder, Bookmark } from "./bookmarksUtils";

vi.mock("../../../supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock("../../contexts/AuthContext/AuthContext", () => ({
  useAuth: vi.fn(),
}));

describe("useBookmarks", () => {
  const mockUser = { id: "user-1" };

  const mockFolders: BookmarkFolder[] = [
    {
      id: "f1",
      user_id: "user-1",
      name: "Folder 1",
      parent_folder_id: null,
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    },
    {
      id: "f2",
      user_id: "user-1",
      name: "Folder 2",
      parent_folder_id: "f1",
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    },
  ];

  const mockBookmarks: Bookmark[] = [
    {
      id: "b1",
      user_id: "user-1",
      folder_id: "f1",
      name: "Bookmark 1",
      hebrew_text: "שלום",
      source: "Genesis 1:1",
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    },
    {
      id: "b2",
      user_id: "user-1",
      folder_id: null,
      name: "Bookmark 2",
      hebrew_text: "תודה",
      source: null,
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: mockUser });
  });

  const mockSupabaseQuery = (data: any, error: any = null) => {
    const queryMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data, error }),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data, error }),
    };
    (supabase.from as any).mockReturnValue(queryMock);
    return queryMock;
  };

  describe("initial state", () => {
    it("initializes with empty arrays", () => {
      (useAuth as any).mockReturnValue({ user: null });
      const { result } = renderHook(() => useBookmarks());

      expect(result.current.folders).toEqual([]);
      expect(result.current.bookmarks).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it("fetches data when user is present", async () => {
      const queryMock = mockSupabaseQuery(null);
      queryMock.order.mockImplementation((field) => {
        if (field === "name") {
          const tableName = (supabase.from as any).mock.calls[
            (supabase.from as any).mock.calls.length - 1
          ][0];
          return Promise.resolve({
            data: tableName === "bookmark_folders" ? mockFolders : mockBookmarks,
            error: null,
          });
        }
        return queryMock;
      });

      const { result } = renderHook(() => useBookmarks());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.folders).toHaveLength(2);
      expect(result.current.bookmarks).toHaveLength(2);
    });
  });

  describe("createFolder", () => {
    it("creates a new folder successfully", async () => {
      const newFolder: BookmarkFolder = {
        id: "f3",
        user_id: "user-1",
        name: "New Folder",
        parent_folder_id: null,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };

      const queryMock = mockSupabaseQuery(null);
      queryMock.order.mockResolvedValue({ data: [], error: null });
      queryMock.single.mockResolvedValue({ data: newFolder, error: null });

      const { result } = renderHook(() => useBookmarks());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let createdFolder: BookmarkFolder | null = null;
      await act(async () => {
        createdFolder = await result.current.createFolder("New Folder");
      });

      expect(createdFolder).toEqual(newFolder);
    });

    it("handles duplicate folder name error", async () => {
      const error = { code: "23505", message: "Duplicate" };
      const queryMock = mockSupabaseQuery(null);
      queryMock.order.mockResolvedValue({ data: [], error: null });
      queryMock.single.mockResolvedValue({ data: null, error });

      const { result } = renderHook(() => useBookmarks());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        const folder = await result.current.createFolder("Duplicate");
        expect(folder).toBeNull();
      });

      expect(result.current.error).toBe("A folder with this name already exists in this location");
    });

    it("returns null when user is not logged in", async () => {
      (useAuth as any).mockReturnValue({ user: null });
      const { result } = renderHook(() => useBookmarks());

      const folder = await result.current.createFolder("Test");
      expect(folder).toBeNull();
    });
  });

  describe("deleteFolder", () => {
    it("deletes folder successfully", async () => {
      const queryMock = mockSupabaseQuery(null);
      queryMock.order.mockResolvedValue({ data: mockFolders, error: null });
      queryMock.eq.mockImplementation(() => ({
        ...queryMock,
        eq: queryMock.eq,
      }));

      const { result } = renderHook(() => useBookmarks());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success = false;
      await act(async () => {
        success = await result.current.deleteFolder("f1");
      });

      expect(success).toBe(true);
    });

    it("returns false when user is not logged in", async () => {
      (useAuth as any).mockReturnValue({ user: null });
      const { result } = renderHook(() => useBookmarks());

      const success = await result.current.deleteFolder("f1");
      expect(success).toBe(false);
    });
  });

  describe("renameFolder", () => {
    it("renames folder successfully", async () => {
      const queryMock = mockSupabaseQuery(null);
      queryMock.order.mockResolvedValue({ data: mockFolders, error: null });
      queryMock.eq.mockImplementation(() => ({
        ...queryMock,
        eq: queryMock.eq,
      }));

      const { result } = renderHook(() => useBookmarks());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success = false;
      await act(async () => {
        success = await result.current.renameFolder("f1", "Renamed");
      });

      expect(success).toBe(true);
    });

    it("handles duplicate name error", async () => {
      const error = { code: "23505", message: "Duplicate" };
      const queryMock = mockSupabaseQuery(null);
      queryMock.order.mockResolvedValue({ data: mockFolders, error: null });
      queryMock.eq.mockImplementation(() => ({
        ...queryMock,
        eq: vi.fn().mockResolvedValue({ data: null, error }),
      }));

      const { result } = renderHook(() => useBookmarks());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        const success = await result.current.renameFolder("f1", "Duplicate");
        expect(success).toBe(false);
      });

      expect(result.current.error).toBe("A folder with this name already exists in this location");
    });
  });

  describe("createBookmark", () => {
    it("creates a new bookmark successfully", async () => {
      const newBookmark: Bookmark = {
        id: "b3",
        user_id: "user-1",
        folder_id: "f1",
        name: "New Bookmark",
        hebrew_text: "ברא",
        source: "Genesis 1:1",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };

      const queryMock = mockSupabaseQuery(null);
      queryMock.order.mockResolvedValue({ data: [], error: null });
      queryMock.single.mockResolvedValue({ data: newBookmark, error: null });

      const { result } = renderHook(() => useBookmarks());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let createdBookmark: Bookmark | null = null;
      await act(async () => {
        createdBookmark = await result.current.createBookmark("New Bookmark", "ברא", "Genesis 1:1", "f1");
      });

      expect(createdBookmark).toEqual(newBookmark);
    });

    it("returns null when user is not logged in", async () => {
      (useAuth as any).mockReturnValue({ user: null });
      const { result } = renderHook(() => useBookmarks());

      const bookmark = await result.current.createBookmark("Test", "text", null);
      expect(bookmark).toBeNull();
    });
  });

  describe("deleteBookmark", () => {
    it("deletes bookmark successfully", async () => {
      const queryMock = mockSupabaseQuery(null);
      queryMock.order.mockResolvedValue({ data: mockBookmarks, error: null });
      queryMock.eq.mockImplementation(() => ({
        ...queryMock,
        eq: queryMock.eq,
      }));

      const { result } = renderHook(() => useBookmarks());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success = false;
      await act(async () => {
        success = await result.current.deleteBookmark("b1");
      });

      expect(success).toBe(true);
    });
  });

  describe("renameBookmark", () => {
    it("renames bookmark successfully", async () => {
      const queryMock = mockSupabaseQuery(null);
      queryMock.order.mockResolvedValue({ data: mockBookmarks, error: null });
      queryMock.eq.mockImplementation(() => ({
        ...queryMock,
        eq: queryMock.eq,
      }));

      const { result } = renderHook(() => useBookmarks());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success = false;
      await act(async () => {
        success = await result.current.renameBookmark("b1", "Renamed");
      });

      expect(success).toBe(true);
    });
  });

  describe("moveBookmark", () => {
    it("moves bookmark to different folder", async () => {
      const queryMock = mockSupabaseQuery(null);
      queryMock.order.mockResolvedValue({ data: mockBookmarks, error: null });
      queryMock.eq.mockImplementation(() => ({
        ...queryMock,
        eq: queryMock.eq,
      }));

      const { result } = renderHook(() => useBookmarks());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success = false;
      await act(async () => {
        success = await result.current.moveBookmark("b1", "f2");
      });

      expect(success).toBe(true);
    });
  });

  describe("getBookmarksInFolder", () => {
    it("returns bookmarks in specified folder", async () => {
      const queryMock = mockSupabaseQuery(null);
      queryMock.order.mockImplementation(() => {
        const tableName = (supabase.from as any).mock.calls[
          (supabase.from as any).mock.calls.length - 1
        ][0];
        return Promise.resolve({
          data: tableName === "bookmark_folders" ? mockFolders : mockBookmarks,
          error: null,
        });
      });

      const { result } = renderHook(() => useBookmarks());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const bookmarksInF1 = result.current.getBookmarksInFolder("f1");
      expect(bookmarksInF1).toHaveLength(1);
      expect(bookmarksInF1[0].id).toBe("b1");
    });

    it("returns bookmarks with no folder", async () => {
      const queryMock = mockSupabaseQuery(null);
      queryMock.order.mockImplementation(() => {
        const tableName = (supabase.from as any).mock.calls[
          (supabase.from as any).mock.calls.length - 1
        ][0];
        return Promise.resolve({
          data: tableName === "bookmark_folders" ? mockFolders : mockBookmarks,
          error: null,
        });
      });

      const { result } = renderHook(() => useBookmarks());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const rootBookmarks = result.current.getBookmarksInFolder(null);
      expect(rootBookmarks).toHaveLength(1);
      expect(rootBookmarks[0].id).toBe("b2");
    });
  });

  describe("getSubfolders", () => {
    it("returns subfolders of specified parent", async () => {
      const queryMock = mockSupabaseQuery(null);
      queryMock.order.mockImplementation(() => {
        const tableName = (supabase.from as any).mock.calls[
          (supabase.from as any).mock.calls.length - 1
        ][0];
        return Promise.resolve({
          data: tableName === "bookmark_folders" ? mockFolders : mockBookmarks,
          error: null,
        });
      });

      const { result } = renderHook(() => useBookmarks());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const subfoldersOfF1 = result.current.getSubfolders("f1");
      expect(subfoldersOfF1).toHaveLength(1);
      expect(subfoldersOfF1[0].id).toBe("f2");
    });

    it("returns root folders", async () => {
      const queryMock = mockSupabaseQuery(null);
      queryMock.order.mockImplementation(() => {
        const tableName = (supabase.from as any).mock.calls[
          (supabase.from as any).mock.calls.length - 1
        ][0];
        return Promise.resolve({
          data: tableName === "bookmark_folders" ? mockFolders : mockBookmarks,
          error: null,
        });
      });

      const { result } = renderHook(() => useBookmarks());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const rootFolders = result.current.getSubfolders(null);
      expect(rootFolders).toHaveLength(1);
      expect(rootFolders[0].id).toBe("f1");
    });
  });

  describe("clearError", () => {
    it("clears error state", async () => {
      const error = { code: "23505", message: "Duplicate" };
      mockSupabaseQuery(null, error);

      const { result } = renderHook(() => useBookmarks());

      await act(async () => {
        await result.current.createFolder("Duplicate");
      });

      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("refresh", () => {
    it("reloads folders and bookmarks", async () => {
      const queryMock = mockSupabaseQuery(null);
      queryMock.order.mockImplementation(() => {
        const tableName = (supabase.from as any).mock.calls[
          (supabase.from as any).mock.calls.length - 1
        ][0];
        return Promise.resolve({
          data: tableName === "bookmark_folders" ? mockFolders : mockBookmarks,
          error: null,
        });
      });

      const { result } = renderHook(() => useBookmarks());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.folders).toHaveLength(2);
      expect(result.current.bookmarks).toHaveLength(2);
    });
  });
});
