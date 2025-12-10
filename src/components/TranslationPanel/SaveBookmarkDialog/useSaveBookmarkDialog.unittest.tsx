import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ReactNode } from "react";
import { AuthProvider } from "../../../contexts/AuthContext/AuthContext";
import { useSaveBookmarkDialog } from "./useSaveBookmarkDialog";

// Mock the supabase client - must match exact import path used by useBookmarks
vi.mock("../../../../supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "new-bookmark-id", name: "Test Bookmark" },
            error: null,
          }),
        }),
      }),
    }),
  },
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe("useSaveBookmarkDialog", () => {
  const mockOnClose = vi.fn();
  const mockOnSaved = vi.fn();
  const defaultProps = {
    hebrewText: "שלום עולם",
    source: "Genesis 1:1",
    onClose: mockOnClose,
    onSaved: mockOnSaved,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("initializes with empty bookmark name", () => {
      const { result } = renderHook(() => useSaveBookmarkDialog(defaultProps), { wrapper });

      expect(result.current.bookmarkName).toBe("");
    });

    it("initializes with null selected folder", () => {
      const { result } = renderHook(() => useSaveBookmarkDialog(defaultProps), { wrapper });
      expect(result.current.selectedFolderId).toBeNull();
    });

    it("initializes with empty expanded folders set", () => {
      const { result } = renderHook(() => useSaveBookmarkDialog(defaultProps), { wrapper });
      expect(result.current.expandedFolders.size).toBe(0);
    });

    it("initializes with showNewFolder as false", () => {
      const { result } = renderHook(() => useSaveBookmarkDialog(defaultProps), { wrapper });
      expect(result.current.showNewFolder).toBe(false);
    });

    it("initializes with no error", () => {
      const { result } = renderHook(() => useSaveBookmarkDialog(defaultProps), { wrapper });
      expect(result.current.error).toBeNull();
    });

    it("initializes with saving as false", () => {
      const { result } = renderHook(() => useSaveBookmarkDialog(defaultProps), { wrapper });
      expect(result.current.saving).toBe(false);
    });
  });

  describe("setBookmarkName", () => {
    it("updates bookmark name", () => {
      const { result } = renderHook(() => useSaveBookmarkDialog(defaultProps), { wrapper });
      act(() => {
        result.current.setBookmarkName("My Bookmark");
      });

      expect(result.current.bookmarkName).toBe("My Bookmark");
    });
  });

  describe("setSelectedFolderId", () => {
    it("updates selected folder ID", () => {
      const { result } = renderHook(() => useSaveBookmarkDialog(defaultProps), { wrapper });
      act(() => {
        result.current.setSelectedFolderId("folder-123");
      });

      expect(result.current.selectedFolderId).toBe("folder-123");
    });

    it("can set folder ID back to null", () => {
      const { result } = renderHook(() => useSaveBookmarkDialog(defaultProps), { wrapper });
      act(() => {
        result.current.setSelectedFolderId("folder-123");
      });

      act(() => {
        result.current.setSelectedFolderId(null);
      });

      expect(result.current.selectedFolderId).toBeNull();
    });
  });

  describe("toggleFolder", () => {
    it("adds folder to expanded set", () => {
      const { result } = renderHook(() => useSaveBookmarkDialog(defaultProps), { wrapper });
      act(() => {
        result.current.toggleFolder("folder-1");
      });

      expect(result.current.isExpanded("folder-1")).toBe(true);
    });

    it("removes folder from expanded set when toggled again", () => {
      const { result } = renderHook(() => useSaveBookmarkDialog(defaultProps), { wrapper });
      act(() => {
        result.current.toggleFolder("folder-1");
      });

      act(() => {
        result.current.toggleFolder("folder-1");
      });

      expect(result.current.isExpanded("folder-1")).toBe(false);
    });
  });

  describe("setShowNewFolder", () => {
    it("shows new folder input", () => {
      const { result } = renderHook(() => useSaveBookmarkDialog(defaultProps), { wrapper });
      act(() => {
        result.current.setShowNewFolder(true);
      });

      expect(result.current.showNewFolder).toBe(true);
    });
  });

  describe("cancelNewFolder", () => {
    it("hides new folder input and clears name", () => {
      const { result } = renderHook(() => useSaveBookmarkDialog(defaultProps), { wrapper });
      act(() => {
        result.current.setShowNewFolder(true);
        result.current.setNewFolderName("New Folder");
      });

      expect(result.current.showNewFolder).toBe(true);
      expect(result.current.newFolderName).toBe("New Folder");

      act(() => {
        result.current.cancelNewFolder();
      });

      expect(result.current.showNewFolder).toBe(false);
      expect(result.current.newFolderName).toBe("");
    });
  });

  describe("handleSave", () => {
    it("sets error when bookmark name is empty", async () => {
      const { result } = renderHook(() => useSaveBookmarkDialog(defaultProps), { wrapper });

      await act(async () => {
        await result.current.handleSave();
      });

      expect(result.current.error).toBe("Please enter a name for the bookmark");
      expect(mockOnSaved).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("sets error when bookmark name is whitespace only", async () => {
      const { result } = renderHook(() => useSaveBookmarkDialog(defaultProps), { wrapper });

      act(() => {
        result.current.setBookmarkName("   ");
      });

      await act(async () => {
        await result.current.handleSave();
      });

      expect(result.current.error).toBe("Please enter a name for the bookmark");
    });
  });
});
