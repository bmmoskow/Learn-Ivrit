import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabase/client";
import { useAuth } from "../contexts/AuthContext/AuthContext";

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

export function useBookmarks() {
  const { user } = useAuth();
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFolders = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("bookmark_folders" as any)
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
      .from("bookmarks" as any)
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
      .from("bookmark_folders" as any)
      .insert({
        user_id: user.id,
        name,
        parent_folder_id: parentFolderId,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating folder:", error);
      if (error.code === "23505") {
        setError("A folder with this name already exists in this location");
      } else {
        setError("Failed to create folder");
      }
      return null;
    }

    const newFolder = data as unknown as BookmarkFolder;
    setFolders((prev) => [...prev, newFolder]);
    return newFolder;
  };

  const deleteFolder = async (folderId: string): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from("bookmark_folders" as any)
      .delete()
      .eq("id", folderId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting folder:", error);
      setError("Failed to delete folder");
      return false;
    }

    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    // Also remove bookmarks in this folder from local state
    setBookmarks((prev) => prev.filter((b) => b.folder_id !== folderId));
    return true;
  };

  const renameFolder = async (folderId: string, newName: string): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from("bookmark_folders" as any)
      .update({ name: newName })
      .eq("id", folderId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error renaming folder:", error);
      if (error.code === "23505") {
        setError("A folder with this name already exists in this location");
      } else {
        setError("Failed to rename folder");
      }
      return false;
    }

    setFolders((prev) => prev.map((f) => (f.id === folderId ? { ...f, name: newName } : f)));
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
      .from("bookmarks" as any)
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
      if (error.code === "23505") {
        setError("A bookmark with this name already exists in this location");
      } else {
        setError("Failed to create bookmark");
      }
      return null;
    }

    const newBookmark = data as unknown as Bookmark;
    setBookmarks((prev) => [...prev, newBookmark]);
    return newBookmark;
  };

  const deleteBookmark = async (bookmarkId: string): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from("bookmarks" as any)
      .delete()
      .eq("id", bookmarkId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting bookmark:", error);
      setError("Failed to delete bookmark");
      return false;
    }

    setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
    return true;
  };

  const renameBookmark = async (bookmarkId: string, newName: string): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from("bookmarks" as any)
      .update({ name: newName })
      .eq("id", bookmarkId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error renaming bookmark:", error);
      if (error.code === "23505") {
        setError("A bookmark with this name already exists in this location");
      } else {
        setError("Failed to rename bookmark");
      }
      return false;
    }

    setBookmarks((prev) => prev.map((b) => (b.id === bookmarkId ? { ...b, name: newName } : b)));
    return true;
  };

  const moveBookmark = async (bookmarkId: string, newFolderId: string | null): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from("bookmarks" as any)
      .update({ folder_id: newFolderId })
      .eq("id", bookmarkId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error moving bookmark:", error);
      setError("Failed to move bookmark");
      return false;
    }

    setBookmarks((prev) => prev.map((b) => (b.id === bookmarkId ? { ...b, folder_id: newFolderId } : b)));
    return true;
  };

  const getBookmarksInFolder = (folderId: string | null): Bookmark[] => {
    return bookmarks.filter((b) => b.folder_id === folderId);
  };

  const getSubfolders = (parentId: string | null): BookmarkFolder[] => {
    return folders.filter((f) => f.parent_folder_id === parentId);
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
