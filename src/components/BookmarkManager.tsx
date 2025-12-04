import { useState } from "react";
import {
  Bookmark,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  FolderPlus,
} from "lucide-react";
import { useBookmarks, BookmarkFolder, Bookmark as BookmarkType } from "../hooks/useBookmarks";
import { useAuth } from "../contexts/AuthContext";

interface BookmarkManagerProps {
  onLoadBookmark: (bookmark: BookmarkType) => void;
  onClose: () => void;
}

export function BookmarkManager({ onLoadBookmark, onClose }: BookmarkManagerProps) {
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
    getBookmarksInFolder,
    getSubfolders,
  } = useBookmarks();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [newFolderParent, setNewFolderParent] = useState<string | null | undefined>(undefined);
  const [newFolderName, setNewFolderName] = useState("");

  if (isGuest || !user) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl p-6 max-w-md mx-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Bookmarks</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-600">Please sign in to use bookmarks.</p>
        </div>
      </div>
    );
  }

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const startEditing = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
  };

  const saveRename = async (id: string, isFolder: boolean) => {
    if (!editingName.trim()) return;

    const success = isFolder
      ? await renameFolder(id, editingName.trim())
      : await renameBookmark(id, editingName.trim());

    if (success) {
      cancelEditing();
    }
  };

  const handleCreateFolder = async (parentId: string | null) => {
    if (!newFolderName.trim()) return;

    const folder = await createFolder(newFolderName.trim(), parentId);
    if (folder) {
      setNewFolderParent(undefined);
      setNewFolderName("");
      if (parentId) {
        setExpandedFolders((prev) => new Set([...prev, parentId]));
      }
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (confirm("Delete this folder and all its contents?")) {
      await deleteFolder(folderId);
    }
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    if (confirm("Delete this bookmark?")) {
      await deleteBookmark(bookmarkId);
    }
  };

  const renderFolder = (folder: BookmarkFolder, depth: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const subfolders = getSubfolders(folder.id);
    const folderBookmarks = getBookmarksInFolder(folder.id);
    const isEditing = editingId === folder.id;

    return (
      <div key={folder.id} style={{ marginLeft: depth * 16 }}>
        <div className="flex items-center gap-1 py-1 px-2 hover:bg-gray-50 rounded group">
          <button onClick={() => toggleFolder(folder.id)} className="p-0.5">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </button>
          {isExpanded ? (
            <FolderOpen className="w-4 h-4 text-amber-500" />
          ) : (
            <Folder className="w-4 h-4 text-amber-500" />
          )}

          {isEditing ? (
            <div className="flex items-center gap-1 flex-1">
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveRename(folder.id, true);
                  if (e.key === "Escape") cancelEditing();
                }}
                className="flex-1 px-1 py-0.5 text-sm border rounded"
                autoFocus
              />
              <button onClick={() => saveRename(folder.id, true)} className="p-0.5 text-green-600 hover:bg-green-50 rounded">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={cancelEditing} className="p-0.5 text-gray-500 hover:bg-gray-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <span
                className="flex-1 text-sm cursor-pointer"
                onClick={() => toggleFolder(folder.id)}
              >
                {folder.name}
              </span>
              <div className="hidden group-hover:flex items-center gap-0.5">
                <button
                  onClick={() => setNewFolderParent(folder.id)}
                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                  title="New subfolder"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => startEditing(folder.id, folder.name)}
                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                  title="Rename"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteFolder(folder.id)}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>

        {isExpanded && (
          <div>
            {newFolderParent === folder.id && (
              <div className="flex items-center gap-1 py-1 px-2 ml-6">
                <Folder className="w-4 h-4 text-amber-300" />
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateFolder(folder.id);
                    if (e.key === "Escape") {
                      setNewFolderParent(undefined);
                      setNewFolderName("");
                    }
                  }}
                  placeholder="New folder name"
                  className="flex-1 px-1 py-0.5 text-sm border rounded"
                  autoFocus
                />
                <button onClick={() => handleCreateFolder(folder.id)} className="p-0.5 text-green-600 hover:bg-green-50 rounded">
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setNewFolderParent(undefined);
                    setNewFolderName("");
                  }}
                  className="p-0.5 text-gray-500 hover:bg-gray-100 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {subfolders.map((subfolder) => renderFolder(subfolder, depth + 1))}
            {folderBookmarks.map((bookmark) => renderBookmark(bookmark, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderBookmark = (bookmark: BookmarkType, depth: number = 0) => {
    const isEditing = editingId === bookmark.id;

    return (
      <div
        key={bookmark.id}
        className="flex items-center gap-1 py-1 px-2 hover:bg-blue-50 rounded group"
        style={{ marginLeft: depth * 16 + 20 }}
      >
        <Bookmark className="w-4 h-4 text-blue-500" />

        {isEditing ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveRename(bookmark.id, false);
                if (e.key === "Escape") cancelEditing();
              }}
              className="flex-1 px-1 py-0.5 text-sm border rounded"
              autoFocus
            />
            <button onClick={() => saveRename(bookmark.id, false)} className="p-0.5 text-green-600 hover:bg-green-50 rounded">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={cancelEditing} className="p-0.5 text-gray-500 hover:bg-gray-100 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <span
              className="flex-1 text-sm cursor-pointer hover:text-blue-600"
              onClick={() => onLoadBookmark(bookmark)}
              title={bookmark.source || undefined}
            >
              {bookmark.name}
            </span>
            <div className="hidden group-hover:flex items-center gap-0.5">
              <button
                onClick={() => startEditing(bookmark.id, bookmark.name)}
                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                title="Rename"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDeleteBookmark(bookmark.id)}
                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  const rootFolders = getSubfolders(null);
  const rootBookmarks = getBookmarksInFolder(null);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-blue-600" />
            Bookmarks
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-4 p-2 bg-red-50 text-red-700 text-sm rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={clearError} className="p-0.5 hover:bg-red-100 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center text-gray-500 py-8">Loading...</div>
          ) : rootFolders.length === 0 && rootBookmarks.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Bookmark className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No bookmarks yet</p>
              <p className="text-sm mt-1">Save passages from the Translation Panel</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {newFolderParent === null && (
                <div className="flex items-center gap-1 py-1 px-2">
                  <Folder className="w-4 h-4 text-amber-300" />
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateFolder(null);
                      if (e.key === "Escape") {
                        setNewFolderParent(undefined);
                        setNewFolderName("");
                      }
                    }}
                    placeholder="New folder name"
                    className="flex-1 px-1 py-0.5 text-sm border rounded"
                    autoFocus
                  />
                  <button onClick={() => handleCreateFolder(null)} className="p-0.5 text-green-600 hover:bg-green-50 rounded">
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setNewFolderParent(undefined);
                      setNewFolderName("");
                    }}
                    className="p-0.5 text-gray-500 hover:bg-gray-100 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {rootFolders.map((folder) => renderFolder(folder))}
              {rootBookmarks.map((bookmark) => renderBookmark(bookmark))}
            </div>
          )}
        </div>

        <div className="p-4 border-t">
          <button
            onClick={() => setNewFolderParent(null)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            New Folder
          </button>
        </div>
      </div>
    </div>
  );
}
