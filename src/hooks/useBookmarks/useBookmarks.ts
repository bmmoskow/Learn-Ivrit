import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../supabase/client";
import { useAuth } from "../../contexts/AuthContext/AuthContext";
import {
  type BookmarkFolder,
  type Bookmark,
  getErrorMessage,
  filterBookmarksByFolder,
  filterSubfolders,
  removeFolder,
  removeBookmark,
  removeBookmarksInFolder,
  updateFolderName,
  updateBookmarkName,
  updateBookmarkFolder,
} from "./bookmarksUtils";

export type { BookmarkFolder, Bookmark };

export interface UseBookmarksReturn {
  folders: BookmarkFolder[];
  bookmarks: Bookmark[];
  loading: boolean;
  error: string | null;
  clearError: () => void;
  refresh: () => Promise<void>;
  createFolder: (name: string, parentFolderId?: string | null) => Promise<BookmarkFolder | null>;
  deleteFolder: (folderId: string) => Promise<boolean>;
  renameFolder: (folderId: string, newName: string) => Promise<boolean>;
  createBookmark: (
    name: string,
    hebrewText: string,
    source: string | null,
    folderId?: string | null
  ) => Promise<Bookmark | null>;
  deleteBookmark: (bookmarkId: string) => Promise<boolean>;
  renameBookmark: (bookmarkId: string, newName: string) => Promise<boolean>;
  moveBookmark: (bookmarkId: string, newFolderId: string | null) => Promise<boolean>;
  getBookmarksInFolder: (folderId: string | null) => Bookmark[];
  getSubfolders: (parentId: string | null) => BookmarkFolder[];
}

export function useBookmarks(): UseBookmarksReturn {
  const { user } = useAuth();
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFolders = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("bookmark_folders")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    if (error) {
      console.error("Error fetching folders:", error);
      setError("Failed to load folders");
    } else {
      setFolders((data as unknown as BookmarkFolder[]) || []);
    }
  }, [user]);

  const fetchBookmarks = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    if (error) {
      console.error("Error fetching bookmarks:", error);
      setError("Failed to load bookmarks");
    } else {
      setBookmarks((data as unknown as Bookmark[]) || []);
    }
  }, [user]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchFolders(), fetchBookmarks()]);
    setLoading(false);
  }, [fetchFolders, fetchBookmarks]);

  useEffect(() => {
    if (user) {
      refresh();
    } else {
      setFolders([]);
      setBookmarks([]);
    }
  }, [user, refresh]);

  const createFolder = async (name: string, parentFolderId: string | null = null): Promise<BookmarkFolder | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("bookmark_folders")
      .insert({
        user_id: user.id,
        name,
        parent_folder_id: parentFolderId,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating folder:", error);
      setError(getErrorMessage(error.code, "folder"));
      return null;
    }

    const newFolder = data as unknown as BookmarkFolder;
    setFolders((prev) => [...prev, newFolder]);
    return newFolder;
  };

  const deleteFolder = async (folderId: string): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from("bookmark_folders")
      .delete()
      .eq("id", folderId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting folder:", error);
      setError("Failed to delete folder");
      return false;
    }

    setFolders((prev) => removeFolder(prev, folderId));
    setBookmarks((prev) => removeBookmarksInFolder(prev, folderId));
    return true;
  };

  const renameFolder = async (folderId: string, newName: string): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from("bookmark_folders")
      .update({ name: newName })
      .eq("id", folderId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error renaming folder:", error);
      setError(getErrorMessage(error.code, "folder"));
      return false;
    }

    setFolders((prev) => updateFolderName(prev, folderId, newName));
    return true;
  };

  const createBookmark = async (
    name: string,
    hebrewText: string,
    source: string | null,
    folderId: string | null = null
  ): Promise<Bookmark | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("bookmarks")
      .insert({
        user_id: user.id,
        folder_id: folderId,
        name,
        hebrew_text: hebrewText,
        source,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating bookmark:", error);
      setError(getErrorMessage(error.code, "bookmark"));
      return null;
    }

    const newBookmark = data as unknown as Bookmark;
    setBookmarks((prev) => [...prev, newBookmark]);
    return newBookmark;
  };

  const deleteBookmark = async (bookmarkId: string): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("id", bookmarkId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting bookmark:", error);
      setError("Failed to delete bookmark");
      return false;
    }

    setBookmarks((prev) => removeBookmark(prev, bookmarkId));
    return true;
  };

  const renameBookmark = async (bookmarkId: string, newName: string): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from("bookmarks")
      .update({ name: newName })
      .eq("id", bookmarkId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error renaming bookmark:", error);
      setError(getErrorMessage(error.code, "bookmark"));
      return false;
    }

    setBookmarks((prev) => updateBookmarkName(prev, bookmarkId, newName));
    return true;
  };

  const moveBookmark = async (bookmarkId: string, newFolderId: string | null): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from("bookmarks")
      .update({ folder_id: newFolderId })
      .eq("id", bookmarkId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error moving bookmark:", error);
      setError("Failed to move bookmark");
      return false;
    }

    setBookmarks((prev) => updateBookmarkFolder(prev, bookmarkId, newFolderId));
    return true;
  };

  const getBookmarksInFolder = (folderId: string | null): Bookmark[] => {
    return filterBookmarksByFolder(bookmarks, folderId);
  };

  const getSubfolders = (parentId: string | null): BookmarkFolder[] => {
    return filterSubfolders(folders, parentId);
  };

  const clearError = () => setError(null);

  return {
    folders,
    bookmarks,
    loading,
    error,
    clearError,
    refresh,
    createFolder,
    deleteFolder,
    renameFolder,
    createBookmark,
    deleteBookmark,
    renameBookmark,
    moveBookmark,
    getBookmarksInFolder,
    getSubfolders,
  };
}
