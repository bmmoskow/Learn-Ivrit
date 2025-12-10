/**
 * Pure utility functions for BookmarkManager.
 *
 * IMPORTANT: This file is separate from useBookmarkManager.ts to avoid import side effects.
 * useBookmarkManager.ts imports supabase/client which initializes at import time and requires
 * VITE_SUPABASE_URL. Keeping pure functions here allows unit testing without mocking Supabase.
 */

import { BookmarkFolder, Bookmark } from "../../../hooks/useBookmarks/bookmarksUtils";

/**
 * Toggle a folder's expanded state in the set
 */
export const toggleFolderExpanded = (
  expandedFolders: Set<string>,
  folderId: string
): Set<string> => {
  const next = new Set(expandedFolders);
  if (next.has(folderId)) {
    next.delete(folderId);
  } else {
    next.add(folderId);
  }
  return next;
};

/**
 * Get bookmarks that belong to a specific folder
 */
export const getBookmarksInFolder = (
  bookmarks: Bookmark[],
  folderId: string | null
): Bookmark[] => {
  return bookmarks.filter((b) => b.folder_id === folderId);
};

/**
 * Get subfolders of a parent folder
 */
export const getSubfolders = (
  folders: BookmarkFolder[],
  parentId: string | null
): BookmarkFolder[] => {
  return folders.filter((f) => f.parent_folder_id === parentId);
};

/**
 * Check if a folder has any contents (subfolders or bookmarks)
 */
export const folderHasContents = (
  folders: BookmarkFolder[],
  bookmarks: Bookmark[],
  folderId: string
): boolean => {
  const hasSubfolders = folders.some((f) => f.parent_folder_id === folderId);
  const hasBookmarks = bookmarks.some((b) => b.folder_id === folderId);
  return hasSubfolders || hasBookmarks;
};

/**
 * Count total items in a folder (recursive)
 */
export const countFolderContents = (
  folders: BookmarkFolder[],
  bookmarks: Bookmark[],
  folderId: string
): { folders: number; bookmarks: number } => {
  const directBookmarks = bookmarks.filter((b) => b.folder_id === folderId).length;
  const subfolders = folders.filter((f) => f.parent_folder_id === folderId);

  let totalFolders = subfolders.length;
  let totalBookmarks = directBookmarks;

  for (const subfolder of subfolders) {
    const subCounts = countFolderContents(folders, bookmarks, subfolder.id);
    totalFolders += subCounts.folders;
    totalBookmarks += subCounts.bookmarks;
  }

  return { folders: totalFolders, bookmarks: totalBookmarks };
};

/**
 * Validate folder name (non-empty, trimmed)
 */
export const isValidFolderName = (name: string): boolean => {
  return name.trim().length > 0;
};

/**
 * Validate bookmark name (non-empty, trimmed)
 */
export const isValidBookmarkName = (name: string): boolean => {
  return name.trim().length > 0;
};
