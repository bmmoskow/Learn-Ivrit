import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { useBookmarkManager } from './useBookmarkManager';
import { AuthProvider } from '../../../contexts/AuthContext/AuthContext';

// Mock the Supabase client
vi.mock('../../../../supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
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
          single: vi.fn().mockResolvedValue({ data: { id: 'new-folder-id', name: 'New Folder' }, error: null }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
}));

// Import the mocked supabase after mocking
import { supabase } from '../../../../supabase/client';

// Wrapper to provide AuthContext
const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

const mockOnLoadBookmark = vi.fn();
const mockOnClose = vi.fn();

describe('useBookmarkManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });
    (supabase.auth.onAuthStateChange as any).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  describe('initial state', () => {
    it('has correct initial values', () => {
      const { result } = renderHook(
        () => useBookmarkManager({ onLoadBookmark: mockOnLoadBookmark, onClose: mockOnClose }),
        { wrapper }
      );

      expect(result.current.folders).toEqual([]);
      expect(result.current.bookmarks).toEqual([]);
      // Note: loading state is not tested as it resolves quickly due to mocks
      expect(result.current.error).toBeNull();
      expect(result.current.expandedFolders.size).toBe(0);
      expect(result.current.editingId).toBeNull();
      expect(result.current.editingName).toBe('');
      expect(result.current.newFolderParent).toBeUndefined();
      expect(result.current.newFolderName).toBe('');
    });

    it('exposes rootFolders and rootBookmarks as empty arrays initially', () => {
      const { result } = renderHook(
        () => useBookmarkManager({ onLoadBookmark: mockOnLoadBookmark, onClose: mockOnClose }),
        { wrapper }
      );

      expect(result.current.rootFolders).toEqual([]);
      expect(result.current.rootBookmarks).toEqual([]);
    });
  });

  describe('toggleFolder', () => {
    it('adds folder id to expandedFolders when not present', () => {
      const { result } = renderHook(
        () => useBookmarkManager({ onLoadBookmark: mockOnLoadBookmark, onClose: mockOnClose }),
        { wrapper }
      );

      act(() => {
        result.current.toggleFolder('folder-1');
      });

      expect(result.current.expandedFolders.has('folder-1')).toBe(true);
    });

    it('removes folder id from expandedFolders when present', () => {
      const { result } = renderHook(
        () => useBookmarkManager({ onLoadBookmark: mockOnLoadBookmark, onClose: mockOnClose }),
        { wrapper }
      );

      act(() => {
        result.current.toggleFolder('folder-1');
      });

      act(() => {
        result.current.toggleFolder('folder-1');
      });

      expect(result.current.expandedFolders.has('folder-1')).toBe(false);
    });
  });

  describe('startEditing and cancelEditing', () => {
    it('startEditing sets editingId and editingName', () => {
      const { result } = renderHook(
        () => useBookmarkManager({ onLoadBookmark: mockOnLoadBookmark, onClose: mockOnClose }),
        { wrapper }
      );

      act(() => {
        result.current.startEditing('item-1', 'Current Name');
      });

      expect(result.current.editingId).toBe('item-1');
      expect(result.current.editingName).toBe('Current Name');
    });

    it('cancelEditing clears editingId and editingName', () => {
      const { result } = renderHook(
        () => useBookmarkManager({ onLoadBookmark: mockOnLoadBookmark, onClose: mockOnClose }),
        { wrapper }
      );

      act(() => {
        result.current.startEditing('item-1', 'Current Name');
      });

      act(() => {
        result.current.cancelEditing();
      });

      expect(result.current.editingId).toBeNull();
      expect(result.current.editingName).toBe('');
    });
  });

  describe('setters', () => {
    it('setNewFolderParent updates newFolderParent', () => {
      const { result } = renderHook(
        () => useBookmarkManager({ onLoadBookmark: mockOnLoadBookmark, onClose: mockOnClose }),
        { wrapper }
      );

      act(() => {
        result.current.setNewFolderParent('parent-id');
      });

      expect(result.current.newFolderParent).toBe('parent-id');
    });

    it('setNewFolderName updates newFolderName', () => {
      const { result } = renderHook(
        () => useBookmarkManager({ onLoadBookmark: mockOnLoadBookmark, onClose: mockOnClose }),
        { wrapper }
      );

      act(() => {
        result.current.setNewFolderName('My New Folder');
      });

      expect(result.current.newFolderName).toBe('My New Folder');
    });

    it('setEditingName updates editingName', () => {
      const { result } = renderHook(
        () => useBookmarkManager({ onLoadBookmark: mockOnLoadBookmark, onClose: mockOnClose }),
        { wrapper }
      );

      act(() => {
        result.current.setEditingName('Updated Name');
      });

      expect(result.current.editingName).toBe('Updated Name');
    });
  });

  describe('handleLoadBookmark', () => {
    it('calls onLoadBookmark with the bookmark', () => {
      const { result } = renderHook(
        () => useBookmarkManager({ onLoadBookmark: mockOnLoadBookmark, onClose: mockOnClose }),
        { wrapper }
      );

      const bookmark = {
        id: 'bookmark-1',
        user_id: 'user-1',
        name: 'Test Bookmark',
        hebrew_text: 'שלום',
        source: 'Genesis 1:1',
        folder_id: null,
        created_at: null,
        updated_at: null,
      };

      act(() => {
        result.current.handleLoadBookmark(bookmark);
      });

      expect(mockOnLoadBookmark).toHaveBeenCalledWith(bookmark);
    });
  });

  describe('onClose', () => {
    it('exposes the onClose callback', () => {
      const { result } = renderHook(
        () => useBookmarkManager({ onLoadBookmark: mockOnLoadBookmark, onClose: mockOnClose }),
        { wrapper }
      );

      act(() => {
        result.current.onClose();
      });

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('getSubfolders', () => {
    it('returns empty array when no folders exist', () => {
      const { result } = renderHook(
        () => useBookmarkManager({ onLoadBookmark: mockOnLoadBookmark, onClose: mockOnClose }),
        { wrapper }
      );

      expect(result.current.getSubfolders(null)).toEqual([]);
      expect(result.current.getSubfolders('some-parent')).toEqual([]);
    });
  });

  describe('getBookmarksInFolder', () => {
    it('returns empty array when no bookmarks exist', () => {
      const { result } = renderHook(
        () => useBookmarkManager({ onLoadBookmark: mockOnLoadBookmark, onClose: mockOnClose }),
        { wrapper }
      );

      expect(result.current.getBookmarksInFolder(null)).toEqual([]);
      expect(result.current.getBookmarksInFolder('some-folder')).toEqual([]);
    });
  });

  describe('isGuest', () => {
    it('returns false when not in guest mode', () => {
      const { result } = renderHook(
        () => useBookmarkManager({ onLoadBookmark: mockOnLoadBookmark, onClose: mockOnClose }),
        { wrapper }
      );

      expect(result.current.isGuest).toBe(false);
    });

    // Note: Guest mode test removed - testing isGuest=true requires reliable localStorage
    // mocking which is flaky in JSDOM/CI environments. The guest mode behavior is tested
    // in AuthContext.unittest.tsx instead.
  });

  describe('user', () => {
    it('is null when no session', () => {
      const { result } = renderHook(
        () => useBookmarkManager({ onLoadBookmark: mockOnLoadBookmark, onClose: mockOnClose }),
        { wrapper }
      );

      expect(result.current.user).toBeNull();
    });
  });

  describe('empty state handling', () => {
    it('does not show error when no bookmarks or folders exist', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: {
          session: {
            user: { id: 'test-user-id', email: 'test@example.com' },
            access_token: 'test-token',
          },
        },
      });

      const { result } = renderHook(
        () => useBookmarkManager({ onLoadBookmark: mockOnLoadBookmark, onClose: mockOnClose }),
        { wrapper }
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(result.current.error).toBeNull();
      expect(result.current.folders).toEqual([]);
      expect(result.current.bookmarks).toEqual([]);
      expect(result.current.rootFolders).toEqual([]);
      expect(result.current.rootBookmarks).toEqual([]);
    });
  });
});
