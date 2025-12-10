/**
 * Pure utility functions for SaveBookmarkDialog.
 *
 * IMPORTANT: This file is separate from useSaveBookmarkDialog.ts to avoid import side effects.
 * useSaveBookmarkDialog.ts imports useBookmarks which initializes supabase/client at import time.
 * Keeping pure functions here allows unit testing without mocking Supabase.
 */

/**
 * Validates bookmark name
 */
export const validateBookmarkName = (name: string): { valid: boolean; error: string | null } => {
  const trimmed = name.trim();
  if (!trimmed) {
    return { valid: false, error: "Please enter a name for the bookmark" };
  }
  if (trimmed.length > 200) {
    return { valid: false, error: "Bookmark name must be 200 characters or less" };
  }
  return { valid: true, error: null };
};

/**
 * Validates folder name
 */
export const validateFolderName = (name: string): { valid: boolean; error: string | null } => {
  const trimmed = name.trim();
  if (!trimmed) {
    return { valid: false, error: "Please enter a folder name" };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: "Folder name must be 100 characters or less" };
  }
  return { valid: true, error: null };
};

/**
 * Toggle a folder ID in a set of expanded folders
 */
export const toggleFolderInSet = (expandedFolders: Set<string>, folderId: string): Set<string> => {
  const next = new Set(expandedFolders);
  if (next.has(folderId)) {
    next.delete(folderId);
  } else {
    next.add(folderId);
  }
  return next;
};

/**
 * Truncate source string for display
 */
export const truncateSource = (source: string, maxLength: number = 50): string => {
  if (source.length <= maxLength) {
    return source;
  }
  return source.substring(0, maxLength - 3) + "...";
};
