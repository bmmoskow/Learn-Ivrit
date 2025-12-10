import { Bookmark as BookmarkType } from "../../hooks/useBookmarks";
import { useBookmarkManager } from "./useBookmarkManager";
import { BookmarkManagerUI } from "./BookmarkManagerUI";

interface BookmarkManagerProps {
  onLoadBookmark: (bookmark: BookmarkType) => void;
  onClose: () => void;
}

export function BookmarkManager({ onLoadBookmark, onClose }: BookmarkManagerProps) {
  const hook = useBookmarkManager({ onLoadBookmark, onClose });

  return (
    <BookmarkManagerUI
      isGuest={hook.isGuest}
      isAuthenticated={!!hook.user}
      rootFolders={hook.rootFolders}
      rootBookmarks={hook.rootBookmarks}
      loading={hook.loading}
      error={hook.error}
      expandedFolders={hook.expandedFolders}
      editingId={hook.editingId}
      editingName={hook.editingName}
      newFolderParent={hook.newFolderParent}
      newFolderName={hook.newFolderName}
      onClose={hook.onClose}
      clearError={hook.clearError}
      toggleFolder={hook.toggleFolder}
      startEditing={hook.startEditing}
      cancelEditing={hook.cancelEditing}
      saveRename={hook.saveRename}
      handleCreateFolder={hook.handleCreateFolder}
      handleDeleteFolder={hook.handleDeleteFolder}
      handleDeleteBookmark={hook.handleDeleteBookmark}
      handleLoadBookmark={hook.handleLoadBookmark}
      setNewFolderParent={hook.setNewFolderParent}
      setNewFolderName={hook.setNewFolderName}
      setEditingName={hook.setEditingName}
      getSubfolders={hook.getSubfolders}
      getBookmarksInFolder={hook.getBookmarksInFolder}
    />
  );
}
