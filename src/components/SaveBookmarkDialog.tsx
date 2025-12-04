import { useState } from "react";
import { Bookmark, Folder, FolderPlus, X, Check, ChevronRight, ChevronDown } from "lucide-react";
import { useBookmarks, BookmarkFolder } from "../hooks/useBookmarks";
import { supabase } from "../../supabase/client";

interface SaveBookmarkDialogProps {
  hebrewText: string;
  source: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export function SaveBookmarkDialog({ hebrewText, source, onClose, onSaved }: SaveBookmarkDialogProps) {
  const { folders, createFolder, createBookmark, getSubfolders } = useBookmarks();

  const [bookmarkName, setBookmarkName] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSave = async () => {
    if (!bookmarkName.trim()) {
      setError("Please enter a name for the bookmark");
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
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    const folder = await createFolder(newFolderName.trim(), null);
    if (folder) {
      setSelectedFolderId(folder.id);
      setShowNewFolder(false);
      setNewFolderName("");
    }
  };

  const renderFolderOption = (folder: BookmarkFolder, depth: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const subfolders = getSubfolders(folder.id);
    const isSelected = selectedFolderId === folder.id;

    return (
      <div key={folder.id}>
        <div
          className={`flex items-center gap-2 py-1.5 px-2 cursor-pointer rounded ${
            isSelected ? "bg-blue-100 text-blue-700" : "hover:bg-gray-50"
          }`}
          style={{ paddingLeft: depth * 16 + 8 }}
          onClick={() => setSelectedFolderId(folder.id)}
        >
          {subfolders.length > 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
              className="p-0.5"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}
          <Folder className={`w-4 h-4 ${isSelected ? "text-blue-600" : "text-amber-500"}`} />
          <span className="text-sm flex-1">{folder.name}</span>
          {isSelected && <Check className="w-4 h-4 text-blue-600" />}
        </div>
        {isExpanded && subfolders.map((subfolder) => renderFolderOption(subfolder, depth + 1))}
      </div>
    );
  };

  const rootFolders = getSubfolders(null);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-blue-600" />
            Save Bookmark
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="p-2 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bookmark Name
            </label>
            <input
              type="text"
              value={bookmarkName}
              onChange={(e) => setBookmarkName(e.target.value)}
              placeholder="Enter a name for this bookmark"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {source && (
            <div className="text-sm text-gray-500">
              <span className="font-medium">Source:</span> {source}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Save to Folder (optional)
              </label>
              <button
                onClick={() => setShowNewFolder(true)}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <FolderPlus className="w-4 h-4" />
                New Folder
              </button>
            </div>

            {showNewFolder && (
              <div className="mb-2 flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateFolder();
                    if (e.key === "Escape") {
                      setShowNewFolder(false);
                      setNewFolderName("");
                    }
                  }}
                  placeholder="Folder name"
                  className="flex-1 px-2 py-1 text-sm border rounded"
                  autoFocus
                />
                <button
                  onClick={handleCreateFolder}
                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setShowNewFolder(false);
                    setNewFolderName("");
                  }}
                  className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="border rounded-lg max-h-48 overflow-y-auto">
              <div
                className={`flex items-center gap-2 py-1.5 px-2 cursor-pointer rounded ${
                  selectedFolderId === null ? "bg-blue-100 text-blue-700" : "hover:bg-gray-50"
                }`}
                onClick={() => setSelectedFolderId(null)}
              >
                <span className="w-5" />
                <Bookmark className={`w-4 h-4 ${selectedFolderId === null ? "text-blue-600" : "text-gray-400"}`} />
                <span className="text-sm flex-1">No folder (root level)</span>
                {selectedFolderId === null && <Check className="w-4 h-4 text-blue-600" />}
              </div>
              {rootFolders.map((folder) => renderFolderOption(folder))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !bookmarkName.trim()}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? "Saving..." : "Save Bookmark"}
          </button>
        </div>
      </div>
    </div>
  );
}
