import { useState, useCallback } from "react";
import { useBookmarks, BookmarkFolder, Bookmark } from "../../../hooks/useBookmarks";
import { useAuth } from "../../../contexts/AuthContext/AuthContext";
import {
  toggleFolderExpanded,
  getBookmarksInFolder as utilGetBookmarksInFolder,
  getSubfolders as utilGetSubfolders,
  isValidFolderName,
  isValidBookmarkName,
} from "./bookmarkManagerUtils";

export interface UseBookmarkManagerProps {
  onLoadBookmark: (bookmark: Bookmark) => void;
  onClose: () => void;
}

export interface UseBookmarkManagerReturn {
  // Auth state
  user: ReturnType<typeof useAuth>["user"];
  isGuest: boolean;

  // Data
  folders: BookmarkFolder[];
  bookmarks: Bookmark[];
  loading: boolean;
  error: string | null;

  // UI state
  expandedFolders: Set<string>;
  editingId: string | null;
  editingName: string;
  newFolderParent: string | null | undefined;
  newFolderName: string;

  // Computed
  rootFolders: BookmarkFolder[];
  rootBookmarks: Bookmark[];

  // Actions
  clearError: () => void;
  toggleFolder: (folderId: string) => void;
  startEditing: (id: string, currentName: string) => void;
  cancelEditing: () => void;
  saveRename: (id: string, isFolder: boolean) => Promise<void>;
  handleCreateFolder: (parentId: string | null) => Promise<void>;
  handleDeleteFolder: (folderId: string) => Promise<void>;
  handleDeleteBookmark: (bookmarkId: string) => Promise<void>;
  handleLoadBookmark: (bookmark: Bookmark) => void;
  setNewFolderParent: (parentId: string | null | undefined) => void;
  setNewFolderName: (name: string) => void;
  setEditingName: (name: string) => void;
  getSubfolders: (parentId: string | null) => BookmarkFolder[];
  getBookmarksInFolder: (folderId: string | null) => Bookmark[];
  onClose: () => void;
}

export function useBookmarkManager({
  onLoadBookmark,
  onClose,
}: UseBookmarkManagerProps): UseBookmarkManagerReturn {
  const { user, isGuest } = useAuth();
  const {
    folders,
    bookmarks,
    loading,
    error,
    clearError,
    createFolder,
    deleteFolder,
    renameFolder,
    deleteBookmark,
    renameBookmark,
  } = useBookmarks();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [newFolderParent, setNewFolderParent] = useState<string | null | undefined>(undefined);
  const [newFolderName, setNewFolderName] = useState("");

  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders((prev) => toggleFolderExpanded(prev, folderId));
  }, []);

  const startEditing = useCallback((id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
    setEditingName("");
  }, []);

  const saveRename = useCallback(
    async (id: string, isFolder: boolean) => {
      if (!isValidBookmarkName(editingName)) return;

      const success = isFolder
        ? await renameFolder(id, editingName.trim())
        : await renameBookmark(id, editingName.trim());

      if (success) {
        cancelEditing();
      }
    },
    [editingName, renameFolder, renameBookmark, cancelEditing]
  );

  const handleCreateFolder = useCallback(
    async (parentId: string | null) => {
      if (!isValidFolderName(newFolderName)) return;

      const folder = await createFolder(newFolderName.trim(), parentId);
      if (folder) {
        setNewFolderParent(undefined);
        setNewFolderName("");
        if (parentId) {
          setExpandedFolders((prev) => new Set([...prev, parentId]));
        }
      }
    },
    [newFolderName, createFolder]
  );

  const handleDeleteFolder = useCallback(
    async (folderId: string) => {
      if (confirm("Delete this folder and all its contents?")) {
        await deleteFolder(folderId);
      }
    },
    [deleteFolder]
  );

  const handleDeleteBookmark = useCallback(
    async (bookmarkId: string) => {
      if (confirm("Delete this bookmark?")) {
        await deleteBookmark(bookmarkId);
      }
    },
    [deleteBookmark]
  );

  const handleLoadBookmark = useCallback(
    (bookmark: Bookmark) => {
      onLoadBookmark(bookmark);
    },
    [onLoadBookmark]
  );

  const getSubfolders = useCallback(
    (parentId: string | null) => utilGetSubfolders(folders, parentId),
    [folders]
  );

  const getBookmarksInFolder = useCallback(
    (folderId: string | null) => utilGetBookmarksInFolder(bookmarks, folderId),
    [bookmarks]
  );

  const rootFolders = getSubfolders(null);
  const rootBookmarks = getBookmarksInFolder(null);

  return {
    user,
    isGuest,
    folders,
    bookmarks,
    loading,
    error,
    expandedFolders,
    editingId,
    editingName,
    newFolderParent,
    newFolderName,
    rootFolders,
    rootBookmarks,
    clearError,
    toggleFolder,
    startEditing,
    cancelEditing,
    saveRename,
    handleCreateFolder,
    handleDeleteFolder,
    handleDeleteBookmark,
    handleLoadBookmark,
    setNewFolderParent,
    setNewFolderName,
    setEditingName,
    getSubfolders,
    getBookmarksInFolder,
    onClose,
  };
}
