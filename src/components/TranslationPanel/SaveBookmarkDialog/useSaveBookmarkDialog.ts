import { useState, useCallback } from "react";
import { useBookmarks, BookmarkFolder, Bookmark } from "../../../hooks/useBookmarks/useBookmarks";
import { validateBookmarkName, validateFolderName, toggleFolderInSet } from "./saveBookmarkDialogUtils";

export interface UseSaveBookmarkDialogProps {
  hebrewText: string;
  source: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export interface UseSaveBookmarkDialogReturn {
  // State
  bookmarkName: string;
  selectedFolderId: string | null;
  expandedFolders: Set<string>;
  showNewFolder: boolean;
  newFolderName: string;
  saving: boolean;
  error: string | null;
  rootFolders: BookmarkFolder[];

  // Setters
  setBookmarkName: (name: string) => void;
  setSelectedFolderId: (id: string | null) => void;
  setNewFolderName: (name: string) => void;
  setShowNewFolder: (show: boolean) => void;

  // Actions
  toggleFolder: (folderId: string) => void;
  handleSave: () => Promise<void>;
  handleCreateFolder: () => Promise<void>;
  cancelNewFolder: () => void;
  getSubfolders: (parentId: string | null) => BookmarkFolder[];
  isExpanded: (folderId: string) => boolean;
}

export function useSaveBookmarkDialog({
  hebrewText,
  source,
  onClose,
  onSaved,
}: UseSaveBookmarkDialogProps): UseSaveBookmarkDialogReturn {
  const { folders, createFolder, createBookmark, getSubfolders } = useBookmarks();

  const [bookmarkName, setBookmarkName] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rootFolders = getSubfolders(null);

  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders((prev) => toggleFolderInSet(prev, folderId));
  }, []);

  const isExpanded = useCallback((folderId: string) => {
    return expandedFolders.has(folderId);
  }, [expandedFolders]);

  const handleSave = useCallback(async () => {
    const validation = validateBookmarkName(bookmarkName);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setSaving(true);
    setError(null);

    const bookmark = await createBookmark(
      bookmarkName.trim(),
      hebrewText,
      source,
      selectedFolderId
    );

    if (bookmark) {
      onSaved();
      onClose();
    } else {
      setError("Failed to save bookmark");
    }

    setSaving(false);
  }, [bookmarkName, hebrewText, source, selectedFolderId, createBookmark, onSaved, onClose]);

  const handleCreateFolder = useCallback(async () => {
    const validation = validateFolderName(newFolderName);
    if (!validation.valid) {
      return;
    }

    const folder = await createFolder(newFolderName.trim(), null);
    if (folder) {
      setSelectedFolderId(folder.id);
      setShowNewFolder(false);
      setNewFolderName("");
    }
  }, [newFolderName, createFolder]);

  const cancelNewFolder = useCallback(() => {
    setShowNewFolder(false);
    setNewFolderName("");
  }, []);

  return {
    // State
    bookmarkName,
    selectedFolderId,
    expandedFolders,
    showNewFolder,
    newFolderName,
    saving,
    error,
    rootFolders,

    // Setters
    setBookmarkName,
    setSelectedFolderId,
    setNewFolderName,
    setShowNewFolder,

    // Actions
    toggleFolder,
    handleSave,
    handleCreateFolder,
    cancelNewFolder,
    getSubfolders,
    isExpanded,
  };
}
