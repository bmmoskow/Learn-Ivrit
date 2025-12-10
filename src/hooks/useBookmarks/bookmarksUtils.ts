/**
 * Pure utility functions for useBookmarks hook.
 *
 * IMPORTANT: This file is separate from useBookmarks.ts to avoid import side effects.
 * Keeping pure functions here allows unit testing without mocking external dependencies.
 */

export interface BookmarkFolder {
  id: string;
  user_id: string;
  name: string;
  parent_folder_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  folder_id: string | null;
  name: string;
  hebrew_text: string;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export type ErrorCode = "23505" | string;

export function getErrorMessage(errorCode: ErrorCode | undefined, operation: "folder" | "bookmark"): string {
  if (errorCode === "23505") {
    return `A ${operation} with this name already exists in this location`;
  }
  return `Failed to process ${operation}`;
}

export function filterBookmarksByFolder(bookmarks: Bookmark[], folderId: string | null): Bookmark[] {
  return bookmarks.filter((b) => b.folder_id === folderId);
}

export function filterSubfolders(folders: BookmarkFolder[], parentId: string | null): BookmarkFolder[] {
  return folders.filter((f) => f.parent_folder_id === parentId);
}

export function removeFolder(folders: BookmarkFolder[], folderId: string): BookmarkFolder[] {
  return folders.filter((f) => f.id !== folderId);
}

export function removeBookmark(bookmarks: Bookmark[], bookmarkId: string): Bookmark[] {
  return bookmarks.filter((b) => b.id !== bookmarkId);
}

export function removeBookmarksInFolder(bookmarks: Bookmark[], folderId: string): Bookmark[] {
  return bookmarks.filter((b) => b.folder_id !== folderId);
}

export function updateFolderName(folders: BookmarkFolder[], folderId: string, newName: string): BookmarkFolder[] {
  return folders.map((f) => (f.id === folderId ? { ...f, name: newName } : f));
}

export function updateBookmarkName(bookmarks: Bookmark[], bookmarkId: string, newName: string): Bookmark[] {
  return bookmarks.map((b) => (b.id === bookmarkId ? { ...b, name: newName } : b));
}

export function updateBookmarkFolder(bookmarks: Bookmark[], bookmarkId: string, newFolderId: string | null): Bookmark[] {
  return bookmarks.map((b) => (b.id === bookmarkId ? { ...b, folder_id: newFolderId } : b));
}
